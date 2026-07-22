# AI Film Studio — Handoff Audit

**Auditor:** Read-only code audit (no changes made to the codebase).
**Date:** 2026-07-21
**Deadline for hackathon submission:** 2026-08-03 (~13 days out).
**Repo state at audit:** branch `main`, clean tree, last meaningful commit 2026-07-20.

> Scope note: This is a read-only assessment. Nothing was modified, refactored, or "fixed." A throwaway virtual environment was created under `backend/.audit_venv/` purely to attempt a local boot; it can be deleted (`rm -rf backend/.audit_venv`) and is not part of the project.

---

## 1. Executive Summary

The core MVP happy-path **does exist and is plausibly wired end-to-end**: you can register/login, create a project, generate a storyboard, and per scene generate an image (OpenAI `gpt-image-1`), a voice track (OpenAI TTS), and an animated video (Luma `ray-3.2`), then merge all scene videos into a final movie — with every asset uploaded to Backblaze B2 and a real Redis-backed job queue driving the per-scene steps with live WebSocket progress. That is a genuine vertical slice and the foundation of the pipeline is sound enough to build on. **However, the project diverges sharply from the brief in ways that directly threaten the judging criteria**, and I would put the *submittable-MVP-as-specified* completion at roughly **55–60%**.

The three most damaging divergences: **(1) There is no "Genblaze" anywhere in the backend** — the intended multi-provider orchestration SDK is simply absent (the word appears once, as marketing text in `frontend/src/components/Hero.tsx:5`). The real pipeline is two hardcoded vendors (OpenAI + Luma) called via direct function calls. A ~30-file `backend/providers/` "enterprise" framework (circuit breakers, bulkheads, failover, registry, Runway/Stability/Pika/fal/Replicate adapters) exists but is **completely unwired** — `main.py` never imports it, and parts of it cannot even run. **(2) The audio step is text-to-speech narration, not background music** — TTS/dialogue is explicitly out of MVP scope, and the required per-scene *background music* is missing entirely. **(3) There is no real data model or storage layout for versioning/provenance** — no Scene/Asset/Version tables (everything lives in one `projects.data` JSON blob + Redis), B2 objects land in three flat prefixes (`generated-images/`, `generated-audio/`, `generated-videos/`) with random-UUID filenames and **no object metadata**, so provenance and per-asset version history — a core judging criterion — are effectively absent.

**The single biggest risk:** the effort was spent almost entirely in the wrong places. An estimated **70–80% of the frontend is out-of-scope** (a fully built but *unreachable* timeline video editor, live collaboration, notifications, an AI-assistant chat agent), 100% of the test suite targets that dead editor, the backend has **zero tests**, and `docs/` is ~55 files of generic compliance boilerplate that never once mention this app, its pipeline, its providers, or its B2 layout. **The foundation (FastAPI + Redis queue + B2 + OpenAI/Luma) is solid and worth keeping**, but the B2 organization/versioning, the "multi-provider" story, and the "music" step all need real work, and a large amount of impressive-looking code is dead weight that should be ignored, not maintained.

---

## 2. Stack & Repo Map

**Actual stack chosen** (matches the intended stack except for orchestration):

| Layer | Choice | Evidence |
|---|---|---|
| Backend framework | **FastAPI 0.138.2** (async, uvicorn) | `backend/requirements.txt`, `backend/main.py:81` |
| Python | **3.12** | `backend/Dockerfile` (`python:3.12-slim`); local `python 3.12.0` |
| DB | **SQLAlchemy 2.0 + Alembic**, Postgres in compose, **SQLite default** | `backend/app/database.py:5` (`DATABASE_URL`, defaults `sqlite:///./ai_film_studio.db`) |
| Job queue | **Custom Redis list queue + standalone worker** (not Celery/RQ) | `backend/generation_queue.py`, `backend/worker.py`, `backend/redis_client.py` |
| Storage | **Backblaze B2 via boto3 S3 API** | `backend/app/services/backblaze_service.py` |
| Auth | **JWT (PyJWT) + argon2 (pwdlib)** | `backend/app/auth.py` |
| Video processing | **moviepy 2.2 + imageio-ffmpeg** | `backend/app/services/{movie_service,luma_service,video_service}.py` |
| Frontend | **React 19 + Vite + TypeScript**, axios, bootstrap | `frontend/package.json` |
| Genblaze SDK | **ABSENT** | grep of repo: only `frontend/src/components/Hero.tsx:5` |

**Repo organization:**
- `backend/` — two coexisting worlds:
  - **The live app** (what actually runs): `main.py` (FastAPI + routes + queue endpoints + WebSockets), `app/routes/*` (registered), `app/services/*` (OpenAI/Luma/B2/moviepy), `generation_queue.py`, `worker.py`, `redis_client.py`, `app/models.py`, `migrations/`.
  - **Orphaned scaffolding** (never imported by `main.py`/`worker.py`): the entire `backend/providers/` package (~40 files), `ai_provider*.py`, `ai_worker.py`, `ai_action_*.py`, `app/lifespan.py`, `app/factory.py`, `app/dependencies/ai_providers.py`, and ~15 `app/routes/provider_*.py` routers that are **not mounted**.
- `frontend/` — one live app shell (`src/pages/Dashboard.tsx`, a 2,265-line monolith holding the whole core flow) plus a large **unreachable** `src/features/editor/*` (~118 files / ~9.7k LOC timeline editor) whose router is never mounted.
- `docs/` — ~55 generic enterprise/compliance markdown files (boilerplate; see §7/§9).
- `load/` — 5 k6 load-test scripts, all for the dead editor.
- `.github/workflows/` — 10 workflows, backend only byte-compiled, all executable test CI targets the editor.

**Work arc (git, 76 commits):** Early commits (bottom of log) built the *real* MVP in a sensible order — FastAPI+React setup → storyboard (OpenAI) → scene image → B2 integration → audio → video (Luma) → movie merge → timeline editor. Then the bulk of later effort pivoted hard into **scope expansion**: JWT auth & multi-user, project sharing, invitation-based **live collaboration**, notifications, an **AI assistant** with scene regeneration, a heavy **video editor**, and finally a long tail of CI/Playwright/visual-regression/"test2..test8" commits. The last ~15 commits are almost entirely CI/editor/test plumbing, not pipeline work. **The core generation pipeline received meaningful attention early and little since; the recent months went to editor + collaboration + CI.**

---

## 3. MVP Scorecard

Legend: ✅ Working · 🟡 Partial · ❌ Missing · ⚠️ Broken/defective

| # | MVP capability | Status | One-line note |
|---|---|---|---|
| 1 | **Data models** (Project/Scene/Asset/Version + provenance) | ❌ | Only `users`/`projects`(JSON blob)/`notifications`/collab tables exist; **no Scene/Asset/Version tables**, no provider/model provenance. `app/models.py`, `migrations/versions/20260713_0001_initial_schema.py` |
| 2 | **B2 storage layer** | 🟡 | Real uploads work, credentials via env (good), but **flat prefixes, random-UUID names, no per-project/scene/version path, no object metadata**. `app/services/backblaze_service.py` |
| 3 | **Genblaze integration** | ❌ | No Genblaze at all. `frontend/.../Hero.tsx:5` only. |
| 3b | **Multi-provider orchestration** | ⚠️ | Reality = 2 hardcoded vendors (OpenAI + Luma); ~30-file provider framework is unwired/partly non-runnable. `backend/providers/*`, `main.py:36-48` |
| 4a | **Pipeline: prompt → image** | ✅ | OpenAI `gpt-image-1` → B2. `app/services/openai_service.py:95-144` |
| 4b | **Pipeline: image → video (animate)** | 🟡 | Luma `ray-3.2` real & works, but **blocking** polling (`time.sleep`) and it force-merges the TTS audio in. `app/services/luma_service.py:50-302` |
| 4c | **Pipeline: background music** | ❌ | No music generation. The "audio" step is OpenAI **TTS narration** (out of scope). `openai_service.py:147-179` |
| 4d | **Pipeline: scene merge → final movie** | 🟡 | moviepy concat works, uploads to B2, but **only a blocking sync endpoint**, no queue, no versioning. `app/services/movie_service.py` |
| 5 | **Async / job handling** | 🟡 | Real Redis queue + worker for image/audio/video (good); but direct `/generate-*` endpoints are **blocking sync**, and merge has no async path. `generation_queue.py`, `worker.py`, `app/routes/*.py` |
| 6 | **API layer** | ✅ | Coherent REST + WS surface with JWT auth on generation routes. `main.py`, `app/routes/*` |
| 7 | **Frontend** | 🟡 | Core create→generate→merge→play flow works in `Dashboard.tsx`; **no per-asset version history**, audio is TTS not music, weak "add scene"; ~70–80% of code is out-of-scope. |
| 8 | **Merge / final movie** | ✅ | Exists via moviepy (ffmpeg). `app/services/movie_service.py`, frontend `FinalMovie` component. |
| 9 | **Tests** | ⚠️ | **Zero backend tests**; storage & pipeline untested. Frontend/e2e tests exist but 100% target the *dead* editor. |
| 10 | **Config / deploy** | 🟡 | `docker-compose.yml` plausible; **`Dockerfile.production` CMD points at nonexistent `backend/app.py`**; no `.env.example`, no README run docs. |

---

## 4. What's Genuinely Done (trustworthy foundation)

These I read end-to-end and would build on without re-deriving:

- **Storyboard generation.** OpenAI `gpt-4.1-mini` with JSON-mode returns structured scenes (title/narration/mood/duration). `app/services/openai_service.py:17-92`, route `app/routes/storyboard.py:11`.
- **Image generation → B2.** `gpt-image-1`, base64 decode, upload, returns URL + the exact prompt used. `openai_service.py:95-144`; upload `backblaze_service.py:9-44`.
- **Video generation (Luma).** Real HTTP integration against `https://agents.lumalabs.ai/v1/generations`, `ray-3.2`, image-as-start-frame, poll to completion, plus a genuinely nice touch: for scenes >5s it extracts the last frame, re-uploads it, and chains a second Luma shot for continuity. `luma_service.py:50-143, 228-302`.
- **Final-movie merge.** moviepy downloads all scene videos, concatenates, writes H.264/AAC, uploads to B2. `movie_service.py:24-83`.
- **Redis generation queue.** This is the best-engineered part: batches per scene into image/audio/video steps, tracks status/progress %/ETA, supports cancel/pause/resume/retry-failed, runs blocking work off the event loop via `asyncio.to_thread`, and re-reads batch state between steps to honor cancellation. `generation_queue.py:129-579`; worker `worker.py:23-47`; endpoints `main.py:168-294`.
- **Live progress over WebSocket.** Redis pub/sub → WS fan-out to the client with an initial snapshot and token auth. `main.py:297-368`, `redis_events.py`, `websocket_manager.py`.
- **Auth.** JWT + argon2 hashing, bearer dependency, 401 handling, project role checks (`owner`/`editor`/`viewer`) enforced on generation. `app/auth.py`, `app/routes/projects.py:accessible_project` (used in `main.py:178`).
- **Migrations.** Alembic is set up with an initial schema migration and a `migrate.py` runner; compose runs it before boot. `migrations/`, `migrate.py`.
- **B2 credentials are env-driven, not hardcoded.** Verified by grep — no leaked secrets in the repo. `backblaze_service.py:10-13`.
- **Frontend core flow is real and functional.** Create project, storyboard, per-scene image/audio/video buttons, batch queue with progress, media library, full-movie button, final-movie player — all in `frontend/src/pages/Dashboard.tsx` (create `:1180`, image `:1375`, audio `:1417`, video `:1458`, full movie `:1675`), API in `src/api/filmApi.ts`.

---

## 5. What's Incomplete or Missing (ordered by how much it blocks a submittable demo)

1. **Background music (MVP-required, judging-relevant).** Not implemented anywhere. The only music-shaped code is the unwired ElevenLabs *voice* adapter and OpenAI TTS. A per-scene (or per-movie) music-generation step must be added to the pipeline and queue. `openai_service.py:147-179` (TTS, not music); no music provider on the live path.
2. **B2 storage organization + provenance metadata (core judging criterion #3).** Today: three flat prefixes with `uuid4().png/.mp3/.mp4` names and no object metadata. Needs a real key scheme (`projects/{pid}/scenes/{sid}/{asset_type}/v{n}/…`) and S3 object `Metadata` (provider, model, prompt, scene, project, created-at). `backblaze_service.py:28,66,104` (prefixes), `:35,73,111` (only `ContentType` set).
3. **Versioning that actually retains + retrieves prior versions (core criterion #3).** Random UUIDs mean old blobs aren't overwritten, but nothing *links* versions, so "prior versions of scene 3's image" cannot be listed or restored. Frontend "regenerate" overwrites the URL in place (`Dashboard.tsx:1394`); only a global project undo/redo exists (`Dashboard.tsx:120-121,321,343`), not per-asset history. Needs an Asset/Version model or a versioned B2 index.
4. **Data model for scenes/assets.** Everything is a `projects.data` JSON blob (`app/models.py:36`) plus ephemeral Redis batch state. No queryable Scene/Asset/Version entities → blocks provenance, versioning, and any "data orchestration" story. `migrations/.../20260713_0001_initial_schema.py`.
5. **"Genblaze"/multi-provider narrative (judging criterion #4).** If the judges expect Genblaze specifically, it's absent; if they accept "meaningful multi-provider," the *reality* is 2 vendors and the impressive framework is dead. Either integrate Genblaze for real, or make the existing pipeline genuinely route across ≥2 providers per modality and delete the dead framework so it isn't mistaken for the truth. `backend/providers/*` (unwired), `main.py:36-133`.
6. **Async for the final-movie merge.** `/api/generate-full-movie` is a blocking sync endpoint that downloads N videos and re-encodes inline — fine for a 3-scene demo, risky for anything larger. `app/routes/movie.py:9-11`, `movie_service.py`.
7. **Any backend test coverage**, especially for `backblaze_service` and the pipeline (currently zero). §9.
8. **Run/onboarding docs + `.env.example`.** None exist; a new dev cannot start this without reverse-engineering ~45 env vars. §10.
9. **Add-scene / per-scene prompt editing in the UI.** Scenes are created only in bulk via storyboard (fixed count 3); `SceneCard` shows narration read-only. `frontend/src/components/SceneCard.tsx:38-40`, `Dashboard.tsx:1332`.

---

## 6. Defects & Risks

**Security / correctness**

- **⚠️ Weak default JWT secret.** `SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-me-in-production')` — if the env var is unset, tokens are signed with a public, well-known string, allowing trivial forgery of any user's token. `app/auth.py:11`. (No hardcoded *real* secrets were found anywhere — grep clean — this is a weak fallback, not a leak.)
- **⚠️ `Dockerfile.production` is broken.** Its `CMD ["python", "backend/app.py"]` targets a file that does not exist (the real entry is `backend/main.py` run via uvicorn). This production image would fail to start. `Dockerfile.production`.
- **⚠️ App import requires `OPENAI_API_KEY` at module load.** `client = OpenAI()` runs at import of `openai_service.py:14`; the OpenAI SDK raises if no key is present, so `import main` (and thus uvicorn boot) fails without the key even set to a dummy. `openai_service.py:14`. (See §11 for the boot workaround.)
- **⚠️ A *mounted* endpoint returns fake generated assets.** The AI-actions router is registered in `main.py:101-104` and its jobs call `simulate_provider_request()`, which returns canned `/generated/...` URLs and placeholder Swedish strings. If a demo or judge exercises `/api/ai/actions`, it silently serves fabricated output. `app/routes/ai_actions.py:182-186,255-327`.

**Production-readiness**

- **Blocking synchronous generation endpoints.** `/api/generate-image`, `/api/generate-audio`, `/api/generate-video`, `/api/generate-full-movie` are non-async `def` handlers that run the full multi-second-to-multi-minute generation inline (video polls Luma up to ~240s: `luma_service.py:106` loops 80× `time.sleep(3)`). FastAPI runs them in the threadpool so the event loop survives, but each holds a worker thread + HTTP request open for minutes and will time out behind most proxies. The queue path is the safe one; these direct endpoints are a foot-gun. `app/routes/{images,audio,video,movie}.py`.
- **No retry/backoff on provider calls in the real path.** The queue has *step-level* retry-failed (manual, `generation_queue.py:547`), but individual OpenAI/Luma calls have no automatic retry; a transient 429/5xx fails the step. (The elaborate `provider_retry`/`provider_circuit_breaker` modules that would address this are unwired — `providers/provider_retry.py`, `provider_circuit_breaker.py`.)
- **Redis holds all job/asset-URL state; nothing persists batch results to the DB.** If Redis is flushed, in-flight/finished batch metadata and the scene→asset URL mapping for that batch are lost (the frontend persists URLs into `projects.data`, so it's not total loss, but the server has no durable record). `generation_queue.py:201-208`.

**Scope-creep / dead weight (threatens "production readiness" perception and maintainability)**

- **~30-file provider framework + dual `AIProviderRegistry` + `ai_worker.py` + `ai_action_processor.py` are unwired**, and some cannot run: `ai_worker.py:15` imports `AIActionProcessor` (a class that doesn't exist in `ai_action_processor.py`) → `ImportError`; `provider_bootstrap.py:61-66` requires a `.name` attribute no concrete provider defines; `default_factories.py` passes kwargs the provider constructors reject. `backend/providers/*`, `backend/ai_*.py`, `app/lifespan.py`.
- **~15 `app/routes/provider_*.py` routers are never mounted** (`main.py:98-133` omits them); `app/routes/provider_metrics.py` is a byte-for-byte copy of `providers/provider_metrics.py`.
- **ElevenLabs (out-of-scope voice) adapter** is one of only two auto-registered providers (`providers/__init__.py:20`) yet `elevenlabs` isn't even in `requirements.txt` → would fail to import if the dead subsystem were ever loaded.
- **Frontend: ~9.7k LOC unreachable timeline editor** (`src/features/editor/*`; router `src/app/router.tsx` never mounted by `main.tsx`), plus live collaboration, notifications, and an AI-assistant chat — none required by the MVP. All 9 vitest + 17 Playwright + 5 k6 tests target this dead editor.
- **`docs/` (~55 files) is compliance boilerplate** that never mentions this app; `frontend/README.md` is the stock Vite template; there is no root README.

---

## 7. Judging-Criteria Gap Analysis

**(1) Real-World Utility.** *Demonstrated:* a genuinely useful, coherent flow — idea → storyboard → per-scene image/motion/voice → merged film, with live progress and a media library. This is the strongest criterion and it largely works. *Missing:* background music (a real expectation for "film"), and the inability to iterate on a single asset with retained history undercuts the "studio" promise.

**(2) Production Readiness.** *Demonstrated:* async queue with cancel/pause/resume/retry, WebSocket progress, JWT auth + RBAC, Alembic migrations, Docker Compose, CI that builds. Surface-level, this looks production-grade. *Missing/undermining:* zero backend tests; blocking sync generation endpoints; a broken production Dockerfile; a weak default JWT secret; a mounted endpoint that serves fake data; and a large volume of non-functional "enterprise" code (circuit breakers/bulkheads/failover that don't run) that is *theater*, not readiness — a judge who looks closely will notice the gap between appearance and reality.

**(3) Meaningful B2 storage / data orchestration with metadata + provenance.** *Demonstrated:* every real asset (image/audio/video/final movie) is genuinely stored in B2 via the S3 API, and the generating **prompt** is captured in app data (`imagePrompt`/`audioPrompt`/`videoPrompt` on the scene). *Missing (this is the weakest criterion):* no per-project/scene/asset/version key structure (three flat prefixes), **no object metadata** (provider/model/timestamp not attached), no version linkage or retrieval, and no data model to orchestrate over. As specified — "versioned, organized per project/scene, with metadata + provenance" — this criterion is largely unmet.

**(4) Meaningful multi-step / multi-provider Genblaze usage.** *Demonstrated:* multi-**step** is real (storyboard → image → video → merge across OpenAI + Luma + moviepy). *Missing:* **Genblaze is absent**, and multi-**provider** is really two hardcoded vendors; the multi-provider *appearance* comes from dead scaffolding. If judges weight "Genblaze" literally, this scores poorly; if they weight "multi-step multi-provider pipeline," it's a partial pass on the strength of OpenAI+Luma.

---

## 8. Recommended Takeover Plan

Decisive, ordered milestones to reach a submittable demo (app URL + repo + video) by ~Aug 3. Chosen approach where two exist, with rationale.

**Guiding decision — build on this backend; do NOT rewrite, and do NOT try to revive the provider framework.** The `app/services` + Redis-queue core is sound and demo-ready. The `backend/providers/*` framework is a tar pit — deleting/ignoring it is faster than wiring it. **Ignore the timeline editor and collaboration entirely** for the submission.

- **M0 — Get it running & de-risk (Day 1).** Create `backend/.env` + `frontend/.env` from §11, boot via Docker Compose, run the full happy-path once against real keys with a 3-scene project. Write the missing root `README.md` with these steps. Fix the two boot-blockers you'll hit: broken `Dockerfile.production` CMD and the import-time `OpenAI()` (lazy-init the client). *~1 day.*

- **M1 — Make B2 storage/provenance real (Days 2–4).** This is the highest-leverage judging win. Introduce a versioned key scheme `projects/{pid}/scenes/{sid}/{type}/v{n}/{uuid}.{ext}` and attach S3 object `Metadata` (provider, model, prompt, scene_id, project_id, created_at) on every upload. Add a lightweight `Asset`/`AssetVersion` SQLAlchemy model + migration recording each version (provider/model/prompt/b2_key/created_at). Expose `GET /projects/{id}/scenes/{sid}/assets/{type}/versions` and surface a minimal "version history / restore" control in `SceneCard`. **Approach choice:** a real DB table over "list B2 by prefix" — it's queryable, demonstrates data orchestration, and is trivial to show in the demo. *~2.5 days.*

- **M2 — Add background music (Days 4–6).** Add a music-generation step to the pipeline and the queue as a *movie-level* track (simpler and more musical than per-scene). **Approach choice:** wire **one** real music provider (Stability Audio or an equivalent) directly in `app/services/`, mirroring the Luma pattern — do **not** route it through the dead framework. Mix it under the final movie in `movie_service` (moviepy already merges audio). Store it in B2 with the same metadata/versioning from M1. *~2 days.*

- **M3 — Multi-provider truth + cleanup (Days 6–8).** Make the "multi-provider" claim honest: keep OpenAI (image) + Luma (video) + the M2 music provider = 3 real vendors across 3 modalities, and add a thin, *actually-called* provider-selection function (e.g. a `PROVIDERS` dict the queue reads) so it's genuinely swappable. Delete or clearly quarantine the dead `backend/providers/*`, `ai_*.py`, unmounted `provider_*` routes, and the `simulate_provider_request` path so nothing fake can be demoed and nothing misleads a judge. *~2 days.*

- **M4 — Harden the demo path (Days 8–10).** Move `/generate-full-movie` onto the queue (or make it async + polled). Add automatic retry/backoff around the OpenAI/Luma/music calls in the queue. Add a handful of backend tests for `backblaze_service` (mock boto3) and the queue step logic — enough to claim real coverage of storage + pipeline. Set a strong `JWT_SECRET_KEY` and fail fast if it's the default in production. *~2 days.*

- **M5 — Deploy + record (Days 10–13).** Deploy backend + worker + Redis + Postgres (Railway/Fly for the stateful backend; Vercel for the frontend it's already configured for — CORS already allow-lists `ai-film-studio-six.vercel.app`, `main.py:91`). Verify B2 works from prod. Record the demo video walking idea → storyboard → per-scene image/music/video → version history → merged movie, explicitly narrating the B2 keys/metadata and the multi-provider steps to hit criteria #3 and #4. Buffer for the inevitable prod issues. *~3 days incl. buffer.*

*Timeboxing reality:* M1+M2+M3 (storage/provenance, music, multi-provider truth) are the criterion-moving work; if time compresses, protect those and cut M4's async-merge (a 3-scene demo tolerates the blocking endpoint).

---

## 9. Questions for Thomas

1. **Genblaze:** Was Genblaze ever started/removed, or never attempted? Do the judges require the Genblaze SDK specifically, or is "multi-step multi-provider" sufficient? This determines whether M3 must integrate Genblaze or can formalize OpenAI+Luma+music.
2. **The `backend/providers/*` framework:** Is any of it intended to be finished, or is it safe to delete? It looks like an aborted architecture — confirming lets us remove ~40 files of dead weight cleanly.
3. **Audio intent:** Is the OpenAI TTS narration deliberate, or a placeholder standing in for background music? The brief says dialogue/TTS is out of scope and music is in — which did you intend?
4. **Provider accounts/keys we'll need:** Confirm which of these you have working credentials for: OpenAI, Luma (`LUMA_API_KEY`), B2 (bucket + key id + app key + endpoint), and a music provider (Stability?). Also the target B2 bucket name and whether B2 native object-versioning is enabled on it.
5. **The uncommitted `.env` files:** Can you share your working `backend/.env` / `frontend/.env` (or their exact contents)? Nothing is committed and there's no `.env.example`.
6. **Editor & collaboration:** Are the timeline editor and live collaboration meant to be part of the submission, or exploratory? They're currently unreachable/optional — confirming lets us safely ignore them for the deadline.
7. **Deploy target:** Is there an existing Vercel/Railway/Fly project (the CORS allow-list implies a Vercel deploy exists at `ai-film-studio-six.vercel.app`)? Any live backend URL already stood up?
8. **`VITE_API_BASE_URL` vs `VITE_API_URL`:** the frontend uses both names in different files — which is authoritative in your working setup?

---

## 10. Config / Deploy Reference

**Services (`docker-compose.yml`):** `postgres:17-alpine` (5432), `redis:7-alpine` (6379), `backend` (builds `backend/Dockerfile`, runs `python migrate.py && uvicorn main:app`, 8000, `env_file: ./backend/.env`), `worker` (same image, `python worker.py`), `frontend` (`npm run dev`, 5173, `env_file: ./frontend/.env`).

**PaaS config:** none committed (no vercel/railway/fly/render/Procfile). A Vercel deploy is *implied* by the CORS allow-list (`main.py:91`) but no config is in-repo.

**Every referenced env var** (compose + Dockerfiles + code; ⚠️ = required for the real MVP path, others belong to the dead subsystem or are optional):

- **B2 (⚠️):** `B2_BUCKET_NAME`, `B2_ENDPOINT_URL`, `B2_KEY_ID`, `B2_APPLICATION_KEY`
- **Providers (⚠️ for live path):** `OPENAI_API_KEY`, `LUMA_API_KEY`. *(Dead subsystem: `ELEVENLABS_API_KEY`, `RUNWAY_API_KEY`, `REPLICATE_API_TOKEN`, `STABILITY_API_KEY`, `FAL_KEY`, `PIKA_API_KEY`, `PIKA_API_BASE`, `ANTHROPIC_API_KEY` [CI only].)*
- **Infra (⚠️):** `DATABASE_URL` (defaults to sqlite), `REDIS_URL` (defaults `redis://localhost:6379/0`); compose also uses `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `INTERNAL_API_BASE_URL`.
- **Auth (⚠️):** `JWT_SECRET_KEY` (set a strong one!), `ACCESS_TOKEN_MINUTES` (default 1440).
- **Worker (optional):** `WORKER_SLEEP_SECONDS`. *(Dead-subsystem worker/watchdog/queue AI_* vars exist but aren't used by the live `worker.py`.)*
- **Frontend (⚠️):** `VITE_API_BASE_URL` (used by `src/api/*`); note `VITE_API_URL` is used inconsistently by the AI-assistant code.

**Deploy gotchas:** `Dockerfile.production` CMD is broken (`backend/app.py` doesn't exist). No `.env.example` despite `.dockerignore` whitelisting one. `frontend` env var name is inconsistent (see above).

---

## 11. Local Run Instructions (verified as far as safely possible)

**Prereqs present on this machine:** Python 3.12.0, Node v24.13.1 / npm 11.8.0, Docker 29.2.1. `frontend/node_modules` is **absent** (install needed). DB defaults to **SQLite**, so Postgres is optional for local dev; **Redis is required** for the queue/worker.

**Easiest path — Docker Compose (recommended):**
```bash
# 1) Create backend/.env (compose needs it):
cat > backend/.env <<'EOF'
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/ai_film_studio
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ai_film_studio
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=<generate a long random string>
OPENAI_API_KEY=<your key>          # REQUIRED even to import the app
LUMA_API_KEY=<your key>
B2_BUCKET_NAME=<bucket>
B2_ENDPOINT_URL=https://s3.<region>.backblazeb2.com
B2_KEY_ID=<key id>
B2_APPLICATION_KEY=<app key>
EOF

# 2) Create frontend/.env:
echo 'VITE_API_BASE_URL=http://localhost:8000' > frontend/.env

# 3) Bring it up (postgres, redis, backend, worker, frontend):
docker compose up --build
# Frontend: http://localhost:5173   Backend: http://localhost:8000/api/health
```

**Manual path (no Docker) — backend:**
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # Windows; use source .venv/bin/activate on *nix
pip install -r requirements.txt
# Minimum env for local dev (SQLite + local Redis running on :6379):
export DATABASE_URL="sqlite:///./ai_film_studio.db"
export OPENAI_API_KEY="<key>"   # MUST be set or `import main` fails at openai_service.py:14
export JWT_SECRET_KEY="<random>"
export LUMA_API_KEY="<key>"
export B2_BUCKET_NAME=... B2_ENDPOINT_URL=... B2_KEY_ID=... B2_APPLICATION_KEY=...
python migrate.py                          # apply Alembic migrations
uvicorn main:app --reload --port 8000      # API
python worker.py                           # in a second terminal: the generation worker
```
**Frontend:**
```bash
cd frontend
npm install        # node_modules is not present; note package.json pins some very high major versions — verify they resolve
npm run dev        # http://localhost:5173
```

**Verification notes from this audit:**
- All core backend modules **byte-compile cleanly** (`python -m py_compile` on `main.py`, `generation_queue.py`, `worker.py`, `app/services/*`, `app/routes/*`, `app/*` → exit 0).
- **Boot caveat confirmed:** without `OPENAI_API_KEY`, `import main` fails because `openai_service.py:14` constructs `OpenAI()` at import time. Set the key (a dummy value is enough to *boot*; a real one is needed to *generate*).
- A local Redis is required for `/api/generation-queue*` and the worker; `redis_client` connects lazily, so the API imports without Redis but queue endpoints will error until Redis is up.
- **No live provider calls or B2 uploads were made during this audit.**
