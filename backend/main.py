import json
import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="Missing OPENAI_API_KEY")

    prompt = f"""
Create a cinematic storyboard for an AI-generated short film.

Movie title: {request.title}
Movie idea: {request.idea}
Genre: {request.genre}
Style: {request.style}
Number of scenes: {request.scene_count}

Return ONLY valid JSON.
Return an array with exactly {request.scene_count} scenes.
Each scene must have:
- id: number
- title: string
- narration: string
- mood: string
- duration: string

Example:
[
  {{
    "id": 1,
    "title": "Opening Scene",
    "narration": "The story begins...",
    "mood": "Cinematic, emotional",
    "duration": "8 sec"
  }}
]
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert film director and storyboard writer.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.8,
        )

        content = response.choices[0].message.content
        scenes = json.loads(content)

        return scenes

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate storyboard: {str(error)}",
        )
