from pydantic import BaseModel


class ImageRequest(BaseModel):
    scene_title: str
    narration: str
    mood: str
    style: str = "cinematic"


class ImageResponse(BaseModel):
    image_url: str
    prompt: str


class AudioRequest(BaseModel):
    scene_title: str
    narration: str
    voice: str = "alloy"


class AudioResponse(BaseModel):
    audio_url: str
    prompt: str
