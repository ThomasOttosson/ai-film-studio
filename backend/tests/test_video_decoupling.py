"""Tests that scene video no longer requires audio (M2 decoupling)."""

import pytest

from app.schemas.images import VideoRequest
from app.services import luma_service


@pytest.fixture
def stub_luma(monkeypatch):
    monkeypatch.setenv("LUMA_API_KEY", "test-key")
    monkeypatch.setattr(
        luma_service, "create_luma_video", lambda **kw: "https://luma/v.mp4"
    )
    monkeypatch.setattr(
        luma_service, "upload_video_to_b2", lambda data, name: "https://b2/v.mp4"
    )
    calls = {"merge": 0, "raw": 0}
    monkeypatch.setattr(
        luma_service,
        "merge_video_with_audio",
        lambda **kw: calls.__setitem__("merge", calls["merge"] + 1) or b"merged",
    )
    monkeypatch.setattr(
        luma_service,
        "read_video_bytes",
        lambda url: calls.__setitem__("raw", calls["raw"] + 1) or b"raw",
    )
    return calls


def test_video_without_audio_skips_merge(stub_luma):
    request = VideoRequest(
        scene_title="S",
        image_url="https://img.png",
        audio_url=None,
        scene_length=5,
    )

    response = luma_service.generate_ai_video_from_scene(request)

    assert response.video_url == "https://b2/v.mp4"
    assert stub_luma["raw"] == 1
    assert stub_luma["merge"] == 0


def test_video_with_audio_still_merges(stub_luma):
    request = VideoRequest(
        scene_title="S",
        image_url="https://img.png",
        audio_url="https://audio.mp3",
        scene_length=5,
    )

    luma_service.generate_ai_video_from_scene(request)

    assert stub_luma["merge"] == 1
    assert stub_luma["raw"] == 0


def test_video_requires_only_image(stub_luma):
    request = VideoRequest(
        scene_title="S",
        image_url="",
        audio_url=None,
        scene_length=5,
    )

    with pytest.raises(Exception) as exc:
        luma_service.generate_ai_video_from_scene(request)

    # 400, not the old "image and audio required".
    assert "image_url is required" in str(exc.value.detail)
