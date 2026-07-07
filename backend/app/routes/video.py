from fastapi import APIRouter

from app.schemas.images import VideoRequest, VideoResponse
from app.services.luma_service import generate_ai_video_from_scene

router = APIRouter(prefix="/api", tags=["Video"])


@router.post("/generate-video", response_model=VideoResponse)
def generate_scene_video(request: VideoRequest):
    return generate_ai_video_from_scene(request)
