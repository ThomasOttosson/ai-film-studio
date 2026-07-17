from __future__ import annotations

import asyncio
import logging
import os
import signal
import socket
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from redis_client import redis_client

from ai_action_jobs import (
    get_ai_job,
    update_ai_job,
)
from ai_action_processor import (
    process_ai_action_job,
)


logger = logging.getLogger(__name__)


QUEUE_KEY = "ai-film-studio:ai-actions:queue"
PROCESSING_KEY = (
    "ai-film-studio:ai-actions:processing"
)
LEASE_KEY_PREFIX = (
    "ai-film-studio:ai-actions:lease"
)

DEFAULT_BLOCK_TIMEOUT_SECONDS = 5
DEFAULT_LEASE_SECONDS = 60 * 10
DEFAULT_REQUEUE_INTERVAL_SECONDS = 30


def utc_timestamp() -> float:
    return datetime.now(
        timezone.utc
    ).timestamp()


def lease_key(
    job_id: str,
) -> str:
    return f"{LEASE_KEY_PREFIX}:{job_id}"


@dataclass(frozen=True)
class AIQueueSettings:
    block_timeout_seconds: int
    lease_seconds: int
    requeue_interval_seconds: int

    @classmethod
    def from_environment(
        cls,
    ) -> "AIQueueSettings":
        return cls(
            block_timeout_seconds=max(
                1,
                int(
                    os.getenv(
                        "AI_QUEUE_BLOCK_TIMEOUT_SECONDS",
                        str(
                            DEFAULT_BLOCK_TIMEOUT_SECONDS
                        ),
                    )
                ),
            ),
            lease_seconds=max(
                30,
                int(
                    os.getenv(
                        "AI_QUEUE_LEASE_SECONDS",
                        str(DEFAULT_LEASE_SECONDS),
                    )
                ),
            ),
            requeue_interval_seconds=max(
                5,
                int(
                    os.getenv(
                        "AI_QUEUE_REQUEUE_INTERVAL_SECONDS",
                        str(
                            DEFAULT_REQUEUE_INTERVAL_SECONDS
                        ),
                    )
                ),
            ),
        )


def enqueue_ai_action_job(
    job_id: str,
) -> bool:
    """
    Add a persisted AI job to the Redis queue.

    A short deduplication key prevents the same job from being queued
    repeatedly while it is already waiting or being processed.
    """

    job = get_ai_job(job_id)

    if job is None:
        raise ValueError(
            f"AI job '{job_id}' does not exist"
        )

    current_status = str(
        job.get("status") or ""
    )

    if current_status in {
        "completed",
        "failed",
    }:
        return False

    dedupe_key = (
        f"ai-film-studio:"
        f"ai-actions:queued:{job_id}"
    )

    inserted = redis_client.set(
        dedupe_key,
        "1",
        nx=True,
        ex=60 * 60,
    )

    if not inserted:
        return False

    pipeline = redis_client.pipeline()
    pipeline.rpush(
        QUEUE_KEY,
        job_id,
    )
    pipeline.hset(
        PROCESSING_KEY,
        job_id,
        0,
    )
    pipeline.execute()

    return True


def remove_queue_marker(
    job_id: str,
) -> None:
    pipeline = redis_client.pipeline()
    pipeline.delete(
        f"ai-film-studio:"
        f"ai-actions:queued:{job_id}"
    )
    pipeline.hdel(
        PROCESSING_KEY,
        job_id,
    )
    pipeline.delete(
        lease_key(job_id)
    )
    pipeline.execute()


def reserve_next_job(
    *,
    worker_id: str,
    block_timeout_seconds: int,
    lease_seconds: int,
) -> str | None:
    """
    Reserve the next job using a blocking Redis pop.

    The lease records which worker owns the job and expires
    automatically if that worker crashes.
    """

    result = redis_client.blpop(
        QUEUE_KEY,
        timeout=block_timeout_seconds,
    )

    if not result:
        return None

    _, raw_job_id = result
    job_id = (
        raw_job_id.decode("utf-8")
        if isinstance(raw_job_id, bytes)
        else str(raw_job_id)
    )

    lease_payload = (
        f"{worker_id}:{utc_timestamp()}"
    )

    acquired = redis_client.set(
        lease_key(job_id),
        lease_payload,
        nx=True,
        ex=lease_seconds,
    )

    if not acquired:
        redis_client.rpush(
            QUEUE_KEY,
            job_id,
        )
        return None

    redis_client.hset(
        PROCESSING_KEY,
        job_id,
        utc_timestamp(),
    )

    return job_id


def acknowledge_job(
    job_id: str,
) -> None:
    remove_queue_marker(job_id)


def requeue_expired_jobs() -> int:
    """
    Return abandoned processing jobs to the queue.

    Jobs are considered abandoned when they exist in the processing
    index but no longer have an active lease.
    """

    raw_entries = redis_client.hgetall(
        PROCESSING_KEY
    )
    requeued = 0

    for raw_job_id, raw_started_at in raw_entries.items():
        job_id = (
            raw_job_id.decode("utf-8")
            if isinstance(raw_job_id, bytes)
            else str(raw_job_id)
        )

        try:
            started_at = float(
                raw_started_at.decode("utf-8")
                if isinstance(
                    raw_started_at,
                    bytes,
                )
                else raw_started_at
            )
        except (TypeError, ValueError):
            started_at = 0

        if started_at <= 0:
            continue

        if redis_client.exists(
            lease_key(job_id)
        ):
            continue

        job = get_ai_job(job_id)

        if job is None:
            remove_queue_marker(job_id)
            continue

        if str(job.get("status")) in {
            "completed",
            "failed",
        }:
            remove_queue_marker(job_id)
            continue

        update_ai_job(
            job_id,
            status="queued",
            progress=min(
                int(job.get("progress", 0)),
                90,
            ),
            error="",
        )

        redis_client.rpush(
            QUEUE_KEY,
            job_id,
        )
        redis_client.hset(
            PROCESSING_KEY,
            job_id,
            0,
        )
        requeued += 1

        logger.warning(
            "Requeued abandoned AI job %s "
            "(last processing timestamp: %s)",
            job_id,
            started_at,
        )

    return requeued


class AIActionWorker:
    def __init__(
        self,
        *,
        settings: (
            AIQueueSettings | None
        ) = None,
        worker_id: str | None = None,
    ) -> None:
        self.settings = (
            settings
            or AIQueueSettings.from_environment()
        )
        self.worker_id = (
            worker_id
            or self._create_worker_id()
        )
        self._stopping = asyncio.Event()
        self._last_requeue_check = 0.0

    @staticmethod
    def _create_worker_id() -> str:
        hostname = socket.gethostname()
        return (
            f"{hostname}:{os.getpid()}:"
            f"{uuid4().hex[:8]}"
        )

    def request_stop(self) -> None:
        self._stopping.set()

    async def run_forever(self) -> None:
        logger.info(
            "AI action worker %s started",
            self.worker_id,
        )

        loop = asyncio.get_running_loop()

        for signal_name in (
            signal.SIGINT,
            signal.SIGTERM,
        ):
            try:
                loop.add_signal_handler(
                    signal_name,
                    self.request_stop,
                )
            except (
                NotImplementedError,
                RuntimeError,
            ):
                pass

        while not self._stopping.is_set():
            await self._maybe_requeue_jobs()

            job_id = await asyncio.to_thread(
                reserve_next_job,
                worker_id=self.worker_id,
                block_timeout_seconds=(
                    self.settings
                    .block_timeout_seconds
                ),
                lease_seconds=(
                    self.settings.lease_seconds
                ),
            )

            if job_id is None:
                continue

            await self._process_reserved_job(
                job_id
            )

        logger.info(
            "AI action worker %s stopped",
            self.worker_id,
        )

    async def _process_reserved_job(
        self,
        job_id: str,
    ) -> None:
        logger.info(
            "Worker %s processing AI job %s",
            self.worker_id,
            job_id,
        )

        try:
            await process_ai_action_job(
                job_id
            )
        except Exception:
            logger.exception(
                "Unhandled worker error for "
                "AI job %s",
                job_id,
            )

            update_ai_job(
                job_id,
                status="failed",
                progress=100,
                error=(
                    "Unhandled AI worker error"
                ),
            )
        finally:
            acknowledge_job(job_id)

    async def _maybe_requeue_jobs(
        self,
    ) -> None:
        now = utc_timestamp()

        if (
            now - self._last_requeue_check
            < self.settings
            .requeue_interval_seconds
        ):
            return

        self._last_requeue_check = now

        count = await asyncio.to_thread(
            requeue_expired_jobs
        )

        if count:
            logger.info(
                "Requeued %s abandoned "
                "AI job(s)",
                count,
            )


async def run_worker() -> None:
    worker = AIActionWorker()
    await worker.run_forever()


def main() -> None:
    logging.basicConfig(
        level=os.getenv(
            "LOG_LEVEL",
            "INFO",
        ).upper(),
        format=(
            "%(asctime)s "
            "%(levelname)s "
            "%(name)s: %(message)s"
        ),
    )

    asyncio.run(run_worker())


if __name__ == "__main__":
    main()