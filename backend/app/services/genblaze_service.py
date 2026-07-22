"""Genblaze-orchestrated generation for image and music.

Image runs through Genblaze's OpenAI adapter (gpt-image-1); music through
Genblaze's GMI Cloud adapter (minimax-music-2.5). Video stays on the direct
Luma agents integration (Genblaze's Luma adapter targets a different API).

Each call returns raw bytes plus accurate (provider, model, manifest_sha) so
the caller can persist through asset_service.record_generation — Genblaze does
generation + provenance; our storage layer remains the system of record.
"""

from __future__ import annotations

import base64
from urllib.parse import urlparse
from urllib.request import url2pathname

import requests
from genblaze_core import Modality, Pipeline
from genblaze_gmicloud import GMICloudAudioProvider
from genblaze_openai import DalleProvider

IMAGE_MODEL = "gpt-image-1"
MUSIC_MODEL = "minimax-music-2.5"
# minimax-music practical ceiling; the storyboard-derived duration is capped
# to this before requesting.
MUSIC_MAX_SECONDS = 90

# ProviderErrorCode.value -> HTTP status for honest 4xx surfacing (M0 pattern).
_STATUS_BY_CODE = {
    "content_policy": 422,
    "invalid_input": 400,
    "rate_limit": 429,
    "timeout": 504,
    "auth_failure": 502,
    "model_error": 502,
    "server_error": 502,
    "unknown": 502,
}
_FRIENDLY = {
    "content_policy": (
        "This prompt was rejected by the provider's content filter — "
        "edit the description and retry."
    ),
    "rate_limit": (
        "The generation provider is rate-limited or out of quota — "
        "try again shortly."
    ),
    "auth_failure": "The generation provider rejected the configured API key.",
}


class GenblazeGenerationError(Exception):
    """Carries an HTTP status so routes can surface a real 4xx reason."""

    def __init__(self, detail: str, status_code: int = 502) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def _fetch_bytes(url: str) -> bytes:
    if url.startswith("data:"):
        return base64.b64decode(url.split(",", 1)[1])
    if url.startswith("file://"):
        return open(url2pathname(urlparse(url).path), "rb").read()
    response = requests.get(url, timeout=180)
    response.raise_for_status()
    return response.content


def _run(pipeline: Pipeline, timeout: float) -> tuple[bytes, str]:
    # raise_on_failure=False so we can read the step's error_code and map it to
    # a precise status instead of a generic failure. No retry loop.
    result = pipeline.run(timeout=timeout, raise_on_failure=False)

    failed = result.failed_steps()
    if failed:
        step = failed[0]
        code = getattr(step.error_code, "value", None) or "unknown"
        status = _STATUS_BY_CODE.get(code, 502)
        detail = _FRIENDLY.get(
            code,
            f"Generation failed ({code}): {step.error or 'unknown error'}",
        )
        raise GenblazeGenerationError(detail, status_code=status)

    _run_obj, manifest = result
    succeeded = result.succeeded_steps()
    assets = succeeded[-1].assets if succeeded else []
    if not assets:
        raise GenblazeGenerationError(
            "Genblaze returned no output asset.", status_code=502
        )

    return _fetch_bytes(assets[0].url), manifest.canonical_hash


def generate_image(prompt: str) -> tuple[bytes, str, str, str]:
    """Returns (image_bytes, provider, model, manifest_sha)."""
    pipeline = Pipeline("film-image").step(
        DalleProvider(),  # reads OPENAI_API_KEY
        model=IMAGE_MODEL,
        prompt=prompt,
        modality=Modality.IMAGE,
    )
    data, manifest_sha = _run(pipeline, timeout=300)
    return data, "openai", IMAGE_MODEL, manifest_sha


def generate_music(
    prompt: str, duration_seconds: int
) -> tuple[bytes, str, str, str]:
    """Returns (audio_bytes, provider, model, manifest_sha)."""
    duration = max(5, min(int(duration_seconds), MUSIC_MAX_SECONDS))
    pipeline = Pipeline("film-music").step(
        GMICloudAudioProvider(),  # reads GMI_API_KEY
        model=MUSIC_MODEL,
        prompt=prompt,
        modality=Modality.AUDIO,
        duration_seconds=duration,
    )
    data, manifest_sha = _run(pipeline, timeout=300)
    return data, "gmicloud", MUSIC_MODEL, manifest_sha
