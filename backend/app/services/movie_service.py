import os
import tempfile
import uuid

import requests
from fastapi import HTTPException
from moviepy import VideoFileClip, concatenate_videoclips

from app.schemas.images import FullMovieRequest, FullMovieResponse
from app.services.backblaze_service import upload_video_to_b2


def download_video(url: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


def generate_full_movie(request: FullMovieRequest) -> FullMovieResponse:
    if not request.video_urls:
        raise HTTPException(
            status_code=400,
            detail="At least one scene video is required.",
        )

    video_paths = []
    clips = []
    output_path = None

    try:
        for video_url in request.video_urls:
            video_path = download_video(video_url)
            video_paths.append(video_path)

            clip = VideoFileClip(video_path)
            clips.append(clip)

        final_clip = concatenate_videoclips(clips, method="compose")

        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

        final_clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
        )

        final_clip.close()

        with open(output_path, "rb") as file:
            movie_bytes = file.read()

        filename = f"{uuid.uuid4()}.mp4"
        final_movie_url = upload_video_to_b2(movie_bytes, filename)

        return FullMovieResponse(
            final_movie_url=final_movie_url,
            title=request.title,
        )

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate full movie: {repr(error)}",
        )

    finally:
        for clip in clips:
            clip.close()

        for path in video_paths + ([output_path] if output_path else []):
            if path and os.path.exists(path):
                os.remove(path)
