from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AI Film Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StoryboardRequest(BaseModel):
    title: str
    idea: str
    genre: str = "Sci-Fi"
    style: str = "Cinematic"
    scene_count: int = 3


class Scene(BaseModel):
    id: int
    title: str
    narration: str
    mood: str
    duration: str


@app.get("/")
def root():
    return {"message": "AI Film Studio API is running"}


@app.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "service": "AI Film Studio Backend",
    }


@app.post("/api/storyboard", response_model=List[Scene])
def generate_storyboard(request: StoryboardRequest):
    return [
        {
            "id": 1,
            "title": "Opening Vision",
            "mood": f"{request.style}, atmospheric",
            "duration": "8 sec",
            "narration": f"The film begins with the idea: {request.idea}",
        },
        {
            "id": 2,
            "title": "Rising Conflict",
            "mood": f"{request.genre}, dramatic",
            "duration": "10 sec",
            "narration": "The world expands as the main character faces a difficult choice.",
        },
        {
            "id": 3,
            "title": "Emotional Resolution",
            "mood": "Cinematic, hopeful",
            "duration": "12 sec",
            "narration": "The story ends with a powerful emotional moment that completes the journey.",
        },
    ]
