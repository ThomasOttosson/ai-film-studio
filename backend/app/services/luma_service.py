import os
import tempfile
import time
import uuid

import requests
from fastapi import HTTPException
from moviepy import AudioFileClip, VideoFileClip

from app.schemas.images import VideoRequest, VideoResponse
from app.services.backblaze_service import upload_video_to_b2


LUMA_GENERATIONS_URL = "https://agents.lumalabs.ai/v1/generations"


def download_file(url: str, suffix: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


def merge_video_with_audio(video_url: str, audio_url: str) -> bytes:
    video_path = None
    audio_path = None
    output_path = None

    try:
        video_path = download_file(video_url, ".mp4")
        audio_path = download_file(audio_url, ".mp3")
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

        video_clip = VideoFileClip(video_path)
        audio_clip = AudioFileClip(audio_path)

        final_duration = min(video_clip.duration, audio_clip.duration)

        video_clip = video_clip.subclipped(0, final_duration)
        audio_clip = audio_clip.subclipped(0, final_duration)

        final_clip = video_clip.with_audio(audio_clip)

        final_clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
        )

        video_clip.close()
        audio_clip.close()
        final_clip.close()

        with open(output_path, "rb") as file:
            return file.read()

    finally:
        for path in [video_path, audio_path, output_path]:
            if path and os.path.exists(path):
                os.remove(path)


def generate_ai_video_from_scene(request: VideoRequest) -> VideoResponse:
    api_key = os.getenv("LUMA_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Missing LUMA_API_KEY. Check backend/.env",
        )

    if not request.image_url or not request.audio_url:
        raise HTTPException(
            status_code=400,
            detail="Both image_url and audio_url are required.",
        )

    prompt = f"""
Cinematic moving film shot.

Scene title: {request.scene_title}

Animate the image naturally with cinematic camera movement, subtle subject motion,
atmospheric lighting, and professional film composition.

No text, no subtitles, no watermark.
"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "prompt": prompt,
        "model": "ray-3.2",
        "type": "video",
        "aspect_ratio": "16:9",
        "video": {
            "resolution": "540p",
            "duration": "5s",
            "start_frame": {
                "type": "image",
                "url": request.image_url,
            },
        },
    }

    try:
        create_response = requests.post(
            LUMA_GENERATIONS_URL,
            headers=headers,
            json=payload,
            timeout=60,
        )

        if not create_response.ok:
            raise HTTPException(
                status_code=create_response.status_code,
                detail=create_response.text,
            )

        generation = create_response.json()
        generation_id = generation["id"]

        for _ in range(80):
            status_response = requests.get(
                f"{LUMA_GENERATIONS_URL}/{generation_id}",
                headers=headers,
                timeout=60,
            )

            if not status_response.ok:
                raise HTTPException(
                    status_code=status_response.status_code,
                    detail=status_response.text,
                )

            generation = status_response.json()
            state = generation.get("state") or generation.get("status")

            if state in ["completed", "succeeded"]:
                output = generation.get("output", [])
                luma_video_url = None

                for item in output:
                    if item.get("type") == "video":
                        luma_video_url = item.get("url")
                        break

                if not luma_video_url:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Luma completed but no video URL was returned: {generation}",
                    )

                final_video_bytes = merge_video_with_audio(
                    video_url=luma_video_url,
                    audio_url=request.audio_url,
                )

                filename = f"{uuid.uuid4()}.mp4"
                b2_video_url = upload_video_to_b2(final_video_bytes, filename)

                return VideoResponse(
                    video_url=b2_video_url,
                    prompt=prompt,
                )

            if state in ["failed", "error"]:
                raise HTTPException(
                    status_code=500,
                    detail=f"Luma generation failed: {generation}",
                )

            time.sleep(3)

        raise HTTPException(
            status_code=504,
            detail="Luma video generation timed out.",
        )

    except HTTPException:
        raise

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate AI video with audio: {repr(error)}",
        )