from typing import List

from fastapi import APIRouter

from app.schemas.storyboard import Scene, StoryboardRequest
from app.services.openai_service import generate_storyboard_with_ai

router = APIRouter(prefix="/api", tags=["Storyboard"])


@router.post("/storyboard", response_model=List[Scene])
def generate_storyboard(request: StoryboardRequest):
    return generate_storyboard_with_ai(request)