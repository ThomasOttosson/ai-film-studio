from fastapi import APIRouter

from app.schemas.images import FullMovieRequest, FullMovieResponse
from app.services.movie_service import generate_full_movie

router = APIRouter(prefix="/api", tags=["Movie"])


@router.post("/generate-full-movie", response_model=FullMovieResponse)
def generate_movie(request: FullMovieRequest):
    return generate_full_movie(request)
