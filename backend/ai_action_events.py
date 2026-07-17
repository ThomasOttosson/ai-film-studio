from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from redis.asyncio import Redis

from redis_client import redis_client


logger = logging.getLogger(__name__)


CHANNEL_PREFIX = (
    "ai-film-studio:ai-actions:events"
)


def utc_iso() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def user_channel(
    user_id: int | str,
) -> str:
    return f"{CHANNEL_PREFIX}:user:{user_id}"


def job_channel(
    job_id: str,
) -> str:
    return f"{CHANNEL_PREFIX}:job:{job_id}"


@dataclass(frozen=True)
class AIActionEvent:
    type: str
    job_id: str
    user_id: int
    status: str
    progress: int
    action: str | None = None
    clip_id: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None
    created_at: str = ""

    def to_dict(
        self,
    ) -> dict[str, Any]:
        return {
            "type": self.type,
            "jobId": self.job_id,
            "userId": self.user_id,
            "status": self.status,
            "progress": self.progress,
            "action": self.action,
            "clipId": self.clip_id,
            "result": self.result,
            "error": self.error,
            "createdAt": (
                self.created_at or utc_iso()
            ),
        }


def event_from_job(
    job: dict[str, Any],
    *,
    event_type: str = "ai-job.updated",
) -> AIActionEvent:
    return AIActionEvent(
        type=event_type,
        job_id=str(job["id"]),
        user_id=int(job["user_id"]),
        status=str(job.get("status") or "queued"),
        progress=max(
            0,
            min(
                100,
                int(job.get("progress") or 0),
            ),
        ),
        action=(
            str(job["action"])
            if job.get("action") is not None
            else None
        ),
        clip_id=(
            str(job["clip_id"])
            if job.get("clip_id") is not None
            else None
        ),
        result=job.get("result"),
        error=job.get("error"),
        created_at=utc_iso(),
    )


def publish_ai_action_event(
    job: dict[str, Any],
    *,
    event_type: str = "ai-job.updated",
) -> int:
    """
    Publish one job event to both the user channel and job channel.

    The synchronous Redis client is used because job persistence and
    worker execution currently use synchronous Redis operations.
    """

    event = event_from_job(
        job,
        event_type=event_type,
    )
    payload = json.dumps(
        event.to_dict(),
        ensure_ascii=False,
        separators=(",", ":"),
    )

    pipeline = redis_client.pipeline()
    pipeline.publish(
        user_channel(event.user_id),
        payload,
    )
    pipeline.publish(
        job_channel(event.job_id),
        payload,
    )
    published = pipeline.execute()

    return sum(
        int(value or 0)
        for value in published
    )


class AIActionEventSubscriber:
    """
    Async Redis Pub/Sub subscriber suitable for WebSocket routes.

    One instance should be created per connected client and closed when
    the client disconnects.
    """

    def __init__(
        self,
        redis_url: str | None = None,
    ) -> None:
        connection_kwargs = (
            redis_client.connection_pool
            .connection_kwargs
        )

        self._redis = (
            Redis.from_url(
                redis_url,
                decode_responses=True,
            )
            if redis_url
            else Redis(
                host=connection_kwargs.get(
                    "host",
                    "localhost",
                ),
                port=int(
                    connection_kwargs.get(
                        "port",
                        6379,
                    )
                ),
                db=int(
                    connection_kwargs.get(
                        "db",
                        0,
                    )
                ),
                password=connection_kwargs.get(
                    "password"
                ),
                username=connection_kwargs.get(
                    "username"
                ),
                ssl=bool(
                    connection_kwargs.get(
                        "ssl",
                        False,
                    )
                ),
                decode_responses=True,
            )
        )
        self._pubsub = self._redis.pubsub()
        self._closed = False

    async def subscribe_user(
        self,
        user_id: int,
    ) -> None:
        await self._pubsub.subscribe(
            user_channel(user_id)
        )

    async def subscribe_job(
        self,
        job_id: str,
    ) -> None:
        await self._pubsub.subscribe(
            job_channel(job_id)
        )

    async def events(
        self,
        *,
        timeout_seconds: float = 15.0,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Yield decoded event dictionaries.

        A heartbeat event is yielded when no Redis message arrives
        before the timeout. This lets WebSocket routes keep connections
        alive and detect stale clients.
        """

        while not self._closed:
            message = await self._pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=timeout_seconds,
            )

            if message is None:
                yield {
                    "type": "heartbeat",
                    "createdAt": utc_iso(),
                }
                continue

            raw_data = message.get("data")

            if not isinstance(raw_data, str):
                continue

            try:
                payload = json.loads(raw_data)
            except json.JSONDecodeError:
                logger.warning(
                    "Ignored malformed AI action "
                    "event payload"
                )
                continue

            if isinstance(payload, dict):
                yield payload

            await asyncio.sleep(0)

    async def close(
        self,
    ) -> None:
        if self._closed:
            return

        self._closed = True

        try:
            await self._pubsub.unsubscribe()
        finally:
            await self._pubsub.aclose()
            await self._redis.aclose()

    async def __aenter__(
        self,
    ) -> "AIActionEventSubscriber":
        return self

    async def __aexit__(
        self,
        exc_type: Any,
        exc: Any,
        traceback: Any,
    ) -> None:
        await self.close()