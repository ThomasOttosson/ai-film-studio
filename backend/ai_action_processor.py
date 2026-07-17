from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Awaitable, Callable

from ai_action_jobs import (
    get_ai_job,
    update_ai_job,
)


logger = logging.getLogger(__name__)


AIProviderHandler = Callable[
    [dict[str, Any]],
    Awaitable[dict[str, Any]],
]


GENERATED_ROOT = Path("generated")
GENERATED_VIDEO_DIR = GENERATED_ROOT / "video"
GENERATED_AUDIO_DIR = GENERATED_ROOT / "audio"
GENERATED_IMAGE_DIR = GENERATED_ROOT / "image"


def ensure_generated_directories() -> None:
    for directory in (
        GENERATED_ROOT,
        GENERATED_VIDEO_DIR,
        GENERATED_AUDIO_DIR,
        GENERATED_IMAGE_DIR,
    ):
        directory.mkdir(
            parents=True,
            exist_ok=True,
        )


def read_clip_value(
    clip: dict[str, Any],
    *keys: str,
) -> Any:
    for key in keys:
        value = clip.get(key)

        if value is not None:
            return value

    return None


async def development_provider(
    job: dict[str, Any],
) -> dict[str, Any]:
    """
    Local development implementation.

    It returns the same result structure as real providers, but it does
    not generate media. Replace or override this handler when provider
    integrations are ready.
    """

    await asyncio.sleep(0.7)

    action = str(job["action"])
    clip = job.get("clip") or {}
    prompt = (
        job.get("prompt")
        or clip.get("prompt")
        or clip.get("narration")
        or ""
    )

    if action == "rewrite-narration":
        original = (
            clip.get("narration")
            or prompt
            or "Narration saknas."
        )

        return {
            "narration": (
                f"{str(original).strip()} "
                "Texten har bearbetats för tydligare rytm, "
                "starkare bildspråk och ett mer filmiskt flöde."
            ),
            "message": "Narrationen har skrivits om.",
        }

    if action == "extend-scene":
        current_duration = float(
            clip.get("duration") or 5,
        )
        extension = max(
            1.0,
            round(current_duration * 0.35, 1),
        )

        return {
            "duration": round(
                current_duration + extension,
                1,
            ),
            "message": (
                f"Scenen förlängdes med "
                f"{extension} sekunder."
            ),
        }

    if action == "generate-voiceover":
        return {
            "audioUrl": (
                f"/generated/audio/{job['id']}.mp3"
            ),
            "message": "Voice-over har genererats.",
        }

    if action == "clean-audio":
        return {
            "audioUrl": (
                f"/generated/audio/"
                f"{job['id']}-cleaned.mp3"
            ),
            "sourceAudioUrl": read_clip_value(
                clip,
                "audioUrl",
                "audio_url",
                "mediaUrl",
                "media_url",
            ),
            "message": "Ljudet har rensats.",
        }

    if action in {
        "cinematic-motion",
        "change-style",
        "enhance-quality",
        "remove-background",
    }:
        extension = (
            "webm"
            if action == "remove-background"
            else "mp4"
        )

        return {
            "videoUrl": (
                f"/generated/video/"
                f"{job['id']}.{extension}"
            ),
            "sourceVideoUrl": read_clip_value(
                clip,
                "videoUrl",
                "video_url",
                "mediaUrl",
                "media_url",
            ),
            "sourceImageUrl": read_clip_value(
                clip,
                "imageUrl",
                "image_url",
            ),
            "prompt": prompt,
            "strength": job.get("strength"),
            "message": (
                f"Åtgärden {action} är klar."
            ),
        }

    raise ValueError(
        f"Unsupported AI action: {action}"
    )


_PROVIDER_HANDLERS: dict[str, AIProviderHandler] = {
    "development": development_provider,
}


def register_provider(
    name: str,
    handler: AIProviderHandler,
) -> None:
    normalized_name = name.strip().lower()

    if not normalized_name:
        raise ValueError(
            "Provider name cannot be empty"
        )

    _PROVIDER_HANDLERS[normalized_name] = handler


def resolve_provider(
    job: dict[str, Any],
) -> AIProviderHandler:
    metadata = job.get("metadata") or {}
    requested_provider = str(
        metadata.get("provider")
        or "development"
    ).strip().lower()

    handler = _PROVIDER_HANDLERS.get(
        requested_provider,
    )

    if handler is None:
        raise ValueError(
            f"Unknown AI provider: "
            f"{requested_provider}"
        )

    return handler


async def process_ai_action_job(
    job_id: str,
) -> dict[str, Any] | None:
    """
    Process one persisted AI job.

    This function is safe to call from FastAPI BackgroundTasks, an RQ
    worker, Celery, ARQ, Dramatiq, or a custom queue consumer.
    """

    ensure_generated_directories()

    job = get_ai_job(job_id)

    if job is None:
        logger.warning(
            "AI job %s was not found",
            job_id,
        )
        return None

    if job.get("status") == "completed":
        return job

    try:
        job = update_ai_job(
            job_id,
            status="processing",
            progress=10,
        )

        if job is None:
            return None

        for progress in (25, 45, 70):
            await asyncio.sleep(0.35)

            job = update_ai_job(
                job_id,
                status="processing",
                progress=progress,
            )

            if job is None:
                return None

        provider = resolve_provider(job)
        result = await provider(job)

        completed_job = update_ai_job(
            job_id,
            status="completed",
            progress=100,
            result=result,
            error="",
        )

        logger.info(
            "AI job %s completed",
            job_id,
        )

        return completed_job

    except Exception as error:
        message = (
            str(error).strip()
            or "AI processing failed"
        )

        logger.exception(
            "AI job %s failed: %s",
            job_id,
            message,
        )

        return update_ai_job(
            job_id,
            status="failed",
            progress=100,
            error=message,
        )


def process_ai_action_job_sync(
    job_id: str,
) -> dict[str, Any] | None:
    """
    Synchronous entry point for traditional worker systems.
    """

    return asyncio.run(
        process_ai_action_job(job_id)
    )