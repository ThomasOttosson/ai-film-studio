from pydantic import BaseModel


class ImageRequest(BaseModel):
    scene_title: str
    narration: str
    mood: str
    style: str = "cinematic"


class ImageResponse(BaseModel):
    image_url: str
    prompt: str