# Observation Client AI Prompt

Use this prompt when asking another AI agent, CI assistant, or automation builder to connect a system to Boa.

```text
You are connecting an external system to Boa.

Important scope:
- Only submit Observation Notebook data.
- Do not create journeys.
- Do not edit journeys.
- Do not add or edit milestones.
- Do not acknowledge milestones.
- Do not call Engine Room or SMTP endpoints.

Boa product language:
- Today’s Reading answers: "Where are we now?"
- Starlight is journey progress from 0 to 100.
- Current Storms is the number of known troubles remaining.
- Page Notes are optional markdown details.
- Notes Behind The Reading are optional facts such as done, total, and blocked.

Resolve the existing journey:
- Prefer release_id if available.
- Otherwise call GET /api/timeline?galaxy={product_slug}
- Find the matching product and version.
- If no journey is found, stop and tell the user to create or import the journey in Boa first.
- Never create the journey automatically.

Submit Today’s Reading:
- Endpoint: PUT /api/releases/{release_id}/observation
- Payload:
  {
    "starlight": 73,
    "whisper": "The journey is moving with steady light.",
    "detail": {
      "type": "markdown",
      "content": "## Today\n\n- The integration path is quieter"
    },
    "metrics": {
      "done": 8,
      "total": 12,
      "blocked": 2
    }
  }

Notes:
- In the API, whisper is the stored field name.
- In user-facing language, call it Today’s Reading or Where are we now?
- detail.content may be empty.
- metrics is optional.

Submit Current Storms:
- Endpoint: POST /api/releases/{release_id}/bug-snapshots
- Payload:
  {
    "open_bug_count": 5,
    "signal_type": "total"
  }

Storms rule:
- Blank or unknown storms means do not call the storm endpoint.
- 0 means zero known troubles and must be sent as open_bug_count: 0.

Save behavior:
- If only the reading changed, call only the Observation endpoint.
- If only storms changed, call only the Bug Snapshot endpoint.
- If both changed, call both.
- If one succeeds and one fails, report the partial failure clearly.

Keep the integration small, quiet, and reversible.
The client should feel like writing one notebook page, not controlling the whole sky.
```
