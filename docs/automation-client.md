# Boa Observation Client

Boa's sample client is for writing observations into an existing journey.

It is intentionally not a full automation SDK. It does not create journeys, edit milestones, acknowledge marks, or configure the Engine Room.

## Design Goal

One small bridge from your system to Boa:

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

## Product Mapping

| Boa concept | Client field | API field |
|-------------|--------------|-----------|
| Today’s Reading | `summary` | `whisper` |
| Page Notes | `detail` | `detail.content` |
| Starlight | `starlight` | `starlight` |
| Notes Behind The Reading | `metrics` | `metrics` |
| Current Storms | `open_bug_count` | `open_bug_count` |

`open_bug_count=None` means storms are unknown and no snapshot is sent.

`open_bug_count=0` means zero known troubles and is sent to Boa.

## Core Functions

| Function | Purpose |
|----------|---------|
| `get_timeline(...)` | Read visible journeys |
| `find_release(...)` | Find an existing journey by product + version |
| `resolve_release_id(...)` | Resolve an existing journey id |
| `get_observation(...)` | Read the current Observation Notebook |
| `submit_today_reading(...)` | Submit Starlight, Today’s Reading, Page Notes, and optional facts |
| `submit_current_storms(...)` | Submit the known-troubles count |
| `submit_observation(...)` | Submit reading and/or storms in one call |

Compatibility aliases remain for older scripts:

| Alias | Use instead |
|-------|-------------|
| `submit_starlight(...)` | `submit_today_reading(...)` |
| `submit_bug_snapshot(...)` | `submit_current_storms(...)` |

## Raw HTTP Endpoints

| Action | Endpoint |
|--------|----------|
| Read all journeys | `GET /api/timeline` |
| Read one galaxy | `GET /api/timeline?galaxy={product_slug}` |
| Read Observation Notebook | `GET /api/releases/{release_id}/observation` |
| Submit Today’s Reading | `PUT /api/releases/{release_id}/observation` |
| Submit Current Storms | `POST /api/releases/{release_id}/bug-snapshots` |

Do not use the observation client for:

- `POST /api/releases`
- `PUT /api/releases/{release_id}`
- milestone create/update/delete
- acknowledgement endpoints
- Engine Room endpoints

Those belong to Boa's own UI and operator surfaces, not the observation bridge.

## Python And CLI Examples

See [examples/python](../examples/python/README.md).

## AI Integration Prompt

For another AI agent or automation builder, use [Observation Client AI Prompt](observation-client-ai-prompt.md).
