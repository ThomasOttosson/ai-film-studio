"""Retry/backoff behaviour: transient failures retried, permanent ones not."""

import pytest
from fastapi import HTTPException

from app.services import genblaze_service as gb
from app.services import luma_service as luma
from app.services.retry import retry_transient

_NO_SLEEP = lambda _delay: None  # noqa: E731
_NO_JITTER = lambda: 0.0  # noqa: E731


class _Transient(Exception):
    pass


class _Permanent(Exception):
    pass


def _retry(fn, **kw):
    return retry_transient(
        fn,
        is_retryable=lambda e: isinstance(e, _Transient),
        sleep=_NO_SLEEP,
        rng=_NO_JITTER,
        **kw,
    )


def test_transient_retried_then_succeeds():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] < 2:
            raise _Transient("429")
        return "ok"

    assert _retry(fn) == "ok"
    assert calls["n"] == 2


def test_permanent_not_retried():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise _Permanent("content filter")

    with pytest.raises(_Permanent):
        _retry(fn)
    assert calls["n"] == 1  # never retried


def test_transient_exhausts_attempts():
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        raise _Transient("still 503")

    with pytest.raises(_Transient):
        _retry(fn, attempts=3)
    assert calls["n"] == 3


def test_genblaze_classifier_retries_only_transient_codes():
    assert gb._is_retryable(
        gb.GenblazeGenerationError("rate limited", 429, retryable=True)
    )
    assert not gb._is_retryable(
        gb.GenblazeGenerationError("blocked", 422, retryable=False)
    )
    assert not gb._is_retryable(ValueError("unrelated"))


def test_luma_classifier():
    assert luma._luma_retryable(HTTPException(status_code=429))
    assert luma._luma_retryable(HTTPException(status_code=503))
    assert not luma._luma_retryable(HTTPException(status_code=400))
    assert not luma._luma_retryable(HTTPException(status_code=401))
    import requests

    assert luma._luma_retryable(requests.Timeout())
    assert luma._luma_retryable(requests.ConnectionError())
