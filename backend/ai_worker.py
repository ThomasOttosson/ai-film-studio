from __future__ import annotations

import asyncio
import logging
import os
import random
import signal
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from redis.asyncio import Redis
from redis.exceptions import RedisError

from ai_action_jobs import AIActionJobStore
from ai_action_processor import AIActionProcessor
from ai_action_queue import AIActionQueue
from ai_action_events import AIActionEventPublisher
from ai_provider import AIProviderRegistry


logger = logging.getLogger("ai_worker")


@dataclass(frozen=True, slots=True)
class AIWorkerSettings:
    redis_url: str
    concurrency: int
    poll_timeout_seconds: int
    shutdown_timeout_seconds: float
    max_attempts: int
    retry_base_delay_seconds: float
    retry_max_delay_seconds: float
    health_log_interval_seconds: float

    @classmethod
    def from_environment(cls) -> "AIWorkerSettings":
        return cls(
            redis_url=os.getenv(
                "REDIS_URL",
                "redis://localhost:6379/0",
            ),
            concurrency=max(
                1,
                int(os.getenv("AI_WORKER_CONCURRENCY", "2")),
            ),
            poll_timeout_seconds=max(
                1,
                int(os.getenv("AI_WORKER_POLL_TIMEOUT", "5")),
            ),
            shutdown_timeout_seconds=max(
                1.0,
                float(
                    os.getenv(
                        "AI_WORKER_SHUTDOWN_TIMEOUT",
                        "30",
                    )
                ),
            ),
            max_attempts=max(
                1,
                int(os.getenv("AI_JOB_MAX_ATTEMPTS", "3")),
            ),
            retry_base_delay_seconds=max(
                0.1,
                float(
                    os.getenv(
                        "AI_JOB_RETRY_BASE_DELAY",
                        "2",
                    )
                ),
            ),
            retry_max_delay_seconds=max(
                1.0,
                float(
                    os.getenv(
                        "AI_JOB_RETRY_MAX_DELAY",
                        "60",
                    )
                ),
            ),
            health_log_interval_seconds=max(
                5.0,
                float(
                    os.getenv(
                        "AI_WORKER_HEALTH_LOG_INTERVAL",
                        "60",
                    )
                ),
            ),
        )


class AIWorker:
    def __init__(
        self,
        *,
        redis: Redis,
        queue: AIActionQueue,
        jobs: AIActionJobStore,
        processor: AIActionProcessor,
        events: AIActionEventPublisher,
        settings: AIWorkerSettings,
    ) -> None:
        self._redis = redis
        self._queue = queue
        self._jobs = jobs
        self._processor = processor
        self._events = events
        self._settings = settings

        self._stop_event = asyncio.Event()
        self._tasks: set[asyncio.Task[Any]] = set()
        self._started = False

    async def run(self) -> None:
        if self._started:
            raise RuntimeError("AI worker is already running")

        self._started = True
        logger.info(
            "Starting AI worker with concurrency=%s",
            self._settings.concurrency,
        )

        workers = [
            asyncio.create_task(
                self._consume_loop(index),
                name=f"ai-worker-{index}",
            )
            for index in range(self._settings.concurrency)
        ]

        health_task = asyncio.create_task(
            self._health_loop(),
            name="ai-worker-health",
        )

        self._tasks.update(workers)
        self._tasks.add(health_task)

        try:
            await self._stop_event.wait()
        finally:
            await self._shutdown_tasks()

    def request_stop(self) -> None:
        if not self._stop_event.is_set():
            logger.info("AI worker shutdown requested")
            self._stop_event.set()

    async def _consume_loop(self, worker_index: int) -> None:
        logger.info("Consumer %s started", worker_index)

        while not self._stop_event.is_set():
            try:
                job_id = await self._dequeue_job()
            except asyncio.CancelledError:
                raise
            except RedisError:
                logger.exception(
                    "Consumer %s could not read from queue",
                    worker_index,
                )
                await self._sleep_interruptibly(2.0)
                continue
            except Exception:
                logger.exception(
                    "Consumer %s encountered an unexpected queue error",
                    worker_index,
                )
                await self._sleep_interruptibly(1.0)
                continue

            if not job_id:
                continue

            try:
                await self._process_job(job_id)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception(
                    "Unhandled failure while processing AI job %s",
                    job_id,
                )

        logger.info("Consumer %s stopped", worker_index)

    async def _dequeue_job(self) -> str | None:
        dequeue = getattr(self._queue, "dequeue", None)
        if dequeue is None:
            raise RuntimeError(
                "AIActionQueue must expose an async dequeue method"
            )

        try:
            value = await dequeue(
                timeout=self._settings.poll_timeout_seconds,
            )
        except TypeError:
            value = await dequeue(
                self._settings.poll_timeout_seconds,
            )

        if value is None:
            return None

        if isinstance(value, bytes):
            return value.decode("utf-8")

        if isinstance(value, str):
            return value

        if isinstance(value, dict):
            job_id = value.get("job_id") or value.get("id")
            return str(job_id) if job_id else None

        job_id = getattr(value, "job_id", None) or getattr(
            value,
            "id",
            None,
        )
        return str(job_id) if job_id else str(value)

    async def _process_job(self, job_id: str) -> None:
        job = await self._get_job(job_id)
        if job is None:
            logger.warning(
                "Skipping missing AI job %s",
                job_id,
            )
            return

        status = self._read_field(job, "status")
        if status in {"completed", "failed", "cancelled", "deleted"}:
            logger.info(
                "Skipping terminal AI job %s with status=%s",
                job_id,
                status,
            )
            return

        attempt = self._read_attempt(job) + 1

        await self._update_job(
            job_id,
            status="processing",
            attempt=attempt,
            progress=0,
            error=None,
        )
        await self._publish(
            job_id,
            event_type="processing",
            payload={
                "status": "processing",
                "attempt": attempt,
                "progress": 0,
            },
        )

        logger.info(
            "Processing AI job %s attempt=%s",
            job_id,
            attempt,
        )

        try:
            await self._invoke_processor(job_id, job)
        except asyncio.CancelledError:
            await self._handle_interrupted_job(job_id, attempt)
            raise
        except Exception as exc:
            await self._handle_failed_attempt(
                job_id=job_id,
                attempt=attempt,
                error=exc,
            )
            return

        refreshed = await self._get_job(job_id)
        refreshed_status = (
            self._read_field(refreshed, "status")
            if refreshed is not None
            else None
        )

        if refreshed_status not in {
            "completed",
            "failed",
            "cancelled",
            "deleted",
        }:
            await self._update_job(
                job_id,
                status="completed",
                progress=100,
                error=None,
            )
            await self._publish(
                job_id,
                event_type="completed",
                payload={
                    "status": "completed",
                    "progress": 100,
                },
            )

        logger.info("AI job %s completed", job_id)

    async def _invoke_processor(
        self,
        job_id: str,
        job: Any,
    ) -> None:
        process = getattr(self._processor, "process", None)
        if process is None:
            process = getattr(
                self._processor,
                "process_job",
                None,
            )

        if process is None:
            raise RuntimeError(
                "AIActionProcessor must expose process or process_job"
            )

        try:
            await process(job)
        except TypeError as original_error:
            try:
                await process(job_id)
            except TypeError:
                raise original_error

    async def _handle_failed_attempt(
        self,
        *,
        job_id: str,
        attempt: int,
        error: Exception,
    ) -> None:
        message = self._safe_error_message(error)

        if attempt >= self._settings.max_attempts:
            logger.exception(
                "AI job %s failed permanently after %s attempts",
                job_id,
                attempt,
            )
            await self._update_job(
                job_id,
                status="failed",
                progress=0,
                attempt=attempt,
                error=message,
            )
            await self._publish(
                job_id,
                event_type="failed",
                payload={
                    "status": "failed",
                    "attempt": attempt,
                    "error": message,
                },
            )
            return

        delay = self._retry_delay(attempt)

        logger.warning(
            "AI job %s failed on attempt %s; retrying in %.2fs: %s",
            job_id,
            attempt,
            delay,
            message,
        )

        await self._update_job(
            job_id,
            status="queued",
            progress=0,
            attempt=attempt,
            error=message,
        )
        await self._publish(
            job_id,
            event_type="retrying",
            payload={
                "status": "queued",
                "attempt": attempt,
                "retry_in_seconds": delay,
                "error": message,
            },
        )

        await self._sleep_interruptibly(delay)

        if self._stop_event.is_set():
            return

        await self._enqueue_job(job_id)

    async def _handle_interrupted_job(
        self,
        job_id: str,
        attempt: int,
    ) -> None:
        logger.warning(
            "AI job %s interrupted during shutdown",
            job_id,
        )

        try:
            await self._update_job(
                job_id,
                status="queued",
                progress=0,
                attempt=attempt,
                error="Worker interrupted during shutdown",
            )
            await self._enqueue_job(job_id)
            await self._publish(
                job_id,
                event_type="queued",
                payload={
                    "status": "queued",
                    "attempt": attempt,
                    "reason": "worker_shutdown",
                },
            )
        except Exception:
            logger.exception(
                "Could not requeue interrupted AI job %s",
                job_id,
            )

    async def _get_job(self, job_id: str) -> Any | None:
        getter = getattr(self._jobs, "get", None)
        if getter is None:
            getter = getattr(self._jobs, "get_job", None)

        if getter is None:
            raise RuntimeError(
                "AIActionJobStore must expose get or get_job"
            )

        return await getter(job_id)

    async def _update_job(
        self,
        job_id: str,
        **changes: Any,
    ) -> Any:
        updater = getattr(self._jobs, "update", None)
        if updater is None:
            updater = getattr(
                self._jobs,
                "update_job",
                None,
            )

        if updater is None:
            raise RuntimeError(
                "AIActionJobStore must expose update or update_job"
            )

        try:
            return await updater(job_id, **changes)
        except TypeError:
            return await updater(job_id, changes)

    async def _enqueue_job(self, job_id: str) -> None:
        enqueue = getattr(self._queue, "enqueue", None)
        if enqueue is None:
            raise RuntimeError(
                "AIActionQueue must expose an async enqueue method"
            )

        await enqueue(job_id)

    async def _publish(
        self,
        job_id: str,
        *,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        publisher = getattr(self._events, "publish", None)
        if publisher is None:
            publisher = getattr(
                self._events,
                "publish_job_event",
                None,
            )

        if publisher is None:
            logger.warning(
                "AIActionEventPublisher has no publish method"
            )
            return

        try:
            await publisher(
                job_id=job_id,
                event_type=event_type,
                payload=payload,
            )
        except TypeError:
            try:
                await publisher(
                    job_id,
                    event_type,
                    payload,
                )
            except TypeError:
                await publisher(
                    {
                        "job_id": job_id,
                        "type": event_type,
                        **payload,
                    }
                )
        except Exception:
            logger.exception(
                "Could not publish %s event for AI job %s",
                event_type,
                job_id,
            )

    async def _health_loop(self) -> None:
        while not self._stop_event.is_set():
            await self._sleep_interruptibly(
                self._settings.health_log_interval_seconds
            )

            if self._stop_event.is_set():
                break

            try:
                await self._redis.ping()
                logger.info(
                    "AI worker healthy; active_consumers=%s",
                    sum(
                        1
                        for task in self._tasks
                        if task.get_name().startswith(
                            "ai-worker-"
                        )
                        and not task.done()
                    ),
                )
            except RedisError:
                logger.exception(
                    "AI worker Redis health check failed"
                )

    async def _sleep_interruptibly(
        self,
        seconds: float,
    ) -> None:
        try:
            await asyncio.wait_for(
                self._stop_event.wait(),
                timeout=seconds,
            )
        except asyncio.TimeoutError:
            pass

    async def _shutdown_tasks(self) -> None:
        pending = [
            task
            for task in self._tasks
            if task is not asyncio.current_task()
            and not task.done()
        ]

        if not pending:
            return

        for task in pending:
            task.cancel()

        try:
            await asyncio.wait_for(
                asyncio.gather(
                    *pending,
                    return_exceptions=True,
                ),
                timeout=self._settings.shutdown_timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.error(
                "AI worker shutdown timed out after %.1fs",
                self._settings.shutdown_timeout_seconds,
            )

        self._tasks.clear()
        logger.info("AI worker stopped")

    def _retry_delay(self, attempt: int) -> float:
        exponential = min(
            self._settings.retry_max_delay_seconds,
            self._settings.retry_base_delay_seconds
            * (2 ** max(0, attempt - 1)),
        )
        jitter = random.uniform(
            0,
            exponential * 0.2,
        )
        return exponential + jitter

    @staticmethod
    def _read_attempt(job: Any) -> int:
        value = AIWorker._read_field(job, "attempt", 0)
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _read_field(
        value: Any,
        name: str,
        default: Any = None,
    ) -> Any:
        if value is None:
            return default

        if isinstance(value, dict):
            return value.get(name, default)

        return getattr(value, name, default)

    @staticmethod
    def _safe_error_message(error: Exception) -> str:
        message = str(error).strip()
        return message[:2000] if message else type(error).__name__


def _build_component(
    factory: Callable[..., Any],
    *args: Any,
) -> Any:
    last_error: TypeError | None = None

    candidates = (
        args,
        args[:1],
        (),
    )

    for candidate in candidates:
        try:
            return factory(*candidate)
        except TypeError as exc:
            last_error = exc

    if last_error is not None:
        raise last_error

    raise RuntimeError("Could not initialize worker component")


async def create_worker(
    settings: AIWorkerSettings | None = None,
) -> AIWorker:
    resolved = settings or AIWorkerSettings.from_environment()

    redis = Redis.from_url(
        resolved.redis_url,
        decode_responses=True,
        health_check_interval=30,
    )

    await redis.ping()

    queue = _build_component(
        AIActionQueue,
        redis,
    )
    jobs = _build_component(
        AIActionJobStore,
        redis,
    )
    events = _build_component(
        AIActionEventPublisher,
        redis,
    )

    registry = _build_component(
        AIProviderRegistry,
    )

    processor = _build_component(
        AIActionProcessor,
        registry,
        jobs,
        events,
    )

    return AIWorker(
        redis=redis,
        queue=queue,
        jobs=jobs,
        processor=processor,
        events=events,
        settings=resolved,
    )


async def run_worker() -> None:
    settings = AIWorkerSettings.from_environment()
    worker = await create_worker(settings)

    loop = asyncio.get_running_loop()

    for signal_name in (
        signal.SIGINT,
        signal.SIGTERM,
    ):
        try:
            loop.add_signal_handler(
                signal_name,
                worker.request_stop,
            )
        except NotImplementedError:
            signal.signal(
                signal_name,
                lambda *_: worker.request_stop(),
            )

    try:
        await worker.run()
    finally:
        await worker._redis.aclose()


def configure_logging() -> None:
    level_name = os.getenv(
        "LOG_LEVEL",
        "INFO",
    ).upper()

    logging.basicConfig(
        level=getattr(
            logging,
            level_name,
            logging.INFO,
        ),
        format=(
            "%(asctime)s %(levelname)s "
            "%(name)s %(message)s"
        ),
    )


def main() -> None:
    configure_logging()

    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.exception("AI worker terminated unexpectedly")
        raise


if __name__ == "__main__":
    main()