# Boa 2.1 Release Notes

Boa 2.1 introduces the Observation Client and integration examples.

## Goal

External systems should be able to write today's reading into an existing Boa journey with the least possible friction:

- CI pipelines
- Robot Framework
- pytest suites
- GitLab CI
- GitHub Actions
- Jenkins
- n8n
- cron jobs
- custom scripts

This is not a full automation SDK. It is a small bridge into the Observation Notebook.

## New Files

- `examples/python/boa_client.py` — Observation-only Python helpers
- `examples/python/submit_observation.py` — CLI
- `examples/python/README.md` — Python + CLI examples
- `examples/n8n/README.md` — n8n / curl examples
- `docs/automation-client.md` — Observation Client guide
- `docs/observation-client-ai-prompt.md` — prompt for AI-assisted integrations
- `docs/release-notes-2.1.md` — this file

## Core API

```python
from boa_client import submit_observation

submit_observation(
    base_url="http://127.0.0.1:8000",
    product="Lantern Vale",
    version="1.6",
    starlight=73,
    summary="The journey is moving with steady light.",
    open_bug_count=5,
)
```

The journey must already exist in Boa. Create it in the UI or import it from YAML first.

## Core Functions

- `get_timeline`
- `find_release`
- `resolve_release_id`
- `get_observation`
- `submit_today_reading`
- `submit_current_storms`
- `submit_observation`

Compatibility aliases remain for older scripts:

- `submit_starlight`
- `submit_bug_snapshot`

Optional `BoaClient` wrapper pins `base_url` and `timeout`.

## Product Mapping

- `summary` writes **Where are we now?**
- `detail` writes markdown Page Notes
- `starlight` writes the Starlight reading
- `metrics` writes optional Notes Behind The Reading
- `open_bug_count` writes Current Storms

Unknown storms are omitted. Zero known troubles are sent as `open_bug_count=0`.

## n8n / Raw HTTP

For non-Python systems, use the endpoints documented in `examples/n8n/README.md`:

- `GET /api/timeline?galaxy={product_slug}`
- `PUT /api/releases/{id}/observation`
- `POST /api/releases/{id}/bug-snapshots`

## Scope

The Observation Client does not:

- create journeys
- edit journeys
- add or edit milestones
- acknowledge marks
- configure Engine Room settings
