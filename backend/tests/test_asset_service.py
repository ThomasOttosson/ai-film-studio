"""Tests for the versioned recording layer (asset_service)."""

from app.models import Asset, AssetVersion, Project
from app.routes.asset_versions import _list_versions, _restore_version
from app.services import asset_service


def _record(db, **overrides):
    params = {
        "project_id": "project-1",
        "scene_id": "2",
        "asset_type": "image",
        "provider": "openai",
        "model": "gpt-image-1",
        "prompt": "a cinematic still",
        "file_bytes": b"bytes",
        "ext": "png",
    }
    params.update(overrides)
    return asset_service.record_generation(db, **params)


def test_scene_level_key_and_metadata(db, captured_uploads):
    version = _record(db, prompt="line one\nline two")

    assert version.version_number == 1
    params = captured_uploads[-1]
    assert params.key.startswith("projects/project-1/scenes/2/image/v1/")
    assert params.key.endswith(".png")
    assert params.content_type == "image/png"

    meta = params.metadata
    assert meta["provider"] == "openai"
    assert meta["model"] == "gpt-image-1"
    assert meta["project-id"] == "project-1"
    assert meta["scene-id"] == "2"
    assert meta["asset-type"] == "image"
    assert meta["version"] == "1"
    assert "created-at" in meta
    # Full (untruncated, multi-line) prompt is kept in the DB row.
    assert version.prompt == "line one\nline two"
    assert version.b2_url.endswith(params.key)
    assert version.size_bytes == len(b"bytes")


def test_project_level_key_has_no_scene_segment(db, captured_uploads):
    version = _record(
        db,
        project_id="p",
        scene_id=None,
        asset_type="movie",
        ext="mp4",
    )
    params = captured_uploads[-1]
    assert params.key.startswith("projects/p/movie/v1/")
    assert "/scenes/" not in params.key
    assert "scene-id" not in params.metadata
    assert version.version_number == 1


def test_version_increment_and_pointer_moves(db, captured_uploads):
    v1 = _record(db, project_id="p", scene_id="1")
    v2 = _record(db, project_id="p", scene_id="1")

    assert v1.version_number == 1
    assert v2.version_number == 2

    asset = asset_service.get_asset(db, "p", "1", "image")
    assert asset.current_version_id == v2.id

    keys = [c.key for c in captured_uploads]
    assert "/image/v1/" in keys[0]
    assert "/image/v2/" in keys[1]


def test_single_asset_per_scope(db, captured_uploads):
    _record(db, project_id="p", scene_id="1")
    _record(db, project_id="p", scene_id="1")

    assets = (
        db.query(Asset)
        .filter_by(project_id="p", scene_id="1", asset_type="image")
        .all()
    )
    assert len(assets) == 1

    versions = (
        db.query(AssetVersion).filter_by(asset_id=assets[0].id).all()
    )
    assert len(versions) == 2


def test_distinct_scopes_get_distinct_assets(db, captured_uploads):
    _record(db, project_id="p", scene_id="1", asset_type="image")
    _record(db, project_id="p", scene_id="1", asset_type="audio")
    _record(db, project_id="p", scene_id="2", asset_type="image")

    assert db.query(Asset).count() == 3


def test_restore_moves_pointer_and_updates_blob(db, captured_uploads):
    project = Project(
        id="p",
        owner_id=1,
        name="Test",
        data={"scenes": [{"id": 1, "title": "S1"}]},
    )
    db.add(project)
    db.commit()

    v1 = _record(db, project_id="p", scene_id="1")
    v2 = _record(db, project_id="p", scene_id="1")

    asset = asset_service.get_asset(db, "p", "1", "image")
    assert asset.current_version_id == v2.id

    restored = _restore_version(db, project, "1", "image", v1.id)
    assert restored.is_current is True
    assert restored.id == v1.id

    db.refresh(asset)
    assert asset.current_version_id == v1.id

    db.refresh(project)
    assert project.data["scenes"][0]["imageUrl"] == v1.b2_url

    listing = _list_versions(db, "p", "1", "image")
    current = [v for v in listing.versions if v.is_current]
    assert len(current) == 1
    assert current[0].id == v1.id
    # Newest first.
    assert listing.versions[0].version_number == 2


def test_restore_project_level_updates_final_movie_url(db, captured_uploads):
    project = Project(id="p", owner_id=1, name="Test", data={})
    db.add(project)
    db.commit()

    v1 = _record(db, project_id="p", scene_id=None, asset_type="movie", ext="mp4")
    _record(db, project_id="p", scene_id=None, asset_type="movie", ext="mp4")

    _restore_version(db, project, None, "movie", v1.id)

    db.refresh(project)
    assert project.data["finalMovieUrl"] == v1.b2_url
