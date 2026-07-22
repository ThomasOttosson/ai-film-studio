import os
import tempfile
import uuid

import requests
from fastapi import HTTPException
from moviepy import (
    AudioFileClip,
    CompositeAudioClip,
    VideoFileClip,
    concatenate_videoclips,
)
from moviepy.audio.fx import AudioFadeOut, AudioLoop, MultiplyVolume

from app.schemas.images import FullMovieRequest, FullMovieResponse
from app.services.asset_service import record_generation_isolated
from app.services.backblaze_service import upload_video_to_b2

# ~-14 dB duck when scene narration is present; a bit louder when music is
# the only audio track.
_DUCKED_GAIN = 0.2
_SOLO_GAIN = 0.8


def download_video(url: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


def download_audio(url: str) -> str:
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    suffix = ".wav" if url.split("?")[0].lower().endswith(".wav") else ".mp3"
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


def mix_music_under_video(final_clip, music_path: str):
    """Loop/trim music to the video length, duck it, fade out, and mix.

    Returns (clip_with_music, [audio_clips_to_close]).
    """
    target = final_clip.duration
    music_clip = AudioFileClip(music_path)
    has_scene_audio = final_clip.audio is not None
    gain = _DUCKED_GAIN if has_scene_audio else _SOLO_GAIN

    music_track = music_clip.with_effects([
        AudioLoop(duration=target),
        MultiplyVolume(gain),
        AudioFadeOut(min(2.0, target)),
    ])

    opened = [music_clip, music_track]

    if has_scene_audio:
        mixed = CompositeAudioClip([final_clip.audio, music_track])
        opened.append(mixed)
        return final_clip.with_audio(mixed), opened

    return final_clip.with_audio(music_track), opened


def generate_full_movie(request: FullMovieRequest) -> FullMovieResponse:
    if not request.video_urls:
        raise HTTPException(
            status_code=400,
            detail="At least one scene video is required.",
        )

    video_paths = []
    clips = []
    audio_clips = []
    music_path = None
    output_path = None

    try:
        for video_url in request.video_urls:
            video_path = download_video(video_url)
            video_paths.append(video_path)

            clip = VideoFileClip(video_path)
            clips.append(clip)

        final_clip = concatenate_videoclips(clips, method="compose")

        if request.music_url:
            music_path = download_audio(request.music_url)
            final_clip, audio_clips = mix_music_under_video(
                final_clip, music_path
            )

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

        if request.project_id:
            version = record_generation_isolated(
                project_id=request.project_id,
                scene_id=None,
                asset_type="movie",
                provider="moviepy",
                model="concatenate_videoclips",
                prompt=f"Final movie: {request.title}",
                file_bytes=movie_bytes,
                ext="mp4",
            )
            final_movie_url = version.b2_url
        else:
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
        for clip in audio_clips:
            try:
                clip.close()
            except Exception:
                pass

        for clip in clips:
            clip.close()

        cleanup_paths = video_paths + [
            path for path in (music_path, output_path) if path
        ]
        for path in cleanup_paths:
            if path and os.path.exists(path):
                os.remove(path)
