from fastapi import APIRouter

from app.schemas.images import AudioRequest, AudioResponse
from app.services.openai_service import generate_audio_with_ai

router = APIRouter(prefix="/api", tags=["Audio"])


@router.post("/generate-audio", response_model=AudioResponse)
def generate_scene_audio(request: AudioRequest):
    return generate_audio_with_ai(request)
