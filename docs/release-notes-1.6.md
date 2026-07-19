# Boa 1.6 Release Notes

Boa 1.6 replaces status submissions with one living observation.

## Highlights

### Observation Workspace

Each release now has an Observation Workspace that answers a single question: **Where are we now?** Instead of repeatedly submitting starlight reports, the user tends one evolving observation that stays with the journey.

### API Surface

- `GET /api/releases/{release_id}/observation`
- `PUT /api/releases/{release_id}/observation`

Both endpoints return an `ObservationWorkspaceResponse` with the current starlight state and the meaningful trail of changes. The workspace is an API/UI layer on top of the existing Starlight model; no new database tables were added for this release.

### Journey Language

The UI now asks:

- *Where are we now?* when no starlight has been observed.
- *Continue Observation* when a previous observation exists.
- *Continue the Journey* to save the next observation.

### Current Storms

The observation dialog includes a storms field so the user can record the current bug turbulence alongside the starlight confidence reading.

### Supporting Facts

Optional metrics (`done`, `total`, `blocked`) provide structured support for the narrative observation. They are folded away by default and only expanded when the journey needs extra structure.

### Trail Summary

Meaningful starlight changes are summarized inside the workspace, so the user can see how the journey has shifted over time without leaving the observation flow.

## Deliberate Product Decision

For 1.6 we intentionally avoided unnecessary database migrations. Observation is a lens on the existing Starlight model, not a separate data silo. This keeps the data model honest while letting the product feel like one continuous journey.

## Suggested Tag

- `v1.6.0`
