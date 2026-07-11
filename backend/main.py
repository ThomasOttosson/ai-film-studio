import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.database import Base, engine
from generation_queue import (
    create_generation_batch,
    enqueue_generation_batch,
    get_generation_batch,
    request_cancel_generation_batch,
    retry_failed_generation_batch,
)
from redis_client import redis_client
from redis_events import redis_event_listener
from websocket_manager import websocket_manager

load_dotenv()

from app.routes import audio, auth, images, movie, projects, storyboard, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_listener_task = asyncio.create_task(redis_event_listener())

    try:
        yield
    finally:
        redis_listener_task.cancel()

        try:
            await redis_listener_task
        except asyncio.CancelledError:
            pass


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Film Studio API",
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
app.include_router(storyboard.router, dependencies=[Depends(get_current_user)])
app.include_router(images.router, dependencies=[Depends(get_current_user)])
app.include_router(audio.router, dependencies=[Depends(get_current_user)])
app.include_router(video.router, dependencies=[Depends(get_current_user)])
app.include_router(movie.router, dependencies=[Depends(get_current_user)])


@app.get("/")
def root():
    return {"message": "AI Film Studio API is running"}


@app.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "service": "AI Film Studio Backend",
    }


@app.get("/api/redis-health")
def redis_health():
    redis_client.set("ai-film-studio:redis-test", "Redis is working")
    value = redis_client.get("ai-film-studio:redis-test")

    return {
        "status": "ok",
        "redis": value,
    }


@app.post("/api/generation-queue", dependencies=[Depends(get_current_user)])
async def start_generation_queue(payload: dict):
    batch = create_generation_batch(payload)
    enqueue_generation_batch(batch["id"])

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "steps": batch["steps"],
    }


@app.get("/api/generation-queue/{batch_id}", dependencies=[Depends(get_current_user)])
def get_generation_queue(batch_id: str):
    batch = get_generation_batch(batch_id)

    if not batch:
        return {
            "status": "not_found",
            "steps": [],
            "scenes": [],
        }

    return batch


@app.post("/api/generation-queue/{batch_id}/cancel", dependencies=[Depends(get_current_user)])
def cancel_generation_queue(batch_id: str):
    batch = request_cancel_generation_batch(batch_id)

    if not batch:
        return {
            "status": "not_found",
            "message": "Generation batch was not found.",
        }

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "cancel_requested": batch.get("cancel_requested", False),
        "steps": batch["steps"],
        "scenes": batch["scenes"],
    }


@app.post("/api/generation-queue/{batch_id}/retry-failed", dependencies=[Depends(get_current_user)])
def retry_failed_generation_queue(batch_id: str):
    batch = retry_failed_generation_batch(batch_id)

    if not batch:
        return {
            "status": "not_found",
            "message": "Generation batch was not found.",
        }

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "cancel_requested": batch.get("cancel_requested", False),
        "steps": batch["steps"],
        "scenes": batch["scenes"],
    }


@app.websocket("/ws/generation-queue/{batch_id}")
async def generation_queue_websocket(
    websocket: WebSocket,
    batch_id: str,
):
    await websocket_manager.connect(batch_id, websocket)

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
        websocket_manager.disconnect(batch_id, websocket)

    except Exception as error:
        print(f"WebSocket error for batch {batch_id}: {error}")
        websocket_manager.disconnect(batch_id, websocket)

        try:
            await websocket.close()
        except Exception:
            pass
