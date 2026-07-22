# Reminder Engine

Boa's Reminder Engine emails milestone owners before, on, and after a milestone's expected date. It is built on top of Boa's existing notification log, so duplicate reminders are avoided automatically.

## Reminder Schedule

Default reminder days are configurable via `BOA_REMINDER_DAYS_BEFORE`. The default is:

```text
7,3,1
```

This means reminders are generated 7 days before, 3 days before, and 1 day before the milestone.

Once the milestone date passes, a daily overdue reminder is generated until the milestone is acknowledged.

## Endpoints

### `POST /api/notifications/run`

Generates due notifications without sending email. Useful for refreshing state before inspecting reminders.

```bash
curl -X POST http://127.0.0.1:8000/api/notifications/run \
  -H 'Content-Type: application/json' \
  -d '{"as_of": "2026-08-01"}'
```

### `POST /api/notifications/send`

Generates due notifications and sends one email per pending reminder.

```bash
curl -X POST http://127.0.0.1:8000/api/notifications/send \
  -H 'Content-Type: application/json' \
  -d '{"as_of": "2026-08-01"}'
```

Response:

```json
{
  "sent": 2,
  "failed": 0,
  "results": [...]
}
```

### `GET /api/releases/{release_id}/notifications`

Returns reminder state for every milestone in a release.

```bash
curl http://127.0.0.1:8000/api/releases/1/notifications?as_of=2026-08-01
```

### `GET /api/milestones/{milestone_id}/notifications`

Returns reminder state for a single milestone.

```bash
curl http://127.0.0.1:8000/api/milestones/1/notifications?as_of=2026-08-01
```

## Stopping Reminders

Reminders stop automatically after a milestone is acknowledged. `pending_reminder_types` becomes empty as soon as `acked_at` is set.

## Scheduler

The reminder scheduler runs hourly in the background. If SMTP is ready, it also sends reminder emails automatically. Scheduler failures are logged but never break the application.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `BOA_REMINDER_DAYS_BEFORE` | `7,3,1` | Comma-separated days before milestone |
| `BOA_SMTP_ENABLED` | `false` | Set `true` to enable outbound email |
| `BOA_SMTP_HOST` | — | SMTP server host |
| `BOA_SMTP_FROM` | — | Required sender address when enabled |
| `PUBLIC_BASE_URL` | required for outbound ack email | Public base URL for acknowledgement links in reminder emails, for example `http://127.0.0.1:8000` locally or `http://gitlab.qa:4001` behind nginx |

## Recipient Resolution

The Reminder Engine resolves the recipient in this order:

1. `milestone.email` if set and valid.
2. `milestone.owner` if it looks like a valid email address.
3. Otherwise the reminder is recorded as failed.
