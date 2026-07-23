"""Genblaze-orchestrated generation for image and music.

Image runs through Genblaze's OpenAI adapter (gpt-image-1); music through a
config-selected Genblaze audio adapter (MUSIC_PROVIDER: "stability" =
stable-audio-2.5 by default, "gmicloud" = minimax-music-2.5). Video stays on
the direct Luma agents integration (Genblaze's Luma adapter targets a
different API).

Each call returns raw bytes plus accurate (provider, model, manifest_sha) so
the caller can persist through asset_service.record_generation — Genblaze does
generation + provenance; our storage layer remains the system of record.
"""

from __future__ import annotations

import base64
import os
from urllib.parse import urlparse
from urllib.request import url2pathname

import requests
from genblaze_core import Modality, Pipeline
from genblaze_gmicloud import GMICloudAudioProvider
from genblaze_openai import DalleProvider
from genblaze_stability_audio import StabilityAudioProvider

IMAGE_MODEL = "gpt-image-1"
# Duration cap safe for both music providers (stable-audio-2.5 allows up to
# 190s; minimax-music ~90s). The storyboard-derived duration is capped here.
MUSIC_MAX_SECONDS = 90

# Music provider is a config switch via MUSIC_PROVIDER (default "stability").
# The GMI path stays ready — flipping to it is config, not code.
DEFAULT_MUSIC_PROVIDER = "stability"
_MUSIC_PROVIDERS = {
    "stability": {
        "label": "stability",
        "model": "stable-audio-2.5",
        "factory": lambda: StabilityAudioProvider(),
        "duration_kwarg": "duration",
        "env_var": "STABILITY_API_KEY",
    },
    "gmicloud": {
        "label": "gmicloud",
        "model": "minimax-music-2.5",
        "factory": lambda: GMICloudAudioProvider(),
        "duration_kwarg": "duration_seconds",
        "env_var": "GMI_API_KEY",
    },
}


def _music_config() -> dict:
    name = os.getenv("MUSIC_PROVIDER", DEFAULT_MUSIC_PROVIDER).strip().lower()
    return _MUSIC_PROVIDERS.get(
        name, _MUSIC_PROVIDERS[DEFAULT_MUSIC_PROVIDER]
    )


def music_provider_env_var() -> str:
    """The API-key env var required by the currently selected music provider."""
    return _music_config()["env_var"]


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


def _run(pipeline: Pipeline, timeout: float) -> tuple[bytes, str, str]:
    """Run the pipeline and return (bytes, manifest_sha, media_type)."""
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

    asset = assets[0]
    return _fetch_bytes(asset.url), manifest.canonical_hash, asset.media_type


def generate_image(prompt: str) -> tuple[bytes, str, str, str]:
    """Returns (image_bytes, provider, model, manifest_sha)."""
    pipeline = Pipeline("film-image").step(
        DalleProvider(),  # reads OPENAI_API_KEY
        model=IMAGE_MODEL,
        prompt=prompt,
        modality=Modality.IMAGE,
    )
    data, manifest_sha, _media_type = _run(pipeline, timeout=300)
    return data, "openai", IMAGE_MODEL, manifest_sha


def generate_music(
    prompt: str, duration_seconds: int
) -> tuple[bytes, str, str, str, str]:
    """Returns (audio_bytes, provider, model, manifest_sha, ext)."""
    cfg = _music_config()
    duration = max(5, min(int(duration_seconds), MUSIC_MAX_SECONDS))
    pipeline = Pipeline("film-music").step(
        cfg["factory"](),  # reads its own API key from the env
        model=cfg["model"],
        prompt=prompt,
        modality=Modality.AUDIO,
        **{cfg["duration_kwarg"]: duration},
    )
    data, manifest_sha, media_type = _run(pipeline, timeout=300)
    ext = "wav" if "wav" in (media_type or "").lower() else "mp3"
    return data, cfg["label"], cfg["model"], manifest_sha, ext
