import os
import uuid

from fastapi import HTTPException

from app.schemas.images import MusicRequest, MusicResponse
from app.services.asset_service import record_generation_isolated
from app.services.backblaze_service import upload_audio_to_b2
from app.services.genblaze_service import (
    GenblazeGenerationError,
    generate_music,
    music_provider_env_var,
)


def generate_project_music(request: MusicRequest) -> MusicResponse:
    env_var = music_provider_env_var()
    if not os.getenv(env_var):
        raise HTTPException(
            status_code=500,
            detail=f"Missing {env_var}. Check backend/.env",
        )

    if not request.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail="A music prompt is required.",
        )

    try:
        audio_bytes, provider, model, manifest_sha, ext = generate_music(
            request.prompt,
            request.duration_seconds,
        )

        if request.project_id:
            version = record_generation_isolated(
                project_id=request.project_id,
                scene_id=None,
                asset_type="music",
                provider=provider,
                model=model,
                prompt=request.prompt,
                file_bytes=audio_bytes,
                ext=ext,
                duration_seconds=float(request.duration_seconds),
                manifest_sha=manifest_sha,
            )
            music_url = version.b2_url
        else:
            filename = f"{uuid.uuid4()}.{ext}"
            music_url = upload_audio_to_b2(audio_bytes, filename)

        return MusicResponse(music_url=music_url, prompt=request.prompt)

    except HTTPException:
        raise

    except GenblazeGenerationError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.detail,
        )

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate music: {repr(error)}",
        )
