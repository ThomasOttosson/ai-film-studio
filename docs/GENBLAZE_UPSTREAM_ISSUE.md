# Upstream issue draft — genblaze-stability-audio

Ready to file at https://github.com/backblaze-labs/genblaze/issues (or turn
into a PR). Paste from the divider down.

---

## `StabilityAudioProvider` sends `application/x-www-form-urlencoded`; Stability requires `multipart/form-data` (every text-to-audio call 400s)

**Package:** `genblaze-stability-audio` 0.3.2 (with `genblaze-core` 0.3.7)

### Summary
Every `StabilityAudioProvider` generation fails before any audio is produced. The provider posts the Stability text-to-audio form with httpx's `data=` argument, which serialises the body as `application/x-www-form-urlencoded`. Stability's text-to-audio endpoint only accepts `multipart/form-data`, so it rejects the request with HTTP 400.

### Steps to reproduce
```python
from genblaze_core import Pipeline, Modality
from genblaze_stability_audio import StabilityAudioProvider

run, manifest = Pipeline("music").step(
    StabilityAudioProvider(),          # STABILITY_API_KEY in env
    model="stable-audio-2.5",
    prompt="epic orchestral trailer music",
    modality=Modality.AUDIO,
    duration=15,
).run(timeout=120)
```

### Actual result
The step fails and Stability returns:

```
Stability Audio API error 400: {"errors":["content-type: must be multipart/form-data"],"id":"...","name":"bad_request"}
```

(The API key is valid and auth succeeds — this is purely the request Content-Type.)

### Root cause
`genblaze_stability_audio/provider.py` (~line 223):

```python
response = client.post(
    _API_URL,
    data=form_data,          # httpx: dict via data= => application/x-www-form-urlencoded
    headers={
        "Authorization": f"Bearer {api_key}",
        "Accept": "audio/*",
    },
)
```

With httpx, passing a `dict` to `data=` encodes the body as
`application/x-www-form-urlencoded`. Stability's endpoint requires
`multipart/form-data`.

### Fix (one line)
Send the fields as multipart by using `files=` instead of `data=` (httpx sets
`multipart/form-data` automatically when `files=` is present):

```python
response = client.post(
    _API_URL,
    files={key: (None, str(value)) for key, value in form_data.items()},
    headers={
        "Authorization": f"Bearer {api_key}",
        "Accept": "audio/*",
    },
)
```

`(None, value)` tuples make each field a form field (no filename), which is the
correct multipart encoding for these text parameters.

### Secondary note — hardcoded endpoint / model
`_API_URL` (~line 54) is hardcoded to the `stable-audio-2` path:

```python
_API_URL = "https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio"
```

and no `model` form field is sent, so the `model=` passed to `.step()` (e.g.
`stable-audio-2.5`) does not influence which model Stability actually runs — the
`stable-audio-2` endpoint always serves the request. If callers are meant to be
able to select `stable-audio-2.5`, the provider should either target the
version-specific endpoint or forward a `model` form field. As-is, provenance
that records `stable-audio-2.5` would be inaccurate; the endpoint that runs is
`stable-audio-2`.

### Environment
- `genblaze-stability-audio==0.3.2`, `genblaze-core==0.3.7`, `httpx` 0.28.x
- Python 3.12
