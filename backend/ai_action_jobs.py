from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from redis_client import redis_client


AI_JOB_KEY_PREFIX = "ai-film-studio:ai-job"
AI_USER_JOBS_KEY_PREFIX = "ai-film-studio:user-ai-jobs"
DEFAULT_JOB_TTL_SECONDS = 60 * 60 * 24 * 7


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def job_key(job_id: str) -> str:
    return f"{AI_JOB_KEY_PREFIX}:{job_id}"


def user_jobs_key(user_id: int) -> str:
    return f"{AI_USER_JOBS_KEY_PREFIX}:{user_id}"


def serialize_value(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        default=str,
    )


def deserialize_value(value: str | bytes | None) -> Any:
    if value is None:
        return None

    if isinstance(value, bytes):
        value = value.decode("utf-8")

    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return value


def normalize_hash(
    raw: dict[str | bytes, str | bytes],
) -> dict[str, Any]:
    normalized: dict[str, Any] = {}

    for raw_key, raw_value in raw.items():
        key = (
            raw_key.decode("utf-8")
            if isinstance(raw_key, bytes)
            else raw_key
        )

        value = (
            raw_value.decode("utf-8")
            if isinstance(raw_value, bytes)
            else raw_value
        )

        if key in {
            "clip",
            "metadata",
            "result",
        }:
            normalized[key] = deserialize_value(value)
            continue

        if key in {
            "user_id",
            "progress",
        }:
            try:
                normalized[key] = int(value)
            except (TypeError, ValueError):
                normalized[key] = 0
            continue

        if key == "strength":
            if value in {"", "null", "None"}:
                normalized[key] = None
            else:
                try:
                    normalized[key] = float(value)
                except (TypeError, ValueError):
                    normalized[key] = None
            continue

        if key in {
            "prompt",
            "project_id",
            "error",
        } and value in {"", "null", "None"}:
            normalized[key] = None
            continue

        normalized[key] = value

    return normalized


def encode_job(job: dict[str, Any]) -> dict[str, str]:
    return {
        "id": str(job["id"]),
        "user_id": str(job["user_id"]),
        "status": str(job["status"]),
        "action": str(job["action"]),
        "clip_id": str(job["clip_id"]),
        "clip": serialize_value(job.get("clip") or {}),
        "prompt": (
            ""
            if job.get("prompt") is None
            else str(job["prompt"])
        ),
        "strength": (
            ""
            if job.get("strength") is None
            else str(job["strength"])
        ),
        "project_id": (
            ""
            if job.get("project_id") is None
            else str(job["project_id"])
        ),
        "metadata": serialize_value(
            job.get("metadata") or {},
        ),
        "progress": str(int(job.get("progress", 0))),
        "result": serialize_value(job.get("result")),
        "error": (
            ""
            if job.get("error") is None
            else str(job["error"])
        ),
        "created_at": str(
            job.get("created_at") or utc_now_iso()
        ),
        "updated_at": str(
            job.get("updated_at") or utc_now_iso()
        ),
    }


def create_ai_job(
    job: dict[str, Any],
    *,
    ttl_seconds: int = DEFAULT_JOB_TTL_SECONDS,
) -> dict[str, Any]:
    encoded = encode_job(job)
    redis_job_key = job_key(encoded["id"])
    redis_user_key = user_jobs_key(
        int(encoded["user_id"]),
    )

    pipeline = redis_client.pipeline()
    pipeline.hset(
        redis_job_key,
        mapping=encoded,
    )
    pipeline.expire(
        redis_job_key,
        max(60, ttl_seconds),
    )
    pipeline.zadd(
        redis_user_key,
        {
            encoded["id"]: datetime.now(
                timezone.utc,
            ).timestamp(),
        },
    )
    pipeline.expire(
        redis_user_key,
        max(60, ttl_seconds),
    )
    pipeline.execute()

    return normalize_hash(encoded)


def get_ai_job(
    job_id: str,
) -> dict[str, Any] | None:
    raw = redis_client.hgetall(
        job_key(job_id),
    )

    if not raw:
        return None

    return normalize_hash(raw)


def get_owned_ai_job(
    job_id: str,
    user_id: int,
) -> dict[str, Any] | None:
    job = get_ai_job(job_id)

    if job is None:
        return None

    if int(job.get("user_id", 0)) != int(user_id):
        return None

    return job


def update_ai_job(
    job_id: str,
    *,
    status: str | None = None,
    progress: int | None = None,
    result: dict[str, Any] | None = None,
    error: str | None = None,
    ttl_seconds: int = DEFAULT_JOB_TTL_SECONDS,
) -> dict[str, Any] | None:
    redis_job_key = job_key(job_id)

    if not redis_client.exists(redis_job_key):
        return None

    updates: dict[str, str] = {
        "updated_at": utc_now_iso(),
    }

    if status is not None:
        updates["status"] = status

    if progress is not None:
        updates["progress"] = str(
            max(0, min(100, int(progress))),
        )

    if result is not None:
        updates["result"] = serialize_value(result)

    if error is not None:
        updates["error"] = error

    pipeline = redis_client.pipeline()
    pipeline.hset(
        redis_job_key,
        mapping=updates,
    )
    pipeline.expire(
        redis_job_key,
        max(60, ttl_seconds),
    )
    pipeline.execute()

    return get_ai_job(job_id)


def list_user_ai_jobs(
    user_id: int,
    *,
    project_id: str | None = None,
    clip_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit), 200))
    redis_user_key = user_jobs_key(user_id)

    job_ids = redis_client.zrevrange(
        redis_user_key,
        0,
        max(safe_limit * 4, safe_limit) - 1,
    )

    jobs: list[dict[str, Any]] = []
    stale_ids: list[str] = []

    for raw_job_id in job_ids:
        current_job_id = (
            raw_job_id.decode("utf-8")
            if isinstance(raw_job_id, bytes)
            else str(raw_job_id)
        )

        job = get_owned_ai_job(
            current_job_id,
            user_id,
        )

        if job is None:
            stale_ids.append(current_job_id)
            continue

        if (
            project_id is not None
            and job.get("project_id") != project_id
        ):
            continue

        if (
            clip_id is not None
            and job.get("clip_id") != clip_id
        ):
            continue

        jobs.append(job)

        if len(jobs) >= safe_limit:
            break

    if stale_ids:
        redis_client.zrem(
            redis_user_key,
            *stale_ids,
        )

    return jobs


def delete_ai_job(
    job_id: str,
    user_id: int,
) -> bool:
    job = get_owned_ai_job(
        job_id,
        user_id,
    )

    if job is None:
        return False

    pipeline = redis_client.pipeline()
    pipeline.delete(job_key(job_id))
    pipeline.zrem(
        user_jobs_key(user_id),
        job_id,
    )
    pipeline.execute()

    return True


def touch_ai_job(
    job_id: str,
    *,
    ttl_seconds: int = DEFAULT_JOB_TTL_SECONDS,
) -> bool:
    return bool(
        redis_client.expire(
            job_key(job_id),
            max(60, ttl_seconds),
        )
    )
