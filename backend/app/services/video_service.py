import os
import tempfile
import uuid

import requests
from fastapi import HTTPException
from moviepy import AudioFileClip, ImageClip

from app.schemas.images import VideoRequest, VideoResponse
from app.services.backblaze_service import upload_video_to_b2


def download_file(url: str, suffix: str) -> str:
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp_file.write(response.content)
        temp_file.close()

        return temp_file.name

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {repr(error)}",
        )


def generate_video_from_scene(request: VideoRequest) -> VideoResponse:
    image_path = None
    audio_path = None
    output_path = None

    try:
        image_path = download_file(request.image_url, ".png")
        audio_path = download_file(request.audio_url, ".mp3")

        audio_clip = AudioFileClip(audio_path)
        image_clip = ImageClip(image_path).with_duration(audio_clip.duration)
        image_clip = image_clip.with_audio(audio_clip)

        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

        image_clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
        )

        with open(output_path, "rb") as video_file:
            video_bytes = video_file.read()

        filename = f"{uuid.uuid4()}.mp4"
        video_url = upload_video_to_b2(video_bytes, filename)

        return VideoResponse(
            video_url=video_url,
            prompt=f"Video generated from scene: {request.scene_title}",
        )

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate video: {repr(error)}",
        )

    finally:
        for path in [image_path, audio_path, output_path]:
            if path and os.path.exists(path):
                os.remove(path)
