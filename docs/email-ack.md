# Email Acknowledgement Workflow

Boa 2.0 can email a milestone owner a secret acknowledgement link. The recipient does not need a Boa account or password.

## Journey

```text
Milestone → Reminder → Email → Secret link → Acknowledgement → Timeline update → Reminder stops
```

## Endpoints

### `GET /ack/{token}`

Serves the acknowledgement landing page.

### `GET /api/ack/{token}`

Returns token validity and milestone context.

```bash
curl http://127.0.0.1:8000/api/ack/{token}
```

Response when valid:

```json
{
  "valid": true,
  "release_id": 1,
  "milestone_id": 1,
  "product": "LighthouseOS",
  "version": "5.7",
  "milestone_name": "Kickoff",
  "expected": "2026-08-01",
  "message": null
}
```

### `POST /api/ack/{token}`

Records the acknowledgement.

```bash
curl -X POST http://127.0.0.1:8000/api/ack/{token} \
  -H 'Content-Type: application/json' \
  -d '{
    "ack_name": "alice",
    "note": { "content": "All green." }
  }'
```

The response includes the acknowledgement time and immediately updates the timeline.

### `POST /api/milestones/{milestone_id}/ack-email`

Sends an on-demand acknowledgement request email for a single milestone. SMTP must be ready.

```bash
curl -X POST http://127.0.0.1:8000/api/milestones/1/ack-email
```

## Security

- Tokens are generated with Python's `secrets.token_urlsafe(32)`.
- Only the SHA-256 hash is stored in the database.
- Tokens expire after `BOA_ACK_TOKEN_TTL_HOURS` (default 168 hours / 7 days).
- A token can only be used once; replay returns an error.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `PUBLIC_BASE_URL` | required for outbound ack email | Public base URL for acknowledgement links, for example `http://127.0.0.1:8000` locally or `http://gitlab.qa:4001` behind nginx |
| `BOA_ACK_TOKEN_TTL_HOURS` | `168` | Hours until acknowledgement links expire |

## Confirmation Email

After a milestone is acknowledged, Boa sends a confirmation email when SMTP is ready. This applies both to the secret link flow and to direct acknowledgement through the API.
