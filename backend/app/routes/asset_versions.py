"""Version history + restore endpoints for generated assets.

Read (list) is allowed for any project role; restore requires owner/editor.
Restore moves the asset's "current" pointer and writes that version's URL back
into projects.data so the existing UI reflects it immediately. No new B2 object
is created on restore.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from ..auth import get_current_user
from ..database import get_db
from ..models import AssetVersion, User
from ..services.asset_service import get_asset
from .projects import accessible_project

router = APIRouter(prefix="/api/projects", tags=["Asset Versions"])

# asset_type -> (scene URL field, scene prompt field) in projects.data.
_SCENE_FIELDS = {
    "image": ("imageUrl", "imagePrompt"),
    "audio": ("audioUrl", "audioPrompt"),
    "video": ("videoUrl", "videoPrompt"),
}
# Project-level asset_type -> projects.data field.
_PROJECT_FIELDS = {
    "movie": "finalMovieUrl",
    "music": "musicUrl",
}


class AssetVersionResponse(BaseModel):
    id: int
    version_number: int
    b2_key: str
    b2_url: str
    provider: str | None
    model: str | None
    prompt: str | None
    size_bytes: int | None
    duration_seconds: float | None
    created_at: datetime
    is_current: bool


class AssetVersionListResponse(BaseModel):
    asset_id: int | None
    asset_type: str
    scene_id: str | None
    current_version_id: int | None
    versions: list[AssetVersionResponse]


def _serialize(version: AssetVersion, current_id: int | None) -> AssetVersionResponse:
    return AssetVersionResponse(
        id=version.id,
        version_number=version.version_number,
        b2_key=version.b2_key,
        b2_url=version.b2_url,
        provider=version.provider,
        model=version.model,
        prompt=version.prompt,
        size_bytes=version.size_bytes,
        duration_seconds=version.duration_seconds,
        created_at=version.created_at,
        is_current=version.id == current_id,
    )


def _list_versions(
    db: Session,
    project_id: str,
    scene_id: str | None,
    asset_type: str,
) -> AssetVersionListResponse:
    asset = get_asset(db, project_id, scene_id, asset_type)
    if asset is None:
        return AssetVersionListResponse(
            asset_id=None,
            asset_type=asset_type,
            scene_id=scene_id,
            current_version_id=None,
            versions=[],
        )

    versions = db.scalars(
        select(AssetVersion)
        .where(AssetVersion.asset_id == asset.id)
        .order_by(AssetVersion.version_number.desc())
    ).all()

    return AssetVersionListResponse(
        asset_id=asset.id,
        asset_type=asset_type,
        scene_id=scene_id,
        current_version_id=asset.current_version_id,
        versions=[_serialize(v, asset.current_version_id) for v in versions],
    )


def _restore_version(
    db: Session,
    project,
    scene_id: str | None,
    asset_type: str,
    version_id: int,
) -> AssetVersionResponse:
    asset = get_asset(db, project.id, scene_id, asset_type)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    version = db.scalar(
        select(AssetVersion).where(
            AssetVersion.id == version_id,
            AssetVersion.asset_id == asset.id,
        )
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")

    asset.current_version_id = version.id

    # Reflect the restored URL in projects.data so the existing UI updates.
    data = dict(project.data or {})
    if scene_id is None:
        field = _PROJECT_FIELDS.get(asset_type)
        if field:
            data[field] = version.b2_url
    else:
        url_field, prompt_field = _SCENE_FIELDS.get(
            asset_type, (None, None)
        )
        if url_field:
            scenes = data.get("scenes", [])
            for scene in scenes:
                if str(scene.get("id")) == str(scene_id):
                    scene[url_field] = version.b2_url
                    if version.prompt is not None:
                        scene[prompt_field] = version.prompt
                    break
    project.data = data
    flag_modified(project, "data")

    db.commit()
    db.refresh(version)
    return _serialize(version, asset.current_version_id)


# --- Scene-level ----------------------------------------------------------


@router.get(
    "/{project_id}/scenes/{scene_id}/assets/{asset_type}/versions",
    response_model=AssetVersionListResponse,
)
def list_scene_asset_versions(
    project_id: str,
    scene_id: str,
    asset_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessible_project(project_id, user, db)
    return _list_versions(db, project_id, scene_id, asset_type)


@router.post(
    "/{project_id}/scenes/{scene_id}/assets/{asset_type}"
    "/versions/{version_id}/restore",
    response_model=AssetVersionResponse,
)
def restore_scene_asset_version(
    project_id: str,
    scene_id: str,
    asset_type: str,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id, user, db, allowed_roles=("owner", "editor")
    )
    return _restore_version(db, project, scene_id, asset_type, version_id)


# --- Project-level (final movie, music) -----------------------------------


@router.get(
    "/{project_id}/assets/{asset_type}/versions",
    response_model=AssetVersionListResponse,
)
def list_project_asset_versions(
    project_id: str,
    asset_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessible_project(project_id, user, db)
    return _list_versions(db, project_id, None, asset_type)


@router.post(
    "/{project_id}/assets/{asset_type}/versions/{version_id}/restore",
    response_model=AssetVersionResponse,
)
def restore_project_asset_version(
    project_id: str,
    asset_type: str,
    version_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = accessible_project(
        project_id, user, db, allowed_roles=("owner", "editor")
    )
    return _restore_version(db, project, None, asset_type, version_id)
