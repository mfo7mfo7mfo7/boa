# Starlight API

Boa's `Starlight` represents journey readiness.

This guide shows:

- how to create a release
- how to submit the current starlight state
- how to use markdown detail and optional metrics
- how to query the trail and timeline output

## 1. Create a Release

Create a release first so you have a `release_id`.

```bash
curl -X POST http://127.0.0.1:8000/api/releases \
  -H 'Content-Type: application/json' \
  -d '{
    "product": "LighthouseOS",
    "version": "5.7",
    "secret": "boa-light-57"
  }'
```

Example response:

```json
{
  "id": 22,
  "product": "LighthouseOS",
  "version": "5.7",
  "secret": "boa-light-57",
  "milestones": []
}
```

## 2. Update the Current Starlight State

Endpoint:

`POST /api/releases/{release_id}/starlight`

Payload summary:

- `starlight`: 0 to 100
- `whisper`: one-line summary
- `detail.type`: currently fixed to `markdown`
- `detail.content`: markdown content
- `metrics`: optional
- `observed_on`: optional; if omitted, today is used

```bash
curl -X POST http://127.0.0.1:8000/api/releases/22/starlight \
  -H 'Content-Type: application/json' \
  -d '{
    "starlight": 73,
    "whisper": "Release confidence is gathering steadily.",
    "detail": {
      "type": "markdown",
      "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
    },
    "metrics": {
      "done": 16,
      "total": 20,
      "blocked": 1
    },
    "observed_on": "2026-06-18"
  }'
```

Example response:

```json
{
  "release": "LighthouseOS-5.7",
  "starlight": 73,
  "whisper": "Release confidence is gathering steadily.",
  "detail": {
    "type": "markdown",
    "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
  },
  "metrics": {
    "done": 16,
    "total": 20,
    "blocked": 1
  },
  "observed_on": "2026-06-18",
  "trail": [
    {
      "date": "2026-06-18",
      "starlight": 73,
      "whisper": "Release confidence is gathering steadily.",
      "detail": {
        "type": "markdown",
        "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
      },
      "metrics": {
        "done": 16,
        "total": 20,
        "blocked": 1
      }
    }
  ]
}
```

## 3. Update Whisper or Detail Without Creating a New Trail Event

Boa's trail rule is:

- if `starlight` changes, create a new trail event
- if `starlight` stays the same, update the current state only

For example, keeping the same `73`:

```bash
curl -X POST http://127.0.0.1:8000/api/releases/22/starlight \
  -H 'Content-Type: application/json' \
  -d '{
    "starlight": 73,
    "whisper": "Documentation updated quietly.",
    "detail": {
      "type": "markdown",
      "content": "Documentation updated.\n\nNo readiness change yet."
    },
    "metrics": {
      "done": 16,
      "total": 20,
      "blocked": 1
    },
    "observed_on": "2026-06-19"
  }'
```

This updates the current starlight state, but does not add a new star to the trail.

## 4. Query Starlight for One Release

Endpoint:

`GET /api/releases/{release_id}/starlight`

```bash
curl http://127.0.0.1:8000/api/releases/22/starlight
```

This returns:

- current starlight
- latest whisper
- markdown detail
- optional metrics
- meaningful trail events only

## 5. Query Starlight Through the Timeline

Endpoint:

`GET /api/timeline`

Or for a single galaxy:

`GET /api/timeline?galaxy=lighthouseos`

```bash
curl http://127.0.0.1:8000/api/timeline?galaxy=lighthouseos
```

The response includes:

- `starlight`
- `starlight_trail`

Example fragment:

```json
[
  {
    "id": 22,
    "product": "LighthouseOS",
    "version": "5.7",
    "bug_snapshots": [],
    "starlight": {
      "release_id": 22,
      "starlight": 73,
      "whisper": "Documentation updated quietly.",
      "detail": {
        "type": "markdown",
        "content": "Documentation updated.\n\nNo readiness change yet."
      },
      "metrics": {
        "done": 16,
        "total": 20,
        "blocked": 1
      },
      "observed_on": "2026-06-19",
      "updated_at": "2026-06-20T00:00:00+00:00"
    },
    "starlight_trail": [
      {
        "date": "2026-06-18",
        "starlight": 73,
        "whisper": "Release confidence is gathering steadily.",
        "detail": {
          "type": "markdown",
          "content": "## Completed\n\n- Release confidence is gathering steadily\n- Final integration feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\nToken refresh edge cases still need one more pass."
        },
        "metrics": {
          "done": 16,
          "total": 20,
          "blocked": 1
        }
      }
    ]
  }
]
```

## Validation Notes

- `starlight` must be in `0..100`
- `detail.type` must currently be `markdown`
- `detail.content` is limited to 20KB
- `metrics` is optional
- if `metrics` is present:
  - `done >= 0`
  - `total >= 0`
  - `blocked >= 0`
  - `done <= total`
  - `blocked <= total`

## Recommended Shape

The recommended payload shape looks like this:

```json
{
  "starlight": 78,
  "whisper": "Feature integration completed.",
  "detail": {
    "type": "markdown",
    "content": "## Completed\n\n- Feature integration completed\n- Release notes draft is ready\n\n## In Progress\n\n- Final compatibility sweep"
  },
  "metrics": {
    "done": 16,
    "total": 18,
    "blocked": 1
  },
  "observed_on": "2026-06-18"
}
```
