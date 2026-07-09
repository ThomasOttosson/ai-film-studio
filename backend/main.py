from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from redis_client import redis_client

from generation_queue import (
    create_generation_batch,
    enqueue_generation_batch,
    get_generation_batch,
)

load_dotenv()

from app.routes import audio, images, movie, storyboard, video

app = FastAPI(title="AI Film Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(storyboard.router)
app.include_router(images.router)
app.include_router(audio.router)
app.include_router(video.router)
app.include_router(movie.router)


@app.get("/")
def root():
    return {"message": "AI Film Studio API is running"}


@app.get("/api/health")
def health_check():
    return {
        "status": "UP",
        "service": "AI Film Studio Backend",
    }


@app.get("/api/redis-health")
def redis_health():
    redis_client.set("ai-film-studio:redis-test", "Redis is working")

    value = redis_client.get("ai-film-studio:redis-test")

    return {
        "status": "ok",
        "redis": value,
    }


@app.post("/api/generation-queue")
async def start_generation_queue(payload: dict):
    batch = create_generation_batch(payload)

    enqueue_generation_batch(batch["id"])

    return {
        "batch_id": batch["id"],
        "status": batch["status"],
        "steps": batch["steps"],
    }


@app.get("/api/generation-queue/{batch_id}")
def get_generation_queue(batch_id: str):
    batch = get_generation_batch(batch_id)

    if not batch:
        return {
            "status": "not_found",
            "steps": [],
            "scenes": [],
        }

    return batch