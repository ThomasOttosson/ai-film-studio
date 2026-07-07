import os
import tempfile
import time
import uuid

import requests
from fastapi import HTTPException
from moviepy import AudioFileClip, VideoFileClip, concatenate_videoclips

from app.schemas.images import VideoRequest, VideoResponse
from app.services.backblaze_service import upload_image_to_b2, upload_video_to_b2


LUMA_GENERATIONS_URL = "https://agents.lumalabs.ai/v1/generations"


def download_file(url: str, suffix: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


def extract_last_frame(video_url: str) -> str:
    video_path = download_file(video_url, ".mp4")
    frame_path = tempfile.NamedTemporaryFile(delete=False, suffix=".png").name

    clip = VideoFileClip(video_path)
    clip.save_frame(frame_path, t=max(clip.duration - 0.1, 0))
    clip.close()

    if os.path.exists(video_path):
        os.remove(video_path)

    return frame_path


def upload_frame_to_b2(frame_path: str) -> str:
    with open(frame_path, "rb") as file:
        image_bytes = file.read()

    filename = f"{uuid.uuid4()}.png"
    return upload_image_to_b2(image_bytes, filename)


def create_luma_video(
    api_key: str,
    image_url: str,
    scene_title: str,
    aspect_ratio: str,
    prompt_suffix: str = "",
) -> str:
    prompt = f"""
Cinematic moving film shot.

Scene title: {scene_title}

Animate the image naturally with cinematic camera movement, subtle subject motion,
atmospheric lighting, and professional film composition.

{prompt_suffix}

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
        "aspect_ratio": aspect_ratio,
        "video": {
            "resolution": "540p",
            "duration": "5s",
            "start_frame": {
                "type": "image",
                "url": image_url,
            },
        },
    }

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
            for item in generation.get("output", []):
                if item.get("type") == "video":
                    return item.get("url")

            raise HTTPException(
                status_code=500,
                detail=f"Luma completed but no video URL was returned: {generation}",
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


def concatenate_video_urls(video_urls: list[str]) -> str:
    video_paths = []
    clips = []
    output_path = None

    try:
        for video_url in video_urls:
            video_path = download_file(video_url, ".mp4")
            video_paths.append(video_path)
            clips.append(VideoFileClip(video_path))

        final_clip = concatenate_videoclips(clips, method="compose")
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

        final_clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
        )

        final_clip.close()

        return output_path

    finally:
        for clip in clips:
            clip.close()

        for path in video_paths:
            if path and os.path.exists(path):
                os.remove(path)


def merge_video_with_audio(video_path_or_url: str, audio_url: str) -> bytes:
    audio_path = None
    output_path = None
    video_clip = None
    audio_clip = None
    final_clip = None
    downloaded_video_path = None

    try:
        if video_path_or_url.startswith("http"):
            downloaded_video_path = download_file(video_path_or_url, ".mp4")
            video_path = downloaded_video_path
        else:
            video_path = video_path_or_url

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

        with open(output_path, "rb") as file:
            return file.read()

    finally:
        for clip in [final_clip, video_clip, audio_clip]:
            if clip:
                clip.close()

        for path in [audio_path, output_path, downloaded_video_path]:
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

    try:
        first_video_url = create_luma_video(
            api_key=api_key,
            image_url=request.image_url,
            scene_title=request.scene_title,
            aspect_ratio=request.aspect_ratio,
        )

        if request.scene_length <= 5:
            final_video_bytes = merge_video_with_audio(
                video_path_or_url=first_video_url,
                audio_url=request.audio_url,
            )
        else:
            last_frame_path = extract_last_frame(first_video_url)
            last_frame_url = upload_frame_to_b2(last_frame_path)

            if os.path.exists(last_frame_path):
                os.remove(last_frame_path)

            second_video_url = create_luma_video(
                api_key=api_key,
                image_url=last_frame_url,
                scene_title=request.scene_title,
                aspect_ratio=request.aspect_ratio,
                prompt_suffix="Continue naturally from the previous shot.",
            )

            combined_video_path = concatenate_video_urls(
                [first_video_url, second_video_url]
            )

            final_video_bytes = merge_video_with_audio(
                video_path_or_url=combined_video_path,
                audio_url=request.audio_url,
            )

            if os.path.exists(combined_video_path):
                os.remove(combined_video_path)

        filename = f"{uuid.uuid4()}.mp4"
        b2_video_url = upload_video_to_b2(final_video_bytes, filename)

        return VideoResponse(
            video_url=b2_video_url,
            prompt=f"AI video generated for scene: {request.scene_title}",
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
