"""Tests for the B2 upload primitive (metadata + sanitization)."""

from unittest.mock import MagicMock

from app.services import backblaze_service
from app.services.backblaze_service import (
    MAX_METADATA_VALUE_CHARS,
    B2UploadParams,
)


def _mock_client(monkeypatch):
    fake_client = MagicMock()
    monkeypatch.setattr(
        backblaze_service.boto3, "client", lambda *a, **k: fake_client
    )
    return fake_client


def test_upload_sets_content_type_and_metadata(monkeypatch):
    client = _mock_client(monkeypatch)

    url = backblaze_service.upload_bytes(
        B2UploadParams(
            data=b"x",
            key="projects/p/scenes/1/image/v1/abc.png",
            content_type="image/png",
            metadata={"provider": "openai", "version": "1"},
        )
    )

    assert url.endswith("projects/p/scenes/1/image/v1/abc.png")
    _, kwargs = client.upload_fileobj.call_args
    extra = kwargs["ExtraArgs"]
    assert extra["ContentType"] == "image/png"
    assert extra["Metadata"]["provider"] == "openai"
    assert extra["Metadata"]["version"] == "1"


def test_metadata_is_sanitized(monkeypatch):
    client = _mock_client(monkeypatch)

    backblaze_service.upload_bytes(
        B2UploadParams(
            data=b"x",
            key="k",
            content_type="text/plain",
            metadata={"prompt": "line1\nline2 café"},
        )
    )

    _, kwargs = client.upload_fileobj.call_args
    prompt = kwargs["ExtraArgs"]["Metadata"]["prompt"]
    assert "\n" not in prompt
    # Non-ASCII stripped; newline collapsed to a space.
    assert prompt == "line1 line2 caf"


def test_metadata_value_truncated(monkeypatch):
    client = _mock_client(monkeypatch)

    backblaze_service.upload_bytes(
        B2UploadParams(
            data=b"x",
            key="k",
            content_type="text/plain",
            metadata={"prompt": "a" * 5000},
        )
    )

    _, kwargs = client.upload_fileobj.call_args
    prompt = kwargs["ExtraArgs"]["Metadata"]["prompt"]
    assert len(prompt) == MAX_METADATA_VALUE_CHARS


def test_no_metadata_when_empty(monkeypatch):
    client = _mock_client(monkeypatch)

    backblaze_service.upload_bytes(
        B2UploadParams(data=b"x", key="k", content_type="image/png")
    )

    _, kwargs = client.upload_fileobj.call_args
    assert "Metadata" not in kwargs["ExtraArgs"]
