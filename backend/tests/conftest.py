import os

import pytest

# B2 vars so importing service modules never fails at collection time; tests
# mock the actual upload/boto3 boundary so no network calls occur.
os.environ.setdefault("B2_BUCKET_NAME", "test-bucket")
os.environ.setdefault("B2_ENDPOINT_URL", "https://s3.test")
os.environ.setdefault("B2_KEY_ID", "test-key-id")
os.environ.setdefault("B2_APPLICATION_KEY", "test-app-key")
# Non-default secret so importing app.auth (fail-fast on the insecure default)
# never breaks collection.
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-the-default")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import app.models  # noqa: E402,F401  (register models on Base.metadata)
from app.database import Base  # noqa: E402
from app.services import asset_service  # noqa: E402
from app.services.backblaze_service import B2UploadParams  # noqa: E402


@pytest.fixture
def db():
    """A fresh in-memory SQLite session with all tables created."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def captured_uploads(monkeypatch):
    """Replace the B2 upload with a capture so no network call happens."""
    calls: list[B2UploadParams] = []

    def fake_upload(params: B2UploadParams) -> str:
        calls.append(params)
        return f"https://b2.test/{params.key}"

    monkeypatch.setattr(asset_service, "upload_bytes", fake_upload)
    return calls
