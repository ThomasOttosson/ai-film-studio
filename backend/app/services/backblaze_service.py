import os
from dataclasses import dataclass, field
from io import BytesIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

# S3 caps total user-defined object metadata at 2KB. We keep individual values
# small (the prompt is truncated here; the full prompt is stored in the DB).
MAX_METADATA_VALUE_CHARS = 1024


@dataclass
class B2UploadParams:
    """Structured parameters for a single B2 upload."""

    data: bytes
    key: str
    content_type: str
    metadata: dict[str, str] = field(default_factory=dict)


def _sanitize_metadata(metadata: dict[str, str]) -> dict[str, str]:
    """Make values safe for S3 metadata (ASCII, single-line, bounded length)."""
    clean: dict[str, str] = {}
    for name, value in metadata.items():
        if value is None:
            continue
        text = str(value).replace("\n", " ").replace("\r", " ")
        text = text.encode("ascii", "ignore").decode("ascii").strip()
        if len(text) > MAX_METADATA_VALUE_CHARS:
            text = text[:MAX_METADATA_VALUE_CHARS]
        clean[name] = text
    return clean


def _s3_client():
    bucket_name = os.getenv("B2_BUCKET_NAME")
    endpoint_url = os.getenv("B2_ENDPOINT_URL")
    key_id = os.getenv("B2_KEY_ID")
    application_key = os.getenv("B2_APPLICATION_KEY")

    if not all([bucket_name, endpoint_url, key_id, application_key]):
        raise HTTPException(
            status_code=500,
            detail="Missing Backblaze B2 environment variables",
        )

    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
    )
    return client, bucket_name, endpoint_url


def upload_bytes(params: B2UploadParams) -> str:
    """Upload bytes to B2 at an explicit key with optional object metadata.

    Returns the same ``{endpoint}/{bucket}/{key}`` URL shape used before this
    refactor, so existing callers keep working unchanged.
    """
    client, bucket_name, endpoint_url = _s3_client()

    extra_args = {"ContentType": params.content_type}
    if params.metadata:
        extra_args["Metadata"] = _sanitize_metadata(params.metadata)

    try:
        client.upload_fileobj(
            BytesIO(params.data),
            bucket_name,
            params.key,
            ExtraArgs=extra_args,
        )
        return f"{endpoint_url}/{bucket_name}/{params.key}"
    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload to Backblaze B2: {str(error)}",
        )


# --- Legacy flat-prefix helpers -------------------------------------------
# Retained for callers that upload transient/working files (e.g. the Luma
# intermediate last-frame). Versioned deliverables go through asset_service.


def upload_image_to_b2(image_bytes: bytes, filename: str) -> str:
    return upload_bytes(
        B2UploadParams(
            data=image_bytes,
            key=f"generated-images/{filename}",
            content_type="image/png",
        )
    )


def upload_audio_to_b2(audio_bytes: bytes, filename: str) -> str:
    return upload_bytes(
        B2UploadParams(
            data=audio_bytes,
            key=f"generated-audio/{filename}",
            content_type="audio/mpeg",
        )
    )


def upload_video_to_b2(video_bytes: bytes, filename: str) -> str:
    return upload_bytes(
        B2UploadParams(
            data=video_bytes,
            key=f"generated-videos/{filename}",
            content_type="video/mp4",
        )
    )
