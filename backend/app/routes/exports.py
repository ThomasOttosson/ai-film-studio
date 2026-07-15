import ipaddress
import json
import mimetypes
import os
import socket
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from .projects import accessible_project

router = APIRouter(prefix="/api/projects", tags=["Exports"])

_MAX_MEDIA_BYTES = 2 * 1024 * 1024 * 1024
_CHUNK_SIZE = 1024 * 1024


def _safe_name(value: str, fallback: str) -> str:
    cleaned = "".join(
        char.lower() if char.isalnum() else "-"
        for char in (value or "").strip()
    )
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    return cleaned[:120] or fallback


def _remove_file(path: str) -> None:
    try:
        os.remove(path)
    except FileNotFoundError:
        pass


def _extension(url: str, content_type: str | None, fallback: str) -> str:
    path_suffix = Path(unquote(urlparse(url).path)).suffix.lower()
    if 1 < len(path_suffix) <= 10:
        return path_suffix

    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip())
        if guessed:
            return guessed

    return fallback


def _ensure_public_http_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Unsupported media URL")

    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or 443)
    except socket.gaierror as error:
        raise ValueError("Media host could not be resolved") from error

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError("Private or local media URLs are not allowed")


def _b2_location(url: str) -> tuple[str, str] | None:
    endpoint = (os.getenv("B2_ENDPOINT_URL") or "").rstrip("/")
    bucket = os.getenv("B2_BUCKET_NAME") or ""
    if not endpoint or not bucket:
        return None

    parsed_url = urlparse(url)
    parsed_endpoint = urlparse(endpoint)
    if parsed_url.scheme != parsed_endpoint.scheme or parsed_url.netloc != parsed_endpoint.netloc:
        return None

    prefix = f"/{bucket}/"
    if not parsed_url.path.startswith(prefix):
        return None

    return bucket, unquote(parsed_url.path[len(prefix):])


def _write_b2_file(archive: zipfile.ZipFile, archive_name: str, url: str) -> None:
    location = _b2_location(url)
    if location is None:
        raise ValueError("URL is not a configured Backblaze B2 object")

    bucket, object_key = location
    s3_client = boto3.client(
        "s3",
        endpoint_url=os.getenv("B2_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("B2_KEY_ID"),
        aws_secret_access_key=os.getenv("B2_APPLICATION_KEY"),
    )

    try:
        response = s3_client.get_object(Bucket=bucket, Key=object_key)
        content_length = int(response.get("ContentLength") or 0)
        if content_length > _MAX_MEDIA_BYTES:
            raise ValueError("Media file is too large to export")

        with archive.open(archive_name, "w") as destination:
            total = 0
            body = response["Body"]
            while True:
                chunk = body.read(_CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > _MAX_MEDIA_BYTES:
                    raise ValueError("Media file is too large to export")
                destination.write(chunk)
    except (BotoCoreError, ClientError) as error:
        raise ValueError(f"Backblaze download failed: {error}") from error


def _write_http_file(archive: zipfile.ZipFile, archive_name: str, url: str) -> str | None:
    _ensure_public_http_url(url)

    with httpx.Client(follow_redirects=True, timeout=60.0) as client:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            content_length = int(response.headers.get("content-length") or 0)
            if content_length > _MAX_MEDIA_BYTES:
                raise ValueError("Media file is too large to export")

            with archive.open(archive_name, "w") as destination:
                total = 0
                for chunk in response.iter_bytes(_CHUNK_SIZE):
                    total += len(chunk)
                    if total > _MAX_MEDIA_BYTES:
                        raise ValueError("Media file is too large to export")
                    destination.write(chunk)

            return response.headers.get("content-type")


def _add_media(
    archive: zipfile.ZipFile,
    url: str,
    folder: str,
    base_name: str,
    fallback_extension: str,
) -> str:
    location = _b2_location(url)
    initial_extension = _extension(url, None, fallback_extension)
    archive_name = f"{folder}/{base_name}{initial_extension}"

    if location is not None:
        _write_b2_file(archive, archive_name, url)
        return archive_name

    content_type = _write_http_file(archive, archive_name, url)
    desired_extension = _extension(url, content_type, fallback_extension)
    if desired_extension != initial_extension:
        # The file is already safely included. Keep its original archive name
        # rather than buffering it solely to rename it.
        return archive_name
    return archive_name


@router.get("/{project_id}/export/zip")
def export_project_zip(
    project_id: str,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, role = accessible_project(
        project_id,
        user,
        db,
        allowed_roles=("owner", "editor", "viewer"),
    )

    project_data = project.data or {}
    project_title = project.name or project_data.get("movieTitle") or "Untitled Project"
    safe_project_name = _safe_name(project_title, "ai-film-studio-project")

    temporary = tempfile.NamedTemporaryFile(
        prefix="ai-film-studio-export-",
        suffix=".zip",
        delete=False,
    )
    temporary_path = temporary.name
    temporary.close()

    missing_files: list[str] = []
    included_files: list[str] = []

    export_manifest = {
        "exportVersion": 1,
        "project": {
            "id": project.id,
            "name": project.name,
            "role": role,
            "ownerEmail": project.owner.email,
            "createdAt": project.created_at.isoformat(),
            "updatedAt": project.updated_at.isoformat(),
            "data": project_data,
        },
    }

    try:
        with zipfile.ZipFile(
            temporary_path,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=6,
            allowZip64=True,
        ) as archive:
            archive.writestr(
                "project.json",
                json.dumps(export_manifest, ensure_ascii=False, indent=2),
            )
            included_files.append("project.json")

            scenes = project_data.get("scenes") or []
            for index, scene in enumerate(scenes, start=1):
                if not isinstance(scene, dict):
                    continue

                scene_name = _safe_name(str(scene.get("title") or f"scene-{index}"), f"scene-{index}")
                base_name = f"{index:02d}-{scene_name}"
                media_definitions = (
                    ("imageUrl", "images", ".png"),
                    ("audioUrl", "audio", ".mp3"),
                    ("videoUrl", "videos", ".mp4"),
                )

                for field, folder, fallback_extension in media_definitions:
                    url = scene.get(field)
                    if not isinstance(url, str) or not url.strip():
                        continue
                    try:
                        included_files.append(
                            _add_media(
                                archive,
                                url.strip(),
                                folder,
                                base_name,
                                fallback_extension,
                            )
                        )
                    except Exception as error:
                        missing_files.append(f"{field} for scene {index}: {url} ({error})")

            final_movie_url = project_data.get("finalMovieUrl")
            if isinstance(final_movie_url, str) and final_movie_url.strip():
                try:
                    included_files.append(
                        _add_media(
                            archive,
                            final_movie_url.strip(),
                            "final",
                            f"{safe_project_name}-final-movie",
                            ".mp4",
                        )
                    )
                except Exception as error:
                    missing_files.append(
                        f"finalMovieUrl: {final_movie_url} ({error})"
                    )

            readme_lines = [
                "AI Film Studio project export",
                f"Project: {project_title}",
                f"Project ID: {project.id}",
                f"Exported by: {user.email}",
                f"Access role: {role}",
                "",
                "Included files:",
                *[f"- {name}" for name in included_files],
            ]
            if missing_files:
                readme_lines.extend(
                    ["", "Files that could not be downloaded:", *[f"- {item}" for item in missing_files]]
                )
                archive.writestr("missing-files.txt", "\n".join(missing_files))

            archive.writestr("README.txt", "\n".join(readme_lines))

    except Exception:
        _remove_file(temporary_path)
        raise

    background_tasks.add_task(_remove_file, temporary_path)

    return FileResponse(
        path=temporary_path,
        media_type="application/zip",
        filename=f"{safe_project_name}.zip",
        background=background_tasks,
    )
