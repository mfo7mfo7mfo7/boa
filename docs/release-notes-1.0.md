# Boa 1.0 Release Notes

Boa 1.0 establishes the first complete release-visualization experience:

- timeline-centric release journeys
- milestone acknowledgements and reminders
- Bug Wave risk storytelling
- Starlight readiness storytelling
- galaxy-scoped views
- Docker packaging and API usage docs

## Highlights

### Starlight Narrative System

Starlight is now a first-class release-readiness layer.

- `POST /api/releases/{release_id}/starlight`
- markdown `detail` support for narrative release observations
- optional `metrics` for structured support data
- meaningful Starlight Trail events only when readiness changes
- hoverable Night Log detail card in the timeline UI

This turns readiness into a journey signal instead of a KPI panel.

### Bug Wave Visual Normalization

Bug Wave now renders as normalized turbulence instead of raw bug-count height.

- wave apex aligns to a configurable Starlight sky height
- smoothing is applied without breaking the true peak contract
- low-risk releases stay calm instead of being over-amplified
- all-zero releases render as a flat, quiet sea

This keeps Bug Wave and Starlight inside the same visual story scale:

- sky = confidence
- sea = turbulence
- horizon = journey

### Galaxy Routes

Boa now supports two reading modes:

- `/` for the full universe
- `/:galaxySlug` for one product galaxy

Timeline data can also be filtered through:

- `GET /api/timeline?galaxy=fortisase`

Unknown galaxies render a branded empty state instead of a raw 404 page.

### Timeline and Interaction Polish

- Starlight hover cards now stay open while the pointer moves into the detail card
- old SVG tooltip remnants were removed
- Safari pinch-zoom drift for the fixed NOW guide was corrected with `visualViewport`-aware positioning
- folded journey controls and horizon presentation were refined

### Documentation and Delivery

Added usage documentation for:

- [Bug Wave API](bug-wave.md)
- [Starlight API](starlight.md)

Docker docs were refreshed and Compose entrypoints were aligned:

- `compose.yaml`

## API Summary

New or expanded release APIs in 1.0:

- `GET /api/timeline`
- `GET /api/timeline?galaxy=:slug`
- `GET /api/releases/{release_id}/bug-snapshots`
- `POST /api/releases/{release_id}/bug-snapshots`
- `GET /api/releases/{release_id}/starlight`
- `POST /api/releases/{release_id}/starlight`

## Operational Notes

- container default port: `8000`
- container database path: `/data/boa.db`
- fold-day tuning: `BOA_JOURNEY_FOLD_DAYS`

## Validation

Validated in this release cycle with:

- `node --check src/boa/static/app.js`
- `uv run pytest tests/test_api.py tests/test_api_hardening.py`

## Suggested Tag

- `v1.0.0`
