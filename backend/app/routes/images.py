from fastapi import APIRouter

from app.schemas.images import ImageRequest, ImageResponse
from app.services.openai_service import generate_image_with_ai

router = APIRouter(prefix="/api", tags=["Images"])


@router.post("/generate-image", response_model=ImageResponse)
def generate_scene_image(request: ImageRequest):
    return generate_image_with_ai(request)