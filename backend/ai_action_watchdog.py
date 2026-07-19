from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

from redis.asyncio import Redis
from redis.exceptions import RedisError

from ai_action_events import AIActionEventPublisher
from ai_action_jobs import AIActionJobStore
from ai_action_queue import AIActionQueue


logger = logging.getLogger("ai_action_watchdog")


@dataclass(frozen=True, slots=True)
class AIActionWatchdogSettings:
    redis_url: str
    interval_seconds: float
    processing_timeout_seconds: float
    queued_timeout_seconds: float
    max_attempts: int
    scan_count: int
    shutdown_timeout_seconds: float
    lock_key: str
    lock_ttl_seconds: int
    job_key_pattern: str

    @classmethod
    def from_environment(cls) -> "AIActionWatchdogSettings":
        interval = max(
            5.0,
            float(
                os.getenv(
                    "AI_WATCHDOG_INTERVAL_SECONDS",
                    "30",
                )
            ),
        )

        return cls(
            redis_url=os.getenv(
                "REDIS_URL",
                "redis://localhost:6379/0",
            ),
            interval_seconds=interval,
            processing_timeout_seconds=max(
                interval * 2,
                float(
                    os.getenv(
                        "AI_PROCESSING_TIMEOUT_SECONDS",
                        "900",
                    )
                ),
            ),
            queued_timeout_seconds=max(
                interval * 2,
                float(
                    os.getenv(
                        "AI_QUEUED_TIMEOUT_SECONDS",
                        "300",
                    )
                ),
            ),
            max_attempts=max(
                1,
                int(
                    os.getenv(
                        "AI_JOB_MAX_ATTEMPTS",
                        "3",
                    )
                ),
            ),
            scan_count=max(
                10,
                int(
                    os.getenv(
                        "AI_WATCHDOG_SCAN_COUNT",
                        "250",
                    )
                ),
            ),
            shutdown_timeout_seconds=max(
                1.0,
                float(
                    os.getenv(
                        "AI_WATCHDOG_SHUTDOWN_TIMEOUT",
                        "15",
                    )
                ),
            ),
            lock_key=os.getenv(
                "AI_WATCHDOG_LOCK_KEY",
                "ai:actions:watchdog:lock",
            ),
            lock_ttl_seconds=max(
                int(interval * 2),
                int(
                    os.getenv(
                        "AI_WATCHDOG_LOCK_TTL_SECONDS",
                        "90",
                    )
                ),
            ),
            job_key_pattern=os.getenv(
                "AI_JOB_KEY_PATTERN",
                "ai:actions:jobs:*",
            ),
        )


class AIActionWatchdog:
    def __init__(
        self,
        *,
        redis: Redis,
        jobs: AIActionJobStore,
        queue: AIActionQueue,
        events: AIActionEventPublisher,
        settings: AIActionWatchdogSettings,
    ) -> None:
        self._redis = redis
        self._jobs = jobs
        self._queue = queue
        self._events = events
        self._settings = settings
        self._stop_event = asyncio.Event()
        self._lock_value = (
            f"{os.getpid()}:{time.time_ns()}"
        )

    def request_stop(self) -> None:
        if not self._stop_event.is_set():
            logger.info(
                "AI action watchdog shutdown requested"
            )
            self._stop_event.set()

    async def run(self) -> None:
        logger.info(
            "Starting AI action watchdog interval=%.1fs "
            "processing_timeout=%.1fs queued_timeout=%.1fs",
            self._settings.interval_seconds,
            self._settings.processing_timeout_seconds,
            self._settings.queued_timeout_seconds,
        )

        while not self._stop_event.is_set():
            started_at = time.monotonic()

            try:
                if await self._acquire_lock():
                    await self._run_cycle()
                else:
                    logger.debug(
                        "Another watchdog instance owns the lock"
                    )
            except asyncio.CancelledError:
                raise
            except RedisError:
                logger.exception(
                    "Redis error during watchdog cycle"
                )
            except Exception:
                logger.exception(
                    "Unexpected watchdog cycle failure"
                )
            finally:
                await self._release_lock()

            elapsed = time.monotonic() - started_at
            delay = max(
                0.0,
                self._settings.interval_seconds - elapsed,
            )
            await self._sleep_interruptibly(delay)

        logger.info("AI action watchdog stopped")

    async def _run_cycle(self) -> None:
        now = datetime.now(timezone.utc)
        inspected = 0
        requeued = 0
        failed = 0

        async for job_id in self._iter_job_ids():
            if self._stop_event.is_set():
                break

            inspected += 1

            try:
                job = await self._get_job(job_id)
            except Exception:
                logger.exception(
                    "Could not read AI job %s",
                    job_id,
                )
                continue

            if job is None:
                continue

            status = str(
                self._read_field(
                    job,
                    "status",
                    "",
                )
            ).lower()

            if status not in {
                "processing",
                "queued",
            }:
                continue

            updated_at = self._job_updated_at(job)
            age_seconds = max(
                0.0,
                (now - updated_at).total_seconds(),
            )

            timeout = (
                self._settings.processing_timeout_seconds
                if status == "processing"
                else self._settings.queued_timeout_seconds
            )

            if age_seconds < timeout:
                continue

            attempt = self._job_attempt(job)

            if attempt >= self._settings.max_attempts:
                await self._fail_stale_job(
                    job_id=job_id,
                    status=status,
                    attempt=attempt,
                    age_seconds=age_seconds,
                )
                failed += 1
            else:
                await self._requeue_stale_job(
                    job_id=job_id,
                    previous_status=status,
                    attempt=attempt,
                    age_seconds=age_seconds,
                )
                requeued += 1

        logger.info(
            "Watchdog cycle complete inspected=%s "
            "requeued=%s failed=%s",
            inspected,
            requeued,
            failed,
        )

    async def _requeue_stale_job(
        self,
        *,
        job_id: str,
        previous_status: str,
        attempt: int,
        age_seconds: float,
    ) -> None:
        reason = (
            f"Recovered stale {previous_status} job "
            f"after {round(age_seconds)} seconds"
        )

        await self._update_job(
            job_id,
            status="queued",
            progress=0,
            error=reason,
        )
        await self._enqueue_job(job_id)
        await self._publish(
            job_id=job_id,
            event_type="recovered",
            payload={
                "status": "queued",
                "previous_status": previous_status,
                "attempt": attempt,
                "age_seconds": round(
                    age_seconds,
                    3,
                ),
                "reason": reason,
            },
        )

        logger.warning(
            "Requeued stale AI job %s previous_status=%s "
            "attempt=%s age=%.1fs",
            job_id,
            previous_status,
            attempt,
            age_seconds,
        )

    async def _fail_stale_job(
        self,
        *,
        job_id: str,
        status: str,
        attempt: int,
        age_seconds: float,
    ) -> None:
        reason = (
            f"AI job remained {status} for "
            f"{round(age_seconds)} seconds and exhausted "
            f"{self._settings.max_attempts} attempts"
        )

        await self._update_job(
            job_id,
            status="failed",
            progress=0,
            error=reason,
        )
        await self._publish(
            job_id=job_id,
            event_type="failed",
            payload={
                "status": "failed",
                "previous_status": status,
                "attempt": attempt,
                "age_seconds": round(
                    age_seconds,
                    3,
                ),
                "error": reason,
            },
        )

        logger.error(
            "Marked stale AI job %s as failed "
            "attempt=%s age=%.1fs",
            job_id,
            attempt,
            age_seconds,
        )

    async def _iter_job_ids(self):
        list_method = (
            getattr(self._jobs, "list_ids", None)
            or getattr(
                self._jobs,
                "list_job_ids",
                None,
            )
        )

        if list_method is not None:
            result = list_method()

            if hasattr(result, "__aiter__"):
                async for item in result:
                    job_id = self._extract_job_id(item)
                    if job_id:
                        yield job_id
                return

            resolved = (
                await result
                if asyncio.iscoroutine(result)
                else result
            )

            for item in resolved or []:
                job_id = self._extract_job_id(item)
                if job_id:
                    yield job_id
            return

        async for key in self._redis.scan_iter(
            match=self._settings.job_key_pattern,
            count=self._settings.scan_count,
        ):
            decoded = (
                key.decode("utf-8")
                if isinstance(key, bytes)
                else str(key)
            )
            job_id = decoded.rsplit(":", 1)[-1]

            if job_id:
                yield job_id

    async def _get_job(
        self,
        job_id: str,
    ) -> Any | None:
        getter = (
            getattr(self._jobs, "get", None)
            or getattr(
                self._jobs,
                "get_job",
                None,
            )
        )

        if getter is None:
            return await self._read_raw_job(job_id)

        return await getter(job_id)

    async def _read_raw_job(
        self,
        job_id: str,
    ) -> Any | None:
        key = self._raw_job_key(job_id)
        data_type = await self._redis.type(key)

        if data_type in {
            "hash",
            b"hash",
        }:
            value = await self._redis.hgetall(key)
            return value or None

        if data_type in {
            "string",
            b"string",
        }:
            raw = await self._redis.get(key)

            if raw is None:
                return None

            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")

            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                logger.warning(
                    "Invalid JSON for raw AI job %s",
                    job_id,
                )
                return None

        return None

    async def _update_job(
        self,
        job_id: str,
        **changes: Any,
    ) -> Any:
        updater = (
            getattr(self._jobs, "update", None)
            or getattr(
                self._jobs,
                "update_job",
                None,
            )
        )

        if updater is not None:
            try:
                return await updater(
                    job_id,
                    **changes,
                )
            except TypeError:
                return await updater(
                    job_id,
                    changes,
                )

        key = self._raw_job_key(job_id)
        data_type = await self._redis.type(key)

        normalized = {
            key_name: self._serialize_value(value)
            for key_name, value in changes.items()
        }
        normalized["updated_at"] = (
            datetime.now(timezone.utc).isoformat()
        )

        if data_type in {
            "hash",
            b"hash",
        }:
            await self._redis.hset(
                key,
                mapping=normalized,
            )
            return normalized

        raw = await self._redis.get(key)
        document: dict[str, Any] = {}

        if raw:
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    document = parsed
            except json.JSONDecodeError:
                pass

        document.update(changes)
        document["updated_at"] = (
            datetime.now(timezone.utc).isoformat()
        )
        await self._redis.set(
            key,
            json.dumps(
                document,
                separators=(",", ":"),
                default=str,
            ),
        )
        return document

    async def _enqueue_job(
        self,
        job_id: str,
    ) -> None:
        enqueue = getattr(
            self._queue,
            "enqueue",
            None,
        )

        if enqueue is None:
            raise RuntimeError(
                "AIActionQueue must expose enqueue"
            )

        await enqueue(job_id)

    async def _publish(
        self,
        *,
        job_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        publisher = (
            getattr(self._events, "publish", None)
            or getattr(
                self._events,
                "publish_job_event",
                None,
            )
        )

        if publisher is None:
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
                "Could not publish watchdog event "
                "for AI job %s",
                job_id,
            )

    async def _acquire_lock(self) -> bool:
        acquired = await self._redis.set(
            self._settings.lock_key,
            self._lock_value,
            nx=True,
            ex=self._settings.lock_ttl_seconds,
        )
        return bool(acquired)

    async def _release_lock(self) -> None:
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        end
        return 0
        """

        try:
            await self._redis.eval(
                script,
                1,
                self._settings.lock_key,
                self._lock_value,
            )
        except RedisError:
            logger.debug(
                "Could not release watchdog lock",
                exc_info=True,
            )

    async def _sleep_interruptibly(
        self,
        seconds: float,
    ) -> None:
        if seconds <= 0:
            return

        try:
            await asyncio.wait_for(
                self._stop_event.wait(),
                timeout=seconds,
            )
        except asyncio.TimeoutError:
            pass

    def _raw_job_key(
        self,
        job_id: str,
    ) -> str:
        pattern = self._settings.job_key_pattern

        if "*" in pattern:
            return pattern.replace("*", job_id)

        return f"{pattern.rstrip(':')}:{job_id}"

    @staticmethod
    def _job_attempt(job: Any) -> int:
        raw = AIActionWatchdog._read_field(
            job,
            "attempt",
            0,
        )

        try:
            return max(0, int(raw or 0))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _job_updated_at(
        job: Any,
    ) -> datetime:
        raw = (
            AIActionWatchdog._read_field(
                job,
                "updated_at",
            )
            or AIActionWatchdog._read_field(
                job,
                "updatedAt",
            )
            or AIActionWatchdog._read_field(
                job,
                "created_at",
            )
            or AIActionWatchdog._read_field(
                job,
                "createdAt",
            )
        )

        if isinstance(raw, datetime):
            parsed = raw
        elif isinstance(
            raw,
            (int, float),
        ):
            parsed = datetime.fromtimestamp(
                float(raw),
                tz=timezone.utc,
            )
        elif isinstance(raw, str):
            normalized = raw.strip().replace(
                "Z",
                "+00:00",
            )
            try:
                parsed = datetime.fromisoformat(
                    normalized
                )
            except ValueError:
                return datetime.now(timezone.utc)
        else:
            return datetime.now(timezone.utc)

        if parsed.tzinfo is None:
            return parsed.replace(
                tzinfo=timezone.utc
            )

        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _read_field(
        value: Any,
        name: str,
        default: Any = None,
    ) -> Any:
        if value is None:
            return default

        if isinstance(value, Mapping):
            direct = value.get(name, default)

            if direct is not default:
                return AIActionWatchdog._decode_value(
                    direct
                )

            encoded_name = name.encode("utf-8")
            encoded = value.get(
                encoded_name,
                default,
            )
            return AIActionWatchdog._decode_value(
                encoded
            )

        return getattr(value, name, default)

    @staticmethod
    def _decode_value(
        value: Any,
    ) -> Any:
        if isinstance(value, bytes):
            return value.decode("utf-8")
        return value

    @staticmethod
    def _serialize_value(
        value: Any,
    ) -> str:
        if value is None:
            return ""

        if isinstance(
            value,
            (str, int, float),
        ):
            return str(value)

        if isinstance(value, bool):
            return "true" if value else "false"

        return json.dumps(
            value,
            separators=(",", ":"),
            default=str,
        )

    @staticmethod
    def _extract_job_id(
        value: Any,
    ) -> str | None:
        if isinstance(value, bytes):
            return value.decode("utf-8")

        if isinstance(value, str):
            return value

        if isinstance(value, Mapping):
            candidate = (
                value.get("id")
                or value.get("job_id")
                or value.get(b"id")
                or value.get(b"job_id")
            )
            return (
                str(
                    AIActionWatchdog._decode_value(
                        candidate
                    )
                )
                if candidate
                else None
            )

        candidate = (
            getattr(value, "id", None)
            or getattr(
                value,
                "job_id",
                None,
            )
        )
        return str(candidate) if candidate else None


def _build_component(
    factory: Any,
    *args: Any,
) -> Any:
    last_error: TypeError | None = None

    for candidate in (
        args,
        args[:1],
        (),
    ):
        try:
            return factory(*candidate)
        except TypeError as exc:
            last_error = exc

    if last_error is not None:
        raise last_error

    raise RuntimeError(
        "Could not initialize watchdog component"
    )


async def create_watchdog(
    settings: AIActionWatchdogSettings | None = None,
) -> AIActionWatchdog:
    resolved = (
        settings
        or AIActionWatchdogSettings.from_environment()
    )

    redis = Redis.from_url(
        resolved.redis_url,
        decode_responses=True,
        health_check_interval=30,
    )
    await redis.ping()

    jobs = _build_component(
        AIActionJobStore,
        redis,
    )
    queue = _build_component(
        AIActionQueue,
        redis,
    )
    events = _build_component(
        AIActionEventPublisher,
        redis,
    )

    return AIActionWatchdog(
        redis=redis,
        jobs=jobs,
        queue=queue,
        events=events,
        settings=resolved,
    )


async def run_watchdog() -> None:
    watchdog = await create_watchdog()
    loop = asyncio.get_running_loop()

    for signal_name in (
        signal.SIGINT,
        signal.SIGTERM,
    ):
        try:
            loop.add_signal_handler(
                signal_name,
                watchdog.request_stop,
            )
        except NotImplementedError:
            signal.signal(
                signal_name,
                lambda *_: watchdog.request_stop(),
            )

    try:
        await watchdog.run()
    finally:
        await watchdog._redis.aclose()


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
        asyncio.run(run_watchdog())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.exception(
            "AI action watchdog terminated unexpectedly"
        )
        raise


if __name__ == "__main__":
    main()
