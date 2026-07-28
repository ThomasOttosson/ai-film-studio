"""Fail-fast on insecure JWT config (app.auth._require_secret_key)."""

import pytest

from app import auth


def test_rejects_missing_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError):
        auth._require_secret_key()


def test_rejects_empty_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "")
    with pytest.raises(RuntimeError):
        auth._require_secret_key()


def test_rejects_insecure_default(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "change-me-in-production")
    with pytest.raises(RuntimeError):
        auth._require_secret_key()


def test_accepts_real_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "a-proper-random-secret")
    assert auth._require_secret_key() == "a-proper-random-secret"
