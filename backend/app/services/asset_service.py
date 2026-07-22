"""Recording layer that ties generation output to versioned B2 storage.

Every generated deliverable (image, audio, video, final movie, and — in M2 —
music) flows through :func:`record_generation`. It:

1. Computes the next version number for the (project, scene, asset_type) scope.
2. Builds a structured B2 key and uploads the bytes with provenance metadata.
3. Records an AssetVersion row and moves the asset's "current" pointer.

Upload happens BEFORE the DB write so a failed upload never leaves a dangling
row. Old versions and old B2 objects are never mutated or deleted.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Asset, AssetVersion
from app.services.backblaze_service import B2UploadParams, upload_bytes

# asset_type values: scene-level image | audio | video; project-level movie
# (final film) and music (added in M2).
_CONTENT_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "mp4": "video/mp4",
}


def content_type_for_ext(ext: str) -> str:
    return _CONTENT_TYPES.get(ext.lower().lstrip("."), "application/octet-stream")


def build_b2_key(
    project_id: str,
    scene_id: str | None,
    asset_type: str,
    version_number: int,
    ext: str,
) -> str:
    """projects/{pid}/scenes/{sid}/{type}/v{n}/{uuid}.{ext} (scene-level)
    or projects/{pid}/{type}/v{n}/{uuid}.{ext} (project-level)."""
    name = f"{uuid.uuid4()}.{ext.lower().lstrip('.')}"
    if scene_id is None:
        return f"projects/{project_id}/{asset_type}/v{version_number}/{name}"
    return (
        f"projects/{project_id}/scenes/{scene_id}"
        f"/{asset_type}/v{version_number}/{name}"
    )


def get_asset(
    db: Session,
    project_id: str,
    scene_id: str | None,
    asset_type: str,
) -> Asset | None:
    stmt = select(Asset).where(
        Asset.project_id == project_id,
        Asset.asset_type == asset_type,
    )
    if scene_id is None:
        stmt = stmt.where(Asset.scene_id.is_(None))
    else:
        stmt = stmt.where(Asset.scene_id == scene_id)
    return db.scalar(stmt)


def _next_version_number(db: Session, asset: Asset | None) -> int:
    if asset is None:
        return 1
    current_max = db.scalar(
        select(func.max(AssetVersion.version_number)).where(
            AssetVersion.asset_id == asset.id
        )
    )
    return (current_max or 0) + 1


def record_generation(
    db: Session,
    *,
    project_id: str,
    scene_id: str | None,
    asset_type: str,
    provider: str | None,
    model: str | None,
    prompt: str | None,
    file_bytes: bytes,
    ext: str,
    duration_seconds: float | None = None,
    manifest_sha: str | None = None,
) -> AssetVersion:
    """Upload the bytes and record a new AssetVersion, updating the pointer."""
    scene_key = str(scene_id) if scene_id is not None else None
    asset = get_asset(db, project_id, scene_key, asset_type)
    version_number = _next_version_number(db, asset)
    key = build_b2_key(project_id, scene_key, asset_type, version_number, ext)

    metadata = {
        "provider": provider or "",
        "model": model or "",
        "prompt": prompt or "",
        "project-id": project_id,
        "asset-type": asset_type,
        "version": str(version_number),
        "created-at": datetime.now(timezone.utc).isoformat(),
    }
    if scene_key is not None:
        metadata["scene-id"] = scene_key
    if manifest_sha:
        metadata["genblaze-manifest"] = manifest_sha

    # 1) Upload first — a failure here leaves no DB row behind.
    url = upload_bytes(
        B2UploadParams(
            data=file_bytes,
            key=key,
            content_type=content_type_for_ext(ext),
            metadata=metadata,
        )
    )

    # 2) Record. If this fails after a successful upload, roll back and surface;
    #    the (now orphaned) B2 object is harmless and never referenced.
    try:
        if asset is None:
            asset = Asset(
                project_id=project_id,
                scene_id=scene_key,
                asset_type=asset_type,
            )
            db.add(asset)
            db.flush()

        version = AssetVersion(
            asset_id=asset.id,
            version_number=version_number,
            b2_key=key,
            b2_url=url,
            provider=provider,
            model=model,
            prompt=prompt,
            manifest_sha=manifest_sha,
            size_bytes=len(file_bytes),
            duration_seconds=duration_seconds,
        )
        db.add(version)
        db.flush()

        asset.current_version_id = version.id
        db.commit()
        db.refresh(version)
        return version
    except Exception:
        db.rollback()
        raise


def record_generation_isolated(**kwargs) -> AssetVersion:
    """record_generation in a short-lived session for callers without one.

    Used by the generation service functions, which run inside worker threads
    (queue path) or the request threadpool (direct endpoints). Column
    attributes (e.g. ``b2_url``) remain readable after the session closes.
    """
    db = SessionLocal()
    try:
        return record_generation(db, **kwargs)
    finally:
        db.close()
