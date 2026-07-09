import json
import os
import uuid
from datetime import datetime
from typing import Any

import httpx
from redis_client import redis_client

INTERNAL_API_BASE_URL = os.getenv(
    "INTERNAL_API_BASE_URL",
    "http://backend:8000",
)

QUEUE_LIST_KEY = "ai-film-studio:generation-jobs"


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def queue_key(batch_id: str) -> str:
    return f"ai-film-studio:generation-queue:{batch_id}"


def enqueue_generation_batch(batch_id: str) -> None:
    redis_client.rpush(
        QUEUE_LIST_KEY,
        json.dumps({"batch_id": batch_id}),
    )


def create_generation_batch(payload: dict[str, Any]) -> dict[str, Any]:
    batch_id = str(uuid.uuid4())
    scenes = payload.get("scenes", [])

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
        "status": "waiting",
        "cancel_requested": False,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "payload": payload,
        "steps": steps,
        "scenes": scenes,
    }

    redis_client.set(queue_key(batch_id), json.dumps(batch))
    return batch


def get_generation_batch(batch_id: str) -> dict[str, Any] | None:
    value = redis_client.get(queue_key(batch_id))

    if not value:
        return None

    return json.loads(value)


def save_generation_batch(batch: dict[str, Any]) -> None:
    batch["updatedAt"] = now_iso()
    redis_client.set(queue_key(batch["id"]), json.dumps(batch))


def request_cancel_generation_batch(batch_id: str) -> dict[str, Any] | None:
    batch = get_generation_batch(batch_id)

    if not batch:
        return None

    batch["cancel_requested"] = True

    if batch["status"] in ["waiting", "running"]:
        batch["status"] = "cancel_requested"

    save_generation_batch(batch)

    return batch


def is_batch_cancelled(batch: dict[str, Any]) -> bool:
    return bool(batch.get("cancel_requested"))


def mark_batch_cancelled(batch: dict[str, Any]) -> None:
    batch["status"] = "cancelled"

    for step in batch["steps"]:
        if step["status"] in ["waiting", "running"]:
            step["status"] = "cancelled"

    save_generation_batch(batch)


def update_step(
    batch: dict[str, Any],
    step_id: str,
    status: str,
    error: str | None = None,
) -> None:
    for step in batch["steps"]:
        if step["id"] == step_id:
            step["status"] = status

            if error:
                step["error"] = error
            elif "error" in step:
                step.pop("error", None)

            break

    save_generation_batch(batch)


def update_scene(batch: dict[str, Any], scene_id: int, updates: dict[str, Any]) -> None:
    batch["scenes"] = [
        {
            **scene,
            **updates,
        }
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

    batch["status"] = "running"
    save_generation_batch(batch)

    payload = batch["payload"]
    style = payload.get("style", "Cinematic")
    aspect_ratio = payload.get("aspectRatio", "16:9")
    scene_length = payload.get("sceneLength", 5)

    async with httpx.AsyncClient(timeout=300) as client:
        for step in batch["steps"]:
            batch = get_generation_batch(batch_id) or batch

            if is_batch_cancelled(batch):
                mark_batch_cancelled(batch)
                return

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
                    response = await client.post(
                        f"{INTERNAL_API_BASE_URL}/api/generate-image",
                        json={
                            "scene_title": scene["title"],
                            "narration": scene["narration"],
                            "mood": scene["mood"],
                            "style": style,
                        },
                    )

                    response.raise_for_status()
                    result = response.json()

                    batch = get_generation_batch(batch_id) or batch

                    if is_batch_cancelled(batch):
                        mark_batch_cancelled(batch)
                        return

                    update_scene(
                        batch,
                        scene["id"],
                        {
                            "imageUrl": result["image_url"],
                            "imagePrompt": result.get("prompt", ""),
                        },
                    )

                if step["type"] == "audio":
                    response = await client.post(
                        f"{INTERNAL_API_BASE_URL}/api/generate-audio",
                        json={
                            "scene_title": scene["title"],
                            "narration": scene["narration"],
                            "voice": "alloy",
                        },
                    )

                    response.raise_for_status()
                    result = response.json()

                    batch = get_generation_batch(batch_id) or batch

                    if is_batch_cancelled(batch):
                        mark_batch_cancelled(batch)
                        return

                    update_scene(
                        batch,
                        scene["id"],
                        {
                            "audioUrl": result["audio_url"],
                            "audioPrompt": result.get("prompt", ""),
                        },
                    )

                if step["type"] == "video":
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

                    response = await client.post(
                        f"{INTERNAL_API_BASE_URL}/api/generate-video",
                        json={
                            "scene_title": fresh_scene["title"],
                            "image_url": fresh_scene["imageUrl"],
                            "audio_url": fresh_scene["audioUrl"],
                            "scene_length": scene_length,
                            "aspect_ratio": aspect_ratio,
                        },
                    )

                    response.raise_for_status()
                    result = response.json()

                    batch = get_generation_batch(batch_id) or fresh_batch

                    if is_batch_cancelled(batch):
                        mark_batch_cancelled(batch)
                        return

                    update_scene(
                        batch,
                        scene["id"],
                        {
                            "videoUrl": result["video_url"],
                            "videoPrompt": result.get("prompt", ""),
                        },
                    )

                batch = get_generation_batch(batch_id) or batch
                update_step(batch, step["id"], "done")

            except Exception as error:
                batch = get_generation_batch(batch_id) or batch
                update_step(batch, step["id"], "failed", str(error))

    batch = get_generation_batch(batch_id)

    if not batch:
        return

    if is_batch_cancelled(batch):
        mark_batch_cancelled(batch)
        return

    has_failed_steps = any(step["status"] == "failed" for step in batch["steps"])
    batch["status"] = "completed_with_errors" if has_failed_steps else "completed"
    save_generation_batch(batch)