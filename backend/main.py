import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Environment variables must be loaded before database.py creates the engine.
load_dotenv()

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.auth import decode_token, get_current_user
from app.database import Base, SessionLocal, engine
from app.models import (
    LiveCollaborationParticipant,
    LiveCollaborationSession,
    User,
)
from app.routes import (
    audio,
    auth,
    images,
    live_collaboration,
    movie,
    projects,
    storyboard,
    video,
)
from app.schema_migrations import ensure_live_collaboration_schema
from generation_queue import (
    create_generation_batch,
    enqueue_generation_batch,
    get_generation_batch,
    request_cancel_generation_batch,
    retry_failed_generation_batch,
)
from live_collaboration_manager import live_collaboration_manager
from redis_client import redis_client
from redis_events import redis_event_listener
from websocket_manager import websocket_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs application startup and shutdown logic.

    Startup:
    - Creates database tables that do not already exist.
    - Applies small backwards-compatible schema migrations.
    - Starts the Redis event listener.

    Shutdown:
    - Cancels the Redis listener safely.
    """

    Base.metadata.create_all(bind=engine)
    ensure_live_collaboration_schema(engine)

    redis_listener_task = asyncio.create_task(
        redis_event_listener()
    )

    try:
        yield
    finally:
        redis_listener_task.cancel()

        try:
            await redis_listener_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="AI Film Studio API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-film-studio-six.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(live_collaboration.router)

app.include_router(
    storyboard.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(
    images.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(
    audio.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(
    video.router,
    dependencies=[Depends(get_current_user)],
)

app.include_router(
    movie.router,
    dependencies=[Depends(get_current_user)],
)


@app.get("/")
def root():
    return {
        "message": "AI Film Studio API is running",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "service": "AI Film Studio Backend",
    }


@app.get("/api/redis-health")
def redis_health():
    redis_client.set(
        "ai-film-studio:redis-test",
        "Redis is working",
    )

    value = redis_client.get(
        "ai-film-studio:redis-test"
    )

    return {
        "status": "ok",
        "redis": value,
    }


@app.post(
    "/api/generation-queue",
    dependencies=[Depends(get_current_user)],
)
async def start_generation_queue(payload: dict):
    batch = create_generation_batch(payload)

    enqueue_generation_batch(batch["id"])

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "steps": batch["steps"],
    }


@app.get(
    "/api/generation-queue/{batch_id}",
    dependencies=[Depends(get_current_user)],
)
def get_generation_queue(batch_id: str):
    batch = get_generation_batch(batch_id)

    if not batch:
        return {
            "status": "not_found",
            "steps": [],
            "scenes": [],
        }

    return batch


@app.post(
    "/api/generation-queue/{batch_id}/cancel",
    dependencies=[Depends(get_current_user)],
)
def cancel_generation_queue(batch_id: str):
    batch = request_cancel_generation_batch(
        batch_id
    )

    if not batch:
        return {
            "status": "not_found",
            "message": (
                "Generation batch was not found."
            ),
        }

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "cancel_requested": batch.get(
            "cancel_requested",
            False,
        ),
        "steps": batch["steps"],
        "scenes": batch["scenes"],
    }


@app.post(
    "/api/generation-queue/{batch_id}/retry-failed",
    dependencies=[Depends(get_current_user)],
)
def retry_failed_generation_queue(
    batch_id: str,
):
    batch = retry_failed_generation_batch(
        batch_id
    )

    if not batch:
        return {
            "status": "not_found",
            "message": (
                "Generation batch was not found."
            ),
        }

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "cancel_requested": batch.get(
            "cancel_requested",
            False,
        ),
        "steps": batch["steps"],
        "scenes": batch["scenes"],
    }


@app.websocket(
    "/ws/generation-queue/{batch_id}"
)
async def generation_queue_websocket(
    websocket: WebSocket,
    batch_id: str,
):
    await websocket_manager.connect(
        batch_id,
        websocket,
    )

    try:
        batch = get_generation_batch(batch_id)

        if batch:
            await websocket.send_json(
                {
                    "event": "batch_snapshot",
                    "batch": batch,
                }
            )
        else:
            await websocket.send_json(
                {
                    "event": "batch_not_found",
                    "batch_id": batch_id,
                }
            )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        websocket_manager.disconnect(
            batch_id,
            websocket,
        )

    except Exception as error:
        print(
            "WebSocket error for batch "
            f"{batch_id}: {error}"
        )

        websocket_manager.disconnect(
            batch_id,
            websocket,
        )

        try:
            await websocket.close()
        except Exception:
            pass


@app.websocket(
    "/ws/live-collaboration/{session_id}"
)
async def live_collaboration_websocket(
    websocket: WebSocket,
    session_id: str,
):
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(
            code=4401,
            reason="Authentication required",
        )
        return

    db = SessionLocal()
    user: User | None = None

    try:
        user_id = decode_token(token)

        user = db.get(User, user_id)

        collaboration_session = db.get(
            LiveCollaborationSession,
            session_id,
        )

        if (
            not user
            or not collaboration_session
            or collaboration_session.status != "active"
        ):
            await websocket.close(
                code=4404,
                reason="Session not found",
            )
            return

        if (
            collaboration_session.created_by
            == user.id
        ):
            participant_role = "owner"
        else:
            participant_role = db.scalar(
                select(
                    LiveCollaborationParticipant.role
                ).where(
                    LiveCollaborationParticipant.session_id
                    == session_id,
                    LiveCollaborationParticipant.user_id
                    == user.id,
                )
            )

        if participant_role is None:
            await websocket.close(
                code=4403,
                reason=(
                    "Invitation must be "
                    "accepted first"
                ),
            )
            return

        await live_collaboration_manager.connect(
            session_id,
            user.id,
            websocket,
        )

        await websocket.send_json(
            {
                "event": "connected",
                "sessionId": session_id,
                "userId": user.id,
                "email": user.email,
                "role": participant_role,
            }
        )

        while True:
            message = await websocket.receive_json()
            event = message.get("event")

            if event == "ping":
                await websocket.send_json(
                    {
                        "event": "pong",
                    }
                )
                continue

            if event != "project_update":
                continue

            # Read the role again for every update.
            # This ensures role changes apply immediately.
            if (
                collaboration_session.created_by
                == user.id
            ):
                current_role = "owner"
            else:
                current_role = db.scalar(
                    select(
                        LiveCollaborationParticipant.role
                    ).where(
                        LiveCollaborationParticipant.session_id
                        == session_id,
                        LiveCollaborationParticipant.user_id
                        == user.id,
                    )
                )

            if current_role not in (
                "owner",
                "editor",
            ):
                await websocket.send_json(
                    {
                        "event": "permission_denied",
                        "message": (
                            "Viewer access cannot "
                            "send project updates."
                        ),
                    }
                )
                continue

            await live_collaboration_manager.broadcast(
                session_id,
                {
                    "event": "project_update",
                    "data": message.get("data"),
                    "updatedBy": user.email,
                },
                exclude=websocket,
            )

    except WebSocketDisconnect:
        pass

    except Exception as error:
        print(
            "Live collaboration WebSocket "
            f"error for {session_id}: {error}"
        )

        try:
            await websocket.close(
                code=1011,
                reason="Internal server error",
            )
        except Exception:
            pass

    finally:
        if user is not None:
            await live_collaboration_manager.disconnect(
                session_id,
                user.id,
                websocket,
            )

        db.close()