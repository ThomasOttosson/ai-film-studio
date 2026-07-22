import json
import os
import uuid
from typing import List

from fastapi import HTTPException
from openai import OpenAI

from app.schemas.images import AudioRequest, AudioResponse, ImageRequest, ImageResponse
from app.schemas.storyboard import Scene, StoryboardRequest
from app.services.asset_service import record_generation_isolated
from app.services.backblaze_service import upload_audio_to_b2, upload_image_to_b2
from app.services.genblaze_service import (
    GenblazeGenerationError,
    generate_image as genblaze_generate_image,
)

_client: OpenAI | None = None


def get_client() -> OpenAI:
    """Lazily construct the OpenAI client.

    Constructing OpenAI() at import time raises when OPENAI_API_KEY is unset,
    which prevents the app from even importing. Deferring construction to first
    use lets `import main` succeed without a key; a clear error is only raised
    when generation is actually attempted.
    """
    global _client

    if _client is None:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="Missing OPENAI_API_KEY. Check backend/.env",
            )

        _client = OpenAI()

    return _client


def generate_storyboard_with_ai(request: StoryboardRequest) -> List[Scene]:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="Missing OPENAI_API_KEY. Check backend/.env",
        )

    max_words = 12 if request.scene_length <= 5 else 24

    prompt = f"""
Create a cinematic storyboard for an AI-generated short film.

Movie title: {request.title}
Movie idea: {request.idea}
Genre: {request.genre}
Style: {request.style}
Number of scenes: {request.scene_count}

Important timing rules:
- Each scene is exactly {request.scene_length} seconds long.
- Narration must fit naturally inside {request.scene_length} seconds.
- Narration must be maximum {max_words} words per scene.
- Use short, visual, cinematic narration.
- Do not write long paragraphs.

Return ONLY valid JSON.
Return an object with this exact structure:

{{
  "scenes": [
    {{
      "id": 1,
      "title": "Scene title",
      "narration": "Short cinematic narration.",
      "mood": "Scene mood",
      "duration": "{request.scene_length}s"
    }}
  ]
}}
"""

    try:
        response = get_client().chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"You are an expert film director. Create short {request.scene_length}-second cinematic scenes and always return valid JSON.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.8,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError("OpenAI returned empty content")

        data = json.loads(content)

        return data["scenes"]

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate storyboard: {repr(error)}",
        )


def generate_image_with_ai(request: ImageRequest) -> ImageResponse:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="Missing OPENAI_API_KEY. Check backend/.env",
        )

    image_prompt = f"""
Create a cinematic film still.

Scene title: {request.scene_title}
Scene narration: {request.narration}
Mood: {request.mood}
Visual style: {request.style}

Make it look like a high-quality movie frame.
No text, no subtitles, no watermark.
"""

    try:
        # Image generation is orchestrated through Genblaze (OpenAI
        # gpt-image-1 adapter); content-filter/quota errors surface as 4xx.
        image_bytes, provider, model, manifest_sha = genblaze_generate_image(
            image_prompt
        )

        if request.project_id:
            version = record_generation_isolated(
                project_id=request.project_id,
                scene_id=request.scene_id,
                asset_type="image",
                provider=provider,
                model=model,
                prompt=image_prompt,
                file_bytes=image_bytes,
                ext="png",
                manifest_sha=manifest_sha,
            )
            image_url = version.b2_url
        else:
            filename = f"{uuid.uuid4()}.png"
            image_url = upload_image_to_b2(image_bytes, filename)

        return ImageResponse(
            image_url=image_url,
            prompt=image_prompt,
        )

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
            detail=f"Failed to generate image: {repr(error)}",
        )


def generate_audio_with_ai(request: AudioRequest) -> AudioResponse:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="Missing OPENAI_API_KEY. Check backend/.env",
        )

    try:
        response = get_client().audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=request.voice,
            input=request.narration,
            response_format="mp3",
        )

        audio_bytes = response.read()

        if request.project_id:
            version = record_generation_isolated(
                project_id=request.project_id,
                scene_id=request.scene_id,
                asset_type="audio",
                provider="openai",
                model="gpt-4o-mini-tts",
                prompt=request.narration,
                file_bytes=audio_bytes,
                ext="mp3",
            )
            audio_url = version.b2_url
        else:
            filename = f"{uuid.uuid4()}.mp3"
            audio_url = upload_audio_to_b2(audio_bytes, filename)

        return AudioResponse(
            audio_url=audio_url,
            prompt=request.narration,
        )

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate audio: {repr(error)}",
        )
