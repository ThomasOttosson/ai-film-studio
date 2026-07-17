from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator


router = APIRouter(
    prefix="/api/ai/actions",
    tags=["AI Actions"],
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIActionType(str, Enum):
    EXTEND_SCENE = "extend-scene"
    CINEMATIC_MOTION = "cinematic-motion"
    REMOVE_BACKGROUND = "remove-background"
    CHANGE_STYLE = "change-style"
    ENHANCE_QUALITY = "enhance-quality"
    GENERATE_VOICEOVER = "generate-voiceover"
    CLEAN_AUDIO = "clean-audio"
    REWRITE_NARRATION = "rewrite-narration"


class AIJobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIClipPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str | None = None
    prompt: str | None = None
    narration: str | None = None
    mediaUrl: str | None = None
    imageUrl: str | None = None
    videoUrl: str | None = None
    audioUrl: str | None = None
    duration: float | None = None
    startTime: float | None = None
    type: str | None = None


class CreateAIActionRequest(BaseModel):
    action: AIActionType
    clip_id: str = Field(min_length=1)
    clip: AIClipPayload
    prompt: str | None = None
    strength: float | None = Field(default=None, ge=0, le=1)
    project_id: str | None = None
    metadata: dict[str, Any] | None = None

    @field_validator("clip_id")
    @classmethod
    def normalize_clip_id(cls, value: str) -> str:
        normalized = value.strip()

        if not normalized:
            raise ValueError("clip_id cannot be empty")

        return normalized

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None


class AIActionJobResponse(BaseModel):
    id: str
    status: AIJobStatus
    action: AIActionType
    clipId: str
    progress: int = Field(ge=0, le=100)
    result: dict[str, Any] | None = None
    error: str | None = None
    createdAt: datetime
    updatedAt: datetime


class StoredAIJob(BaseModel):
    id: str
    status: AIJobStatus
    action: AIActionType
    clip_id: str
    clip: AIClipPayload
    prompt: str | None
    strength: float | None
    project_id: str | None
    metadata: dict[str, Any]
    progress: int
    result: dict[str, Any] | None
    error: str | None
    created_at: datetime
    updated_at: datetime

    def to_response(self) -> AIActionJobResponse:
        return AIActionJobResponse(
            id=self.id,
            status=self.status,
            action=self.action,
            clipId=self.clip_id,
            progress=self.progress,
            result=self.result,
            error=self.error,
            createdAt=self.created_at,
            updatedAt=self.updated_at,
        )


# In-memory storage is suitable for local development.
# Replace this with Redis/PostgreSQL before running multiple backend workers.
_JOBS: dict[str, StoredAIJob] = {}
_JOBS_LOCK = asyncio.Lock()


async def save_job(job: StoredAIJob) -> None:
    async with _JOBS_LOCK:
        _JOBS[job.id] = job


async def get_stored_job(job_id: str) -> StoredAIJob | None:
    async with _JOBS_LOCK:
        job = _JOBS.get(job_id)

        if job is None:
            return None

        return job.model_copy(deep=True)


async def update_job(
    job_id: str,
    *,
    status: AIJobStatus | None = None,
    progress: int | None = None,
    result: dict[str, Any] | None = None,
    error: str | None = None,
) -> StoredAIJob:
    async with _JOBS_LOCK:
        job = _JOBS.get(job_id)

        if job is None:
            raise KeyError(job_id)

        if status is not None:
            job.status = status

        if progress is not None:
            job.progress = max(0, min(100, progress))

        if result is not None:
            job.result = result

        if error is not None:
            job.error = error

        job.updated_at = utc_now()
        _JOBS[job_id] = job

        return job.model_copy(deep=True)


async def simulate_provider_request(job: StoredAIJob) -> dict[str, Any]:
    """
    Development provider.

    Replace this function with integrations for Replicate, Runway,
    ElevenLabs, OpenAI, Stability AI, local ComfyUI, or another provider.
    """

    await asyncio.sleep(0.8)

    clip = job.clip
    prompt = job.prompt or clip.prompt or clip.narration or ""

    if job.action == AIActionType.REWRITE_NARRATION:
        original = clip.narration or prompt or "Narration saknas."
        return {
            "narration": (
                f"{original.strip()} "
                "Scenen har skrivits om med tydligare rytm och filmiskt språk."
            ),
            "message": "Narrationen har skrivits om.",
        }

    if job.action == AIActionType.EXTEND_SCENE:
        current_duration = clip.duration or 5
        extension = max(1.0, round(current_duration * 0.35, 1))

        return {
            "duration": round(current_duration + extension, 1),
            "message": f"Scenen förlängdes med {extension} sekunder.",
        }

    if job.action == AIActionType.GENERATE_VOICEOVER:
        return {
            "audio_url": (
                f"/generated/audio/{job.id}.mp3"
            ),
            "message": "Voice-over har genererats.",
        }

    if job.action == AIActionType.CLEAN_AUDIO:
        source = clip.audioUrl or clip.mediaUrl

        return {
            "audio_url": (
                f"/generated/audio/{job.id}-cleaned.mp3"
            ),
            "source_audio_url": source,
            "message": "Ljudet har rensats.",
        }

    if job.action in {
        AIActionType.CINEMATIC_MOTION,
        AIActionType.CHANGE_STYLE,
        AIActionType.ENHANCE_QUALITY,
        AIActionType.REMOVE_BACKGROUND,
    }:
        extension = "webm" if job.action == AIActionType.REMOVE_BACKGROUND else "mp4"

        return {
            "video_url": (
                f"/generated/video/{job.id}.{extension}"
            ),
            "source_video_url": clip.videoUrl or clip.mediaUrl,
            "source_image_url": clip.imageUrl,
            "prompt": prompt,
            "strength": job.strength,
            "message": f"Åtgärden {job.action.value} är klar.",
        }

    raise ValueError(f"Unsupported AI action: {job.action.value}")


async def process_ai_job(job_id: str) -> None:
    try:
        job = await update_job(
            job_id,
            status=AIJobStatus.PROCESSING,
            progress=10,
        )

        for progress in (25, 45, 70):
            await asyncio.sleep(0.35)
            job = await update_job(
                job_id,
                status=AIJobStatus.PROCESSING,
                progress=progress,
            )

        result = await simulate_provider_request(job)

        await update_job(
            job_id,
            status=AIJobStatus.COMPLETED,
            progress=100,
            result=result,
        )
    except Exception as exc:
        error_message = str(exc).strip() or "AI processing failed."

        try:
            await update_job(
                job_id,
                status=AIJobStatus.FAILED,
                progress=100,
                error=error_message,
            )
        except KeyError:
            return


@router.post(
    "",
    response_model=AIActionJobResponse,
    status_code=202,
)
async def create_ai_action(
    request: CreateAIActionRequest,
    background_tasks: BackgroundTasks,
) -> AIActionJobResponse:
    if request.clip.id != request.clip_id:
        raise HTTPException(
            status_code=422,
            detail="clip.id and clip_id must match.",
        )

    now = utc_now()
    job = StoredAIJob(
        id=str(uuid4()),
        status=AIJobStatus.QUEUED,
        action=request.action,
        clip_id=request.clip_id,
        clip=request.clip,
        prompt=request.prompt,
        strength=request.strength,
        project_id=request.project_id,
        metadata=request.metadata or {},
        progress=0,
        result=None,
        error=None,
        created_at=now,
        updated_at=now,
    )

    await save_job(job)
    background_tasks.add_task(process_ai_job, job.id)

    return job.to_response()


@router.get(
    "/{job_id}",
    response_model=AIActionJobResponse,
)
async def get_ai_action(job_id: str) -> AIActionJobResponse:
    job = await get_stored_job(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="AI job not found.",
        )

    return job.to_response()


@router.get(
    "",
    response_model=list[AIActionJobResponse],
)
async def list_ai_actions(
    project_id: str | None = None,
    clip_id: str | None = None,
    limit: int = 50,
) -> list[AIActionJobResponse]:
    safe_limit = max(1, min(limit, 200))

    async with _JOBS_LOCK:
        jobs = [
            job.model_copy(deep=True)
            for job in _JOBS.values()
        ]

    if project_id is not None:
        jobs = [
            job
            for job in jobs
            if job.project_id == project_id
        ]

    if clip_id is not None:
        jobs = [
            job for job in jobs if job.clip_id == clip_id
        ]

    jobs.sort(
        key=lambda job: job.created_at,
        reverse=True,
    )

    return [
        job.to_response()
        for job in jobs[:safe_limit]
    ]


@router.delete(
    "/{job_id}",
    status_code=204,
)
async def delete_ai_action(job_id: str) -> None:
    async with _JOBS_LOCK:
        if job_id not in _JOBS:
            raise HTTPException(
                status_code=404,
                detail="AI job not found.",
            )

        del _JOBS[job_id]


@router.get("/health/provider")
async def ai_provider_health() -> dict[str, Any]:
    return {
        "status": "ok",
        "provider": os.getenv(
            "AI_ACTION_PROVIDER",
            "development-simulator",
        ),
        "timestamp": utc_now(),
    }
