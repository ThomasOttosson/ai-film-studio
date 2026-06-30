import base64
import json
import os
import uuid
from typing import List

from fastapi import HTTPException
from openai import OpenAI

from app.schemas.images import ImageRequest, ImageResponse
from app.schemas.storyboard import Scene, StoryboardRequest
from app.services.backblaze_service import upload_image_to_b2

client = OpenAI()


def generate_storyboard_with_ai(request: StoryboardRequest) -> List[Scene]:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="Missing OPENAI_API_KEY. Check backend/.env",
        )

    prompt = f"""
Create a cinematic storyboard for an AI-generated short film.

Movie title: {request.title}
Movie idea: {request.idea}
Genre: {request.genre}
Style: {request.style}
Number of scenes: {request.scene_count}

Return ONLY valid JSON.
Return an object with this exact structure:

{{
  "scenes": [
    {{
      "id": 1,
      "title": "Scene title",
      "narration": "Scene narration",
      "mood": "Scene mood",
      "duration": "8 sec"
    }}
  ]
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert film director and storyboard writer. Always return valid JSON.",
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
        response = client.images.generate(
            model="gpt-image-1",
            prompt=image_prompt,
            size="1024x1024",
            quality="medium",
        )

        image_base64 = response.data[0].b64_json

        if not image_base64:
            raise HTTPException(status_code=500, detail="No image returned")

        image_bytes = base64.b64decode(image_base64)
        filename = f"{uuid.uuid4()}.png"
        image_url = upload_image_to_b2(image_bytes, filename)

        return ImageResponse(
            image_url=image_url,
            prompt=image_prompt,
        )

    except Exception as error:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate image: {repr(error)}",
        )
