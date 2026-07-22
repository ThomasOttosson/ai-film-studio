from fastapi import APIRouter

from app.schemas.images import MusicRequest, MusicResponse
from app.services.music_service import generate_project_music

router = APIRouter(prefix="/api", tags=["Music"])


@router.post("/generate-music", response_model=MusicResponse)
def generate_music_track(request: MusicRequest):
    return generate_project_music(request)
