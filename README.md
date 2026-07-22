# AI Film Studio

A scene-by-scene AI film creation tool built for the Backblaze Generative Media Hackathon. You create a project, generate a storyboard, and for each scene run a generation pipeline — text prompt → image → animated video → audio — then merge the scene videos into a final movie. Every generated asset (image, video, audio, final movie) is uploaded to Backblaze B2 for storage, and long-running generation is handled by a background job queue with live progress over WebSockets.

## Architecture at a glance

- **Backend:** FastAPI (Python 3.12), served by uvicorn.
- **Job queue:** custom Redis-backed queue with a standalone `worker.py` process; the API enqueues per-scene generation steps and streams progress to the frontend over WebSockets.
- **Database:** SQLAlchemy + Alembic migrations. Postgres in Docker Compose; SQLite by default for local dev.
- **Storage:** Backblaze B2 via the S3-compatible API (boto3).
- **Generation providers:** OpenAI (storyboard text + image) and Luma (image-to-video). Video merge/muxing is done locally with moviepy/ffmpeg.
- **Frontend:** React 19 + Vite + TypeScript.

## Quickstart (Docker Compose — recommended)

Prerequisites: Docker.

1. Create the env files from the templates and fill in real values:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   In `backend/.env` set at minimum: the four `B2_*` values, `OPENAI_API_KEY`, `LUMA_API_KEY`, and a strong `JWT_SECRET_KEY`. Generate the secret with:

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

   (Compose supplies `DATABASE_URL`, `REDIS_URL`, and `INTERNAL_API_BASE_URL` for the in-network services automatically.)

2. Bring the stack up:

   ```bash
   docker compose up --build
   ```

   This starts Postgres, Redis, the backend (which runs `migrate.py` before serving), the worker, and the frontend dev server.

3. Open the app:

   - Frontend: <http://localhost:5173>
   - Backend health: <http://localhost:8000/api/health>

## Manual local dev (no Docker)

Prerequisites: Python 3.12, Node.js, and a running Redis on `localhost:6379`.

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit; DATABASE_URL=sqlite:///./ai_film_studio.db works for local dev
export $(grep -v '^#' .env | xargs) # or otherwise load .env into your shell

python migrate.py                  # apply migrations
uvicorn main:app --reload --port 8000
```

In a second terminal, start the generation worker (required for the scene pipeline):

```bash
cd backend
source .venv/bin/activate
python worker.py
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                        # http://localhost:5173
```

## Repo layout

- `backend/main.py`, `backend/app/routes/`, `backend/app/services/`, `backend/generation_queue.py`, `backend/worker.py`, `backend/app/models.py`, `backend/migrations/` — the running application.
- `backend/app/services/genblaze_service.py` — Genblaze SDK integration (image + music generation).
- `frontend/src/pages/Dashboard.tsx` and `frontend/src/api/` — the live frontend and its API client.
- `docs/HANDOFF_AUDIT.md` — full technical audit of the codebase.

> **Still present but not core to the generation pipeline:** the AI-assistant chat (`ai_assistant` route + `AIActionQueueProvider`/AI-action components), live collaboration, and notifications. These are wired into the app and left in place for demo stability; they are not part of the scene → image → video → music → movie flow. The unwired provider framework, `ai_*` worker subsystem, the fabricated-output `/api/ai/actions` router, the unreachable timeline editor, and the boilerplate docs have been removed.
