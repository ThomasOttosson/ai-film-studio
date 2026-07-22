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


def test_generate_music_caps_duration_and_labels_ext(monkeypatch):
    captured = {}

    def fake_run(pipeline, timeout):
        return b"AUDIO", "sha999", "audio/mpeg"

    def fake_step(self, provider, **kwargs):
        captured.update(kwargs)
        return self

    monkeypatch.setattr(gb, "_run", fake_run)
    monkeypatch.setattr(gb.Pipeline, "step", fake_step)

    data, provider, model, sha, ext = gb.generate_music(
        "epic score", duration_seconds=5000
    )

    assert provider == "gmicloud"
    assert model == "minimax-music-2.5"
    assert ext == "mp3"
    assert captured["duration_seconds"] == gb.MUSIC_MAX_SECONDS
