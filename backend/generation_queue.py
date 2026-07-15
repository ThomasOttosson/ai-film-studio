import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.schemas.generation_queue import StartGenerationQueueRequest
from app.schemas.images import AudioRequest, ImageRequest, VideoRequest
from app.services.luma_service import generate_ai_video_from_scene
from app.services.openai_service import generate_audio_with_ai, generate_image_with_ai
from redis_client import redis_client

QUEUE_LIST_KEY = "ai-film-studio:generation-jobs"
EVENT_CHANNEL = "ai-film-studio:events"

DEFAULT_STEP_ESTIMATES_SECONDS = {
    "image": 20.0,
    "audio": 12.0,
    "video": 90.0,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def queue_key(batch_id: str) -> str:
    return f"ai-film-studio:generation-queue:{batch_id}"


def enqueue_generation_batch(batch_id: str) -> None:
    redis_client.rpush(
        QUEUE_LIST_KEY,
        json.dumps({"batch_id": batch_id}),
    )


def publish_batch_update(batch: dict[str, Any]) -> None:
    redis_client.publish(
        EVENT_CHANNEL,
        json.dumps(
            {
                "event": "batch_updated",
                "batch_id": batch["id"],
                "batch": batch,
            }
        ),
    )


def completed_step_durations(batch: dict[str, Any], step_type: str) -> list[float]:
    durations: list[float] = []

    for step in batch.get("steps", []):
        if step.get("type") != step_type:
            continue

        duration = step.get("durationSeconds")

        if isinstance(duration, (int, float)) and duration > 0:
            durations.append(float(duration))

    return durations


def estimated_step_seconds(batch: dict[str, Any], step_type: str) -> float:
    durations = completed_step_durations(batch, step_type)

    if durations:
        return sum(durations) / len(durations)

    return DEFAULT_STEP_ESTIMATES_SECONDS.get(step_type, 30.0)


def update_batch_metrics(batch: dict[str, Any]) -> None:
    steps = batch.get("steps", [])
    total_steps = len(steps)
    completed_steps = sum(step.get("status") == "done" for step in steps)
    failed_steps = sum(step.get("status") == "failed" for step in steps)
    cancelled_steps = sum(step.get("status") == "cancelled" for step in steps)
    running_step = next(
        (step for step in steps if step.get("status") == "running"),
        None,
    )

    progress_percent = (
        round((completed_steps / total_steps) * 100)
        if total_steps > 0
        else 0
    )

    remaining_seconds = 0.0
    now = datetime.now(timezone.utc)

    for step in steps:
        status = step.get("status")

        if status in {"done", "failed", "cancelled"}:
            continue

        estimate = estimated_step_seconds(batch, str(step.get("type", "")))

        if status == "running":
            started_at = parse_iso(step.get("startedAt"))
            elapsed = max((now - started_at).total_seconds(), 0.0) if started_at else 0.0
            remaining_seconds += max(estimate - elapsed, 1.0)
        else:
            remaining_seconds += estimate

    batch["totalSteps"] = total_steps
    batch["completedSteps"] = completed_steps
    batch["failedSteps"] = failed_steps
    batch["cancelledSteps"] = cancelled_steps
    batch["progressPercent"] = progress_percent
    batch["estimatedRemainingSeconds"] = round(remaining_seconds)
    batch["currentStep"] = running_step


def create_generation_batch(
    request: StartGenerationQueueRequest,
    user_id: int,
    project_id: str,
) -> dict[str, Any]:
    batch_id = str(uuid.uuid4())
    payload = request.model_dump()
    scenes = payload["scenes"]
    steps = []

    for scene in scenes:
        scene_id = scene["id"]
        scene_title = scene.get("title", "Untitled Scene")

        if not scene.get("imageUrl"):
            steps.append({
                "id": f"{scene_id}-image",
                "sceneId": scene_id,
                "sceneTitle": scene_title,
                "type": "image",
                "status": "waiting",
            })

        if not scene.get("audioUrl"):
            steps.append({
                "id": f"{scene_id}-audio",
                "sceneId": scene_id,
                "sceneTitle": scene_title,
                "type": "audio",
                "status": "waiting",
            })

        if not scene.get("videoUrl"):
            steps.append({
                "id": f"{scene_id}-video",
                "sceneId": scene_id,
                "sceneTitle": scene_title,
                "type": "video",
                "status": "waiting",
            })

    batch = {
        "id": batch_id,
        "userId": user_id,
        "projectId": project_id,
        "status": "waiting",
        "cancel_requested": False,
        "pause_requested": False,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "startedAt": None,
        "completedAt": None,
        "payload": payload,
        "steps": steps,
        "scenes": scenes,
    }

    save_generation_batch(batch)
    return batch


def get_generation_batch(batch_id: str) -> dict[str, Any] | None:
    value = redis_client.get(queue_key(batch_id))

    if not value:
        return None

    batch = json.loads(value)
    update_batch_metrics(batch)
    return batch


def save_generation_batch(batch: dict[str, Any]) -> None:
    batch["updatedAt"] = now_iso()
    update_batch_metrics(batch)

    redis_client.set(
        queue_key(batch["id"]),
        json.dumps(batch),
    )

    publish_batch_update(batch)


def request_cancel_generation_batch(batch_id: str) -> dict[str, Any] | None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return None

    batch["cancel_requested"] = True
    batch["pause_requested"] = False

    if batch["status"] in ["waiting", "running", "paused", "pause_requested"]:
        batch["status"] = "cancel_requested"

    save_generation_batch(batch)
    return batch


def request_pause_generation_batch(batch_id: str) -> dict[str, Any] | None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return None

    if batch["status"] not in {"waiting", "running", "pause_requested"}:
        return batch

    batch["pause_requested"] = True
    batch["status"] = "pause_requested"
    save_generation_batch(batch)
    return batch


def resume_generation_batch(batch_id: str) -> dict[str, Any] | None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return None

    if batch["status"] != "paused":
        return batch

    batch["pause_requested"] = False
    batch["status"] = "waiting"
    save_generation_batch(batch)
    enqueue_generation_batch(batch["id"])
    return batch


def is_batch_cancelled(batch: dict[str, Any]) -> bool:
    return bool(batch.get("cancel_requested"))


def is_batch_pause_requested(batch: dict[str, Any]) -> bool:
    return bool(batch.get("pause_requested"))


def mark_batch_cancelled(batch: dict[str, Any]) -> None:
    batch["status"] = "cancelled"
    batch["completedAt"] = now_iso()

    for step in batch["steps"]:
        if step["status"] in ["waiting", "running"]:
            step["status"] = "cancelled"
            step["completedAt"] = now_iso()

    save_generation_batch(batch)


def mark_batch_paused(batch: dict[str, Any]) -> None:
    batch["status"] = "paused"
    batch["pause_requested"] = True
    save_generation_batch(batch)


def update_step(
    batch: dict[str, Any],
    step_id: str,
    status: str,
    error: str | None = None,
) -> None:
    for step in batch["steps"]:
        if step["id"] != step_id:
            continue

        previous_status = step.get("status")
        step["status"] = status

        if status == "running" and previous_status != "running":
            step["startedAt"] = now_iso()
            step.pop("completedAt", None)
            step.pop("durationSeconds", None)

        if status in {"done", "failed", "cancelled"}:
            completed_at = now_iso()
            step["completedAt"] = completed_at
            started_at = parse_iso(step.get("startedAt"))
            finished_at = parse_iso(completed_at)

            if started_at and finished_at:
                step["durationSeconds"] = round(
                    max((finished_at - started_at).total_seconds(), 0.0),
                    2,
                )

        if error:
            step["error"] = error
        elif "error" in step:
            step.pop("error", None)

        break

    save_generation_batch(batch)


def update_scene(
    batch: dict[str, Any],
    scene_id: int,
    updates: dict[str, Any],
) -> None:
    batch["scenes"] = [
        {**scene, **updates}
        if scene["id"] == scene_id
        else scene
        for scene in batch["scenes"]
    ]

    save_generation_batch(batch)


async def process_generation_batch(batch_id: str) -> None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return

    if is_batch_cancelled(batch):
        mark_batch_cancelled(batch)
        return

    if is_batch_pause_requested(batch):
        mark_batch_paused(batch)
        return

    batch["status"] = "running"
    batch["startedAt"] = batch.get("startedAt") or now_iso()
    save_generation_batch(batch)

    payload = batch["payload"]
    style = payload.get("style", "Cinematic")
    aspect_ratio = payload.get("aspectRatio", "16:9")
    scene_length = payload.get("sceneLength", 5)

    for original_step in batch["steps"]:
        batch = get_generation_batch(batch_id) or batch

        if is_batch_cancelled(batch):
            mark_batch_cancelled(batch)
            return

        if is_batch_pause_requested(batch):
            mark_batch_paused(batch)
            return

        step = next(
            (candidate for candidate in batch["steps"] if candidate["id"] == original_step["id"]),
            original_step,
        )

        if step.get("status") in {"done", "failed", "cancelled"}:
            continue

        update_step(batch, step["id"], "running")

        scene = next(
            (
                current_scene
                for current_scene in batch["scenes"]
                if current_scene["id"] == step["sceneId"]
            ),
            None,
        )

        if not scene:
            update_step(batch, step["id"], "failed", "Scene not found.")
            continue

        try:
            if step["type"] == "image":
                result = await asyncio.to_thread(
                    generate_image_with_ai,
                    ImageRequest(
                        scene_title=scene["title"],
                        narration=scene["narration"],
                        mood=scene["mood"],
                        style=style,
                    ),
                )

                batch = get_generation_batch(batch_id) or batch

                if is_batch_cancelled(batch):
                    mark_batch_cancelled(batch)
                    return

                update_scene(
                    batch,
                    scene["id"],
                    {
                        "imageUrl": result.image_url,
                        "imagePrompt": result.prompt,
                    },
                )

            elif step["type"] == "audio":
                result = await asyncio.to_thread(
                    generate_audio_with_ai,
                    AudioRequest(
                        scene_title=scene["title"],
                        narration=scene["narration"],
                        voice="alloy",
                    ),
                )

                batch = get_generation_batch(batch_id) or batch

                if is_batch_cancelled(batch):
                    mark_batch_cancelled(batch)
                    return

                update_scene(
                    batch,
                    scene["id"],
                    {
                        "audioUrl": result.audio_url,
                        "audioPrompt": result.prompt,
                    },
                )

            elif step["type"] == "video":
                fresh_batch = get_generation_batch(batch_id) or batch

                if is_batch_cancelled(fresh_batch):
                    mark_batch_cancelled(fresh_batch)
                    return

                fresh_scene = next(
                    (
                        current_scene
                        for current_scene in fresh_batch["scenes"]
                        if current_scene["id"] == scene["id"]
                    ),
                    None,
                )

                if (
                    not fresh_scene
                    or not fresh_scene.get("imageUrl")
                    or not fresh_scene.get("audioUrl")
                ):
                    update_step(
                        fresh_batch,
                        step["id"],
                        "failed",
                        "Image and audio are required before video.",
                    )
                    continue

                result = await asyncio.to_thread(
                    generate_ai_video_from_scene,
                    VideoRequest(
                        scene_title=fresh_scene["title"],
                        image_url=fresh_scene["imageUrl"],
                        audio_url=fresh_scene["audioUrl"],
                        scene_length=scene_length,
                        aspect_ratio=aspect_ratio,
                    ),
                )

                batch = get_generation_batch(batch_id) or fresh_batch

                if is_batch_cancelled(batch):
                    mark_batch_cancelled(batch)
                    return

                update_scene(
                    batch,
                    scene["id"],
                    {
                        "videoUrl": result.video_url,
                        "videoPrompt": result.prompt,
                    },
                )

            batch = get_generation_batch(batch_id) or batch
            update_step(batch, step["id"], "done")

            batch = get_generation_batch(batch_id) or batch

            if is_batch_pause_requested(batch):
                mark_batch_paused(batch)
                return

        except Exception as error:
            batch = get_generation_batch(batch_id) or batch
            update_step(batch, step["id"], "failed", str(error))

            batch = get_generation_batch(batch_id) or batch

            if is_batch_pause_requested(batch):
                mark_batch_paused(batch)
                return

    batch = get_generation_batch(batch_id)

    if not batch:
        return

    if is_batch_cancelled(batch):
        mark_batch_cancelled(batch)
        return

    if is_batch_pause_requested(batch):
        mark_batch_paused(batch)
        return

    has_failed_steps = any(
        step["status"] == "failed"
        for step in batch["steps"]
    )

    batch["status"] = "completed_with_errors" if has_failed_steps else "completed"
    batch["completedAt"] = now_iso()
    save_generation_batch(batch)


def retry_failed_generation_batch(batch_id: str) -> dict[str, Any] | None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return None

    failed_steps = []

    for step in batch["steps"]:
        if step["status"] == "failed":
            retry_step = {
                **step,
                "status": "waiting",
            }
            retry_step.pop("error", None)
            retry_step.pop("startedAt", None)
            retry_step.pop("completedAt", None)
            retry_step.pop("durationSeconds", None)
            failed_steps.append(retry_step)

    if not failed_steps:
        return batch

    batch["steps"] = failed_steps
    batch["status"] = "waiting"
    batch["cancel_requested"] = False
    batch["pause_requested"] = False
    batch["startedAt"] = None
    batch["completedAt"] = None

    save_generation_batch(batch)
    enqueue_generation_batch(batch["id"])
    return batch