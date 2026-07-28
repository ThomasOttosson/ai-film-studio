"""Tests for the Genblaze wrapper: output retrieval + error-code mapping."""

from unittest.mock import MagicMock

import pytest

from app.services import genblaze_service as gb


class _FakeResult:
    """Mimics a genblaze PipelineResult (iterable -> (run, manifest))."""

    def __init__(self, failed=None, asset=None, sha="deadbeef"):
        self._failed = failed or []
        self._asset = asset
        self._sha = sha

    def failed_steps(self):
        return self._failed

    def succeeded_steps(self):
        step = MagicMock()
        step.assets = [self._asset] if self._asset else []
        return [step]

    def __iter__(self):
        manifest = MagicMock()
        manifest.canonical_hash = self._sha
        return iter([MagicMock(), manifest])


def _pipeline(result):
    pipe = MagicMock()
    pipe.run.return_value = result
    return pipe


def test_run_returns_bytes_sha_media_type(monkeypatch):
    asset = MagicMock()
    asset.url = "https://provider/out.png"
    asset.media_type = "image/png"
    monkeypatch.setattr(gb, "_fetch_bytes", lambda url: b"IMGDATA")

    data, sha, media_type = gb._run(
        _pipeline(_FakeResult(asset=asset, sha="abc123")), timeout=1
    )

    assert data == b"IMGDATA"
    assert sha == "abc123"
    assert media_type == "image/png"


def test_content_policy_maps_to_422(monkeypatch):
    step = MagicMock()
    step.error_code = MagicMock(value="content_policy")
    step.error = "blocked by safety"

    with pytest.raises(gb.GenblazeGenerationError) as exc:
        gb._run(_pipeline(_FakeResult(failed=[step])), timeout=1)

    assert exc.value.status_code == 422


def test_rate_limit_maps_to_429(monkeypatch):
    step = MagicMock()
    step.error_code = MagicMock(value="rate_limit")
    step.error = "quota exceeded"

    with pytest.raises(gb.GenblazeGenerationError) as exc:
        gb._run(_pipeline(_FakeResult(failed=[step])), timeout=1)

    assert exc.value.status_code == 429


def test_no_output_asset_raises(monkeypatch):
    with pytest.raises(gb.GenblazeGenerationError):
        gb._run(_pipeline(_FakeResult(asset=None)), timeout=1)


def _capture_music(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        gb, "_run", lambda pipeline, timeout: (b"AUDIO", "sha999", "audio/mpeg")
    )
    monkeypatch.setattr(
        gb.Pipeline,
        "step",
        lambda self, provider, **kwargs: captured.update(kwargs) or self,
    )
    return captured


def test_generate_music_defaults_to_stability(monkeypatch):
    monkeypatch.delenv("MUSIC_PROVIDER", raising=False)
    captured = _capture_music(monkeypatch)

    data, provider, model, sha, ext = gb.generate_music(
        "epic score", duration_seconds=5000
    )

    assert provider == "stability"
    # 0.3.2 adapter hits Stability's stable-audio-2 endpoint (see shim); we
    # record what actually runs, not the SDK's advertised 2.5.
    assert model == "stable-audio-2"
    assert ext == "mp3"
    # Stability uses the 'duration' kwarg; duration is capped.
    assert captured["duration"] == gb.MUSIC_MAX_SECONDS


def test_generate_music_gmicloud_when_selected(monkeypatch):
    monkeypatch.setenv("MUSIC_PROVIDER", "gmicloud")
    captured = _capture_music(monkeypatch)

    data, provider, model, sha, ext = gb.generate_music(
        "x", duration_seconds=30
    )

    assert provider == "gmicloud"
    assert model == "minimax-music-2.5"
    # GMI uses the 'duration_seconds' kwarg.
    assert captured["duration_seconds"] == 30


def test_music_provider_env_var_switch(monkeypatch):
    monkeypatch.setenv("MUSIC_PROVIDER", "stability")
    assert gb.music_provider_env_var() == "STABILITY_API_KEY"
    monkeypatch.setenv("MUSIC_PROVIDER", "gmicloud")
    assert gb.music_provider_env_var() == "GMI_API_KEY"
