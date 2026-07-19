# Bug Wave API

Boa's `Bug Wave` is derived from a release's bug snapshots.

This guide shows:

- how to create a release
- how to submit bug snapshots
- how to query the timeline data used by the Bug Wave

## 1. Create a Release

Create a release first so you have a `release_id`.

```bash
curl -X POST http://127.0.0.1:8000/api/releases \
  -H 'Content-Type: application/json' \
  -d '{
    "product": "FortiSASE",
    "version": "26.8",
    "secret": "boa-268"
  }'
```

Example response:

```json
{
  "id": 21,
  "product": "FortiSASE",
  "version": "26.8",
  "secret": "boa-268",
  "milestones": []
}
```

## 2. Add a Bug Snapshot

Endpoint:

`POST /api/releases/{release_id}/bug-snapshots`

The minimum payload currently requires:

- `open_bug_count`
- `signal_type` is optional and defaults to `total`

```bash
curl -X POST http://127.0.0.1:8000/api/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 37
  }'
```

```bash
curl -X POST http://127.0.0.1:8000/api/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 52,
    "signal_type": "total"
  }'
```

Example response:

```json
{
  "id": 9,
  "observed_at": "2026-06-20T12:00:00+00:00",
  "signal_type": "total",
  "open_bug_count": 52,
  "quality": "normal",
  "quality_reason": null
}
```

## 3. Query Bug Snapshots for One Release

Endpoint:

`GET /api/releases/{release_id}/bug-snapshots`

```bash
curl http://127.0.0.1:8000/api/releases/21/bug-snapshots
```

Example response:

```json
[
  {
    "id": 8,
    "observed_at": "2026-06-18T12:00:00+00:00",
    "signal_type": "total",
    "open_bug_count": 37,
    "quality": "normal",
    "quality_reason": null
  },
  {
    "id": 9,
    "observed_at": "2026-06-20T12:00:00+00:00",
    "signal_type": "total",
    "open_bug_count": 52,
    "quality": "normal",
    "quality_reason": null
  }
]
```

## 4. Query Timeline Data Used by Bug Wave

Endpoint:

`GET /api/timeline`

Or for a single galaxy:

`GET /api/timeline?galaxy=fortisase`

```bash
curl http://127.0.0.1:8000/api/timeline?galaxy=fortisase
```

The `bug_snapshots` array in the response is the data source used by the frontend Bug Wave.

```json
[
  {
    "id": 21,
    "product": "FortiSASE",
    "version": "26.8",
    "secret": "boa-268",
    "milestones": [],
    "bug_snapshots": [
      {
        "id": 8,
        "observed_at": "2026-06-18T12:00:00+00:00",
        "signal_type": "total",
        "open_bug_count": 37,
        "quality": "normal",
        "quality_reason": null
      },
      {
        "id": 9,
        "observed_at": "2026-06-20T12:00:00+00:00",
        "signal_type": "total",
        "open_bug_count": 52,
        "quality": "normal",
        "quality_reason": null
      }
    ],
    "starlight": null,
    "starlight_trail": []
  }
]
```

## 5. Plugin Ingest Version

If a plugin is sending bug snapshots, use:

`POST /api/plugins/{plugin_name}/releases/{release_id}/bug-snapshots`

For example:

```bash
curl -X POST http://127.0.0.1:8000/api/plugins/manual_bug_snapshot/releases/21/bug-snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "open_bug_count": 44,
    "signal_type": "total"
  }'
```

## Notes

- `open_bug_count` must be a non-negative integer.
- Boa currently treats `bug_snapshots` as the raw source data for the Bug Wave.
- The frontend normalizes these snapshots into wave height; it does not render raw absolute bug-count bars.

## Milestone Email and Acknowledgements

Milestones may include an optional `email` field for the Email Ack Workflow. Bug Wave remains focused on bug snapshots and known troubles; the `email` field does not affect wave calculation.
