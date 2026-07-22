# Boa 2.0 Release Notes

Boa 2.0 is the first complete public shape of Boa.

It turns Boa from a timeline tool into a quiet storybook for release journeys.

A release is no longer shown as a dashboard, a ticket board, or a task report. In Boa 2.0, each release becomes a journey moving across a horizon:

```text
Galaxy → Journey → Horizon → Milestones → Starlight → Storms → Marks
```

## What 2.0 Means

Boa now answers one central question:

> Where are we now?

The answer can be a sentence, a reading, a trail of gathered light, a wave of remaining storms, or a keeper's mark beside a milestone.

## Highlights

### Boa Universe

- `/` opens the full universe of journeys.
- `/:galaxySlug` opens one galaxy, currently mapped to a product.
- Unknown galaxies show a quiet empty state instead of a raw 404.
- The Boa terms are now documented in the README as the shared language of the product.

### Observation Notebook

The Observation Notebook is the primary way to continue a journey.

- **Today's Reading** answers "Where are we now?"
- **Page Notes** support one-line notes or markdown.
- **Starlight** records how much light the journey has gathered.
- **Storms** records known troubles still in view.
- Optional numbers live behind the reading instead of becoming the story.

Observation is intentionally not a settings page. It is the small notebook opened while looking at a journey from a distance.

### Starlight

Starlight is now a first-class Boa concept.

- Current Starlight shows the latest readiness reading.
- Starlight Trail only records meaningful readiness increases.
- Starlight is rendered as a sky layer above the journey, not as a KPI panel.
- Starlight detail cards can carry richer markdown notes.

### Storms and Bug Wave

Storms are known troubles still moving through the journey.

- Current Storms writes bug snapshots.
- Bug Wave visualizes storm shape without pretending low-risk journeys are tidal waves.
- Dynamic Bug Wave height now uses guarded normalization so small bug counts stay visually calm.

### Milestones, Keepers, and Marks

Milestones now feel like watched places on the horizon.

- Each milestone can have a keeper.
- A keeper acknowledges by leaving a mark.
- Marks form a Mark Trail.
- A Quiet Note can be left beside a mark.
- A milestone can receive more than one mark over time.

### Email Mark Workflow

Boa 2.0 includes the completed email acknowledgement path from the 1.8 foundation:

```text
Milestone → Reminder → Email → Secret link → Mark → Timeline update → Reminder stops
```

- `POST /api/milestones/{milestone_id}/ack-email` sends on-demand acknowledgement requests.
- `GET /ack/{token}` serves the acknowledgement page.
- `GET /api/ack/{token}` validates a token and returns milestone context.
- `POST /api/ack/{token}` records the mark.
- `POST /api/notifications/send` sends due reminder emails when SMTP is ready.

### Engine Room

The Engine Room holds quiet instruments behind the page.

- Date language can be changed from the UI.
- SMTP status is visible without making email settings the center of Boa.
- Test email delivery remains available when the mail route is configured.

### Unified Paper Dialog System

Boa 2.0 introduces the shared paper dialog language used across the product:

- Observation Notebook
- Begin / Tend Journey
- Bring a Journey from YAML
- Acknowledge
- Milestone edit cards
- Engine Room

The goal is one inner world: quiet paper, soft ink, warm controls, and no SaaS fragments breaking the spell.

## API Surface

Core journey APIs:

- `GET /api/timeline`
- `GET /api/timeline?galaxy={product_slug}`
- `POST /api/releases`
- `PUT /api/releases/{release_id}`
- `DELETE /api/releases/{release_id}`
- `POST /api/import`
- `GET /api/releases/{release_id}/export`

Observation and weather APIs:

- `GET /api/releases/{release_id}/observation`
- `PUT /api/releases/{release_id}/observation`
- `POST /api/releases/{release_id}/bug-snapshots`

Mark and reminder APIs:

- `POST /api/milestones/{milestone_id}/ack`
- `POST /api/milestones/{milestone_id}/ack-email`
- `GET /ack/{token}`
- `GET /api/ack/{token}`
- `POST /api/ack/{token}`
- `POST /api/notifications/send`

System APIs:

- `GET /api/health`
- `GET /api/system/email`
- `POST /api/system/email/test`

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `BOA_DB_PATH` | `boa.db` locally, `/data/boa.db` in container | SQLite storage path |
| `BOA_PORT` | `8000` | Host port for Compose |
| `BOA_IMAGE` | `boa:local` | Compose image tag |
| `BOA_JOURNEY_FOLD_DAYS` | `15` | Days around NOW before distant journeys fold |
| `PUBLIC_BASE_URL` | required for outbound ack email | Public base URL for emailed mark links |
| `BOA_ACK_TOKEN_TTL_HOURS` | `168` | Hours until secret mark links expire |
| `BOA_REMINDER_DAYS_BEFORE` | `7,3,1` | Reminder cadence before milestones |
| `BOA_SMTP_ENABLED` | `false` | Enables outbound email |
| `BOA_SMTP_HOST` | empty | SMTP host |
| `BOA_SMTP_PORT` | `587` | SMTP port |
| `BOA_SMTP_FROM` | empty | Sender address when SMTP is enabled |
| `BOA_SMTP_TEST_TO` | empty | Default Engine Room test recipient |

See `.env.example` for the complete mail route.

## Docker

Start Boa with Compose:

```bash
docker compose up -d --build
```

Use a published image:

```bash
BOA_IMAGE=ghcr.io/chengenzo/boa:2.0.0 docker compose up -d
```

Then open:

```text
http://localhost:8000
```

## Validation

Boa 2.0 should pass:

```bash
node --check src/boa/static/app.js
uv run pytest
git diff --check
```

## Suggested Tag

- `v2.0.0`

## Closing Note

Boa 2.0 is the first release where the world holds together:

> A team can look up at the universe, open a galaxy, follow a journey across the horizon, see its storms, gather its starlight, and leave marks when important places have been seen.
