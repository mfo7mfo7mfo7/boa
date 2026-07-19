# Boa 1.8 Release Notes

Boa 1.8 completes the Email Acknowledgement Workflow.

For the first time, Boa actively participates in moving a release forward:

```text
Milestone → Reminder → Email → Secret link → Acknowledgement → Timeline update → Reminder stops
```

## Highlights

### Email Ack Workflow

Milestones can now receive acknowledgement emails that contain a secure, one-click acknowledgement link. The recipient does not need a Boa account or login.

- `POST /api/milestones/{milestone_id}/ack-email` sends an on-demand acknowledgement request.
- `GET /ack/{token}` serves the acknowledgement landing page.
- `GET /api/ack/{token}` validates a token and returns milestone context.
- `POST /api/ack/{token}` records the acknowledgement, updates the timeline, and stops future reminders.

### Secret Acknowledgement Links

Each email contains a cryptographically secure token generated with Python's `secrets` module. Tokens are stored as SHA-256 hashes and expire after a configurable TTL (default 7 days). A token can only be used once.

### Reminder Engine with Email Delivery

The existing reminder scheduler now drives real outbound email.

- `POST /api/notifications/send` generates due notifications and sends one email per pending reminder.
- Reminders automatically stop after a milestone is acknowledged.
- Duplicate reminders are avoided through the existing notification log.
- Reminder days are configurable via `BOA_REMINDER_DAYS_BEFORE` (default `7,3,1`).

### Email Templates

Boa 1.8 ships with three journey-themed email templates:

- **Milestone reminder** — sent automatically when a reminder is due.
- **Acknowledgement request** — sent on demand from the management panel.
- **Acknowledgement confirmation** — sent after a milestone is acknowledged.

All templates use Boa's calm, warm visual language and include both plain text and HTML alternatives.

### Milestone Email Field

Milestones gained an optional `email` field so the reminder recipient can differ from the milestone owner. If `email` is not set, Boa falls back to the owner when the owner looks like a valid email address.

### Timeline Integration

Acknowledgements made through a secret link immediately update:

- milestone `acked_at`
- `ack_name`
- `ack_note`
- timeline state
- pending reminder state

No manual refresh is required.

## API Additions

- `GET /ack/{token}` — acknowledgement landing page
- `GET /api/ack/{token}` — token validation
- `POST /api/ack/{token}` — acknowledge via token
- `POST /api/milestones/{milestone_id}/ack-email` — send acknowledgement request
- `POST /api/notifications/send` — send due reminder emails

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `BOA_BASE_URL` | `http://localhost:8000` | Base URL for acknowledgement links |
| `BOA_ACK_TOKEN_TTL_HOURS` | `168` | Hours until acknowledgement links expire |
| `BOA_REMINDER_DAYS_BEFORE` | `7,3,1` | Comma-separated days before milestone to email |

See `.env.example` for full configuration.

## Suggested Tag

- `v1.8.0`
