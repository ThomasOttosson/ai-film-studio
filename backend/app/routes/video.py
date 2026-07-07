from fastapi import APIRouter

from app.schemas.images import VideoRequest, VideoResponse
from app.services.video_service import generate_video_from_scene

router = APIRouter(prefix="/api", tags=["Video"])


@router.post("/generate-video", response_model=VideoResponse)
def generate_scene_video(request: VideoRequest):
    return generate_video_from_scene(request)
