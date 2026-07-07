from pydantic import BaseModel


class StoryboardRequest(BaseModel):
    title: str
    idea: str
    genre: str = "Sci-Fi"
    style: str = "Cinematic"
    scene_count: int = 3
    scene_length: int = 5


class Scene(BaseModel):
    id: int
    title: str
    narration: str
    mood: str
    duration: str
