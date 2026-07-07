from pydantic import BaseModel
from typing import List


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


class VideoRequest(BaseModel):
    scene_title: str
    image_url: str
    audio_url: str
    scene_length: int = 5
    aspect_ratio: str = "16:9"


class VideoResponse(BaseModel):
    video_url: str
    prompt: str


class FullMovieRequest(BaseModel):
    title: str
    video_urls: List[str]


class FullMovieResponse(BaseModel):
    final_movie_url: str
    title: str
