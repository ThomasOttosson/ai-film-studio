from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
