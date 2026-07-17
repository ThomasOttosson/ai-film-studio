from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.auth import get_current_user
from app.models import User
from ai_action_events import (
    AIActionEventSubscriber,
)
from ai_action_jobs import get_owned_ai_job


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/ai/actions",
    tags=["AI Actions Realtime"],
)


WEBSOCKET_CLOSE_UNAUTHORIZED = 4401
WEBSOCKET_CLOSE_FORBIDDEN = 4403
WEBSOCKET_CLOSE_NOT_FOUND = 4404
WEBSOCKET_CLOSE_INTERNAL_ERROR = 4500


async def websocket_user(
    websocket: WebSocket,
) -> User:
    """
    Resolve the authenticated user for a WebSocket connection.

    This delegates to the application's existing authentication
    dependency. The dependency should accept credentials from the same
    cookie or Authorization header used by the HTTP API.
    """

    user = await get_current_user(
        websocket
    )

    if user is None:
        await websocket.close(
            code=WEBSOCKET_CLOSE_UNAUTHORIZED
        )
        raise WebSocketDisconnect(
            code=WEBSOCKET_CLOSE_UNAUTHORIZED
        )

    return user


@router.websocket("/stream")
async def stream_user_ai_actions(
    websocket: WebSocket,
    user: User = Depends(websocket_user),
) -> None:
    """
    Stream all AI action events owned by the authenticated user.

    Client endpoint:
        ws://host/api/ai/actions/stream

    Messages are JSON objects using the same camelCase fields as the
    REST API. Heartbeat messages are sent when Redis is quiet.
    """

    await websocket.accept()

    subscriber = AIActionEventSubscriber()

    try:
        await subscriber.subscribe_user(
            int(user.id)
        )

        await websocket.send_json(
            {
                "type": "connection.ready",
                "scope": "user",
                "userId": int(user.id),
            }
        )

        async for event in subscriber.events():
            await websocket.send_json(event)

    except WebSocketDisconnect:
        logger.info(
            "AI action WebSocket disconnected "
            "for user %s",
            user.id,
        )

    except asyncio.CancelledError:
        raise

    except Exception:
        logger.exception(
            "AI action WebSocket failed "
            "for user %s",
            user.id,
        )

        await _close_safely(
            websocket,
            WEBSOCKET_CLOSE_INTERNAL_ERROR,
        )

    finally:
        await subscriber.close()


@router.websocket(
    "/{job_id}/stream"
)
async def stream_single_ai_action(
    websocket: WebSocket,
    job_id: str,
    user: User = Depends(websocket_user),
) -> None:
    """
    Stream events for one AI job after verifying ownership.

    Client endpoint:
        ws://host/api/ai/actions/{jobId}/stream
    """

    job = get_owned_ai_job(
        job_id,
        int(user.id),
    )

    if job is None:
        await websocket.close(
            code=WEBSOCKET_CLOSE_NOT_FOUND
        )
        return

    await websocket.accept()

    subscriber = AIActionEventSubscriber()

    try:
        await subscriber.subscribe_job(
            job_id
        )

        await websocket.send_json(
            {
                "type": "connection.ready",
                "scope": "job",
                "jobId": job_id,
            }
        )

        await websocket.send_json(
            _job_snapshot(job)
        )

        async for event in subscriber.events():
            event_user_id = event.get(
                "userId"
            )

            if (
                event_user_id is not None
                and int(event_user_id)
                != int(user.id)
            ):
                logger.warning(
                    "Rejected cross-user AI event "
                    "for job %s",
                    job_id,
                )
                continue

            await websocket.send_json(event)

    except WebSocketDisconnect:
        logger.info(
            "AI job WebSocket disconnected "
            "for job %s",
            job_id,
        )

    except asyncio.CancelledError:
        raise

    except Exception:
        logger.exception(
            "AI job WebSocket failed "
            "for job %s",
            job_id,
        )

        await _close_safely(
            websocket,
            WEBSOCKET_CLOSE_INTERNAL_ERROR,
        )

    finally:
        await subscriber.close()


def _job_snapshot(
    job: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "ai-job.snapshot",
        "jobId": str(job["id"]),
        "userId": int(job["user_id"]),
        "status": str(job["status"]),
        "progress": int(
            job.get("progress") or 0
        ),
        "action": job.get("action"),
        "clipId": job.get("clip_id"),
        "result": job.get("result"),
        "error": job.get("error"),
        "createdAt": job.get(
            "created_at"
        ),
        "updatedAt": job.get(
            "updated_at"
        ),
    }


async def _close_safely(
    websocket: WebSocket,
    code: int,
) -> None:
    try:
        await websocket.close(code=code)
    except (
        RuntimeError,
        WebSocketDisconnect,
    ):
        pass