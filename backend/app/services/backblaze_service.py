import os
from io import BytesIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException


def upload_image_to_b2(image_bytes: bytes, filename: str) -> str:
    bucket_name = os.getenv("B2_BUCKET_NAME")
    endpoint_url = os.getenv("B2_ENDPOINT_URL")
    key_id = os.getenv("B2_KEY_ID")
    application_key = os.getenv("B2_APPLICATION_KEY")

    if not all([bucket_name, endpoint_url, key_id, application_key]):
        raise HTTPException(
            status_code=500,
            detail="Missing Backblaze B2 environment variables",
        )

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
    )

    object_key = f"generated-images/{filename}"

    try:
        s3_client.upload_fileobj(
            BytesIO(image_bytes),
            bucket_name,
            object_key,
            ExtraArgs={"ContentType": "image/png"},
        )

        return f"{endpoint_url}/{bucket_name}/{object_key}"

    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image to Backblaze B2: {str(error)}",
        )


def upload_audio_to_b2(audio_bytes: bytes, filename: str) -> str:
    bucket_name = os.getenv("B2_BUCKET_NAME")
    endpoint_url = os.getenv("B2_ENDPOINT_URL")
    key_id = os.getenv("B2_KEY_ID")
    application_key = os.getenv("B2_APPLICATION_KEY")

    if not all([bucket_name, endpoint_url, key_id, application_key]):
        raise HTTPException(
            status_code=500,
            detail="Missing Backblaze B2 environment variables",
        )

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
    )

    object_key = f"generated-audio/{filename}"

    try:
        s3_client.upload_fileobj(
            BytesIO(audio_bytes),
            bucket_name,
            object_key,
            ExtraArgs={"ContentType": "audio/mpeg"},
        )

        return f"{endpoint_url}/{bucket_name}/{object_key}"

    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload audio to Backblaze B2: {str(error)}",
        )


def upload_video_to_b2(video_bytes: bytes, filename: str) -> str:
    bucket_name = os.getenv("B2_BUCKET_NAME")
    endpoint_url = os.getenv("B2_ENDPOINT_URL")
    key_id = os.getenv("B2_KEY_ID")
    application_key = os.getenv("B2_APPLICATION_KEY")

    if not all([bucket_name, endpoint_url, key_id, application_key]):
        raise HTTPException(
            status_code=500,
            detail="Missing Backblaze B2 environment variables",
        )

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=key_id,
        aws_secret_access_key=application_key,
    )

    object_key = f"generated-videos/{filename}"

    try:
        s3_client.upload_fileobj(
            BytesIO(video_bytes),
            bucket_name,
            object_key,
            ExtraArgs={"ContentType": "video/mp4"},
        )

        return f"{endpoint_url}/{bucket_name}/{object_key}"

    except (BotoCoreError, ClientError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload video to Backblaze B2: {str(error)}",
        )
