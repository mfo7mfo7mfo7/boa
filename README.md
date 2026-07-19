# Boa

> Boa reveals the shape of a release.

![Boa universe header](docs/assets/boa-universe-header.png)

Boa is a quiet storybook for release journeys.

It does not treat a release as a dashboard, a ticket board, or a task report.
It treats every release as a journey moving across a horizon.

A journey gathers starlight.
A journey meets storms.
A journey passes milestones.
Some milestones have keepers.
When a keeper sees a milestone, they leave a mark.

Over time, Boa reveals the shape of the journey.

## Boa Universe Terms

### 🌌 Universe

The Universe is the full sky.

It contains every galaxy and every journey Boa can see.
When you open Boa at `/`, you are looking at the whole universe.

### ✨ Galaxy

A Galaxy is a product's corner of the sky.

It gathers all journeys that belong to the same product.
Opening a galaxy means looking only at that product's journeys.

### 🛤️ Journey

A Journey is a release moving through time.

It has a beginning, a horizon, milestones, weather, gathered light, and a destination.

Boa does not ask:

> How many tasks are done?

Boa asks:

> Where is this journey now?

### 🌅 Horizon

The Horizon is the line of time.

Milestones rest on the horizon.
The destination waits ahead.
The present moment crosses the page as the journey moves.

### 🔻 Milestone

A Milestone is a meaningful point on the horizon.

It may be Kickoff, Dev Ready, Regression Ready, GA Release, or any point the team cares about.

A milestone is not just a date.
It is a place in the journey that someone is watching.

### 🧭 Keeper

A Keeper watches over a milestone.

The keeper is set when shaping the journey.
They are not chosen again when acknowledging the milestone.

A keeper is not merely an assignee.
They are the person responsible for saying:

> I have seen this point.

### 📖 Observation Notebook

The Observation Notebook is where the team writes what the journey looks like now.

It is the little notebook opened while looking at a journey from a distance.

Its main reading is:

> Today's Reading

A reading may be only one sentence.
It may also include page notes, if the observer needs more room.

Sometimes the observer may add small facts behind the reading, such as how much is done, how much remains, or what is blocked.

But those facts are not the story itself.
They are only pencil marks in the margin.

### ✦ Starlight

Starlight is the light gathered by a journey.

It represents readiness, preparation, confidence, and forward motion.

Starlight is not a KPI.
It is not a progress bar.
It is the quiet energy collected before departure.

### 🌟 Starlight Trail

The Starlight Trail remembers moments when the journey gathered more light.

It does not record every daily snapshot.
It only remembers meaningful increases.

Each star is a moment when the journey became more ready.

### 🌧️ Storms

Storms are known troubles still moving through the journey.

They may be bugs, blockers, regressions, or other visible risks.

A calm journey has fewer storms.
A troubled journey has heavier weather.

### 〰️ Bug Wave

The Bug Wave is the visible shape of storms over time.

It shows how much weather remains between the gathered starlight and the horizon.

It should feel like weather, not a defect chart.

### ✅ Acknowledge

To acknowledge is to leave a mark beside a milestone.

It is the keeper's way of saying:

> I have seen this point.

It is not a comment thread.
It is not a task update.
It is a small confirmation that the milestone has been seen.

### ✍️ Mark

A Mark is what remains after acknowledging a milestone.

It records the keeper, the time, and, optionally, a quiet note.

A milestone can receive more than one mark over time.
Each mark is a small trace left beside the milestone.

### 🪶 Mark Trail

The Mark Trail remembers the marks left on a milestone.

It lets the team see when the milestone was seen, by whom, and what quiet notes were left along the way.

### 🔑 Journey Key

The Journey Key protects the journey.

It is used when shaping the journey, acknowledging milestones, or removing a journey.

It is not part of the story on the page.
It is the small key kept beside the book.

### 📜 Scroll

A Scroll is a portable journey page.

A journey can be brought into Boa from a scroll.
A journey can also be downloaded as a scroll.

### ⚙️ Engine Room

The Engine Room holds quiet instruments behind the page.

It is where delivery settings live.
It should never feel like the center of Boa.

## One Sentence

Boa is a storybook for release journeys: a place where teams watch a journey move across the horizon, gather starlight, pass through storms, and leave quiet marks when milestones are seen.

## Documentation Index

See [docs/index.md](docs/index.md) for the complete guide list.

## Automation

Boa listens to observations from other instruments. These guides show how to write Today's Reading and Current Storms into an existing journey without learning the full API:

- [Observation Client](docs/automation-client.md) — submit Observation Notebook readings from CI, scripts, and n8n
- [Python Examples](examples/python/README.md)
- [Observation Client AI Prompt](docs/observation-client-ai-prompt.md)
- [n8n / curl Examples](examples/n8n/README.md)

## API Notes

- [Bug Wave API](docs/bug-wave.md)
- [Starlight API](docs/starlight.md)
- [Email Mark Workflow](docs/email-ack.md)
- [Reminder Engine](docs/reminders.md)

## Release Notes

- [Boa 1.0](docs/release-notes-1.0.md)
- [Boa 1.5](docs/release-notes-1.5.md)
- [Boa 1.6](docs/release-notes-1.6.md)
- [Boa 1.7](docs/release-notes-1.7.md)
- [Boa 1.8](docs/release-notes-1.8.md)
- [Boa 2.0](docs/release-notes-2.0.md)

## First Trace: Send Data to Boa in 5 Minutes

Start Boa:

```bash
docker compose up -d --build
```

First create or import the journey in Boa. Then submit a Starlight + Current Storms observation from Python:

```bash
cd examples/python
pip install requests
python submit_observation.py \
    --product "Lantern Vale" \
    --version 1.6 \
    --starlight 73 \
    --summary "The journey is moving with steady light." \
    --open-bugs 5
```

That is it. Boa finds the existing journey, records the Observation Notebook reading, and shows Current Storms as Bug Wave on the timeline.

From a shell script or n8n, use the raw endpoints in [examples/n8n/README.md](examples/n8n/README.md).

After the first trace, keep sending observations. Starlight only creates a new trail star when the reading changes.

## Example Journey Definition

```yaml
product: Lantern Vale
version: 1.6
secret: lantern-key

milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: iris

  - name: Regression Ready
    expected: 2026-02-10
    owner: noel

  - name: GA Release
    expected: 2026-03-30
    owner: mina
```

## Product Philosophy

YAML describes the journey.

SQLite records the journey.

## Status

Boa 2.0 is release-ready.

The universe view, galaxy routes, Observation Notebook, Starlight Trail, Bug Wave, Mark Trail, Engine Room, and paper dialog system now form one coherent journey language.

## Local QA Reset

For manual UI QA, start each run from a clean release list and keep the resulting test data after the run.

```bash
uv run python -m boa.qa reset
```

This clears all local journeys plus cascading milestone, mark, bug snapshot, and notification data from `boa.db`, while keeping the schema intact for the next run.

## Quick Start

Boa publishes container images to GitHub Container Registry.

```bash
docker run --rm -p 8000:8000 -v boa-data:/data ghcr.io/chengenzo/boa:2.0.0
```

Then open <http://localhost:8000>.

The container listens on port `8000`. SQLite data is stored at `/data/boa.db`, so mount `/data` to keep journey data across container restarts.

The GHCR package should be set to public so others can pull it without logging in to GitHub.

## Docker

Boa can travel inside a container. This repo ships:

- `Dockerfile`
- `compose.yaml`
- `compose.local.yaml.example`

Build locally:

```bash
docker build -t boa:local .
```

Run locally:

```bash
docker run --rm -p 8000:8000 -v boa-data:/data boa:local
```

Then open <http://localhost:8000>.

The container default command is:

```bash
uvicorn boa.main:app --host 0.0.0.0 --port 8000
```

It also sets:

```bash
BOA_DB_PATH=/data/boa.db
```

### Docker Compose

Start with defaults:

```bash
docker compose up --build
```

Run in the background:

```bash
docker compose up -d --build
```

Stop it:

```bash
docker compose down
```

Remove data volume too:

```bash
docker compose down -v
```

Use `.env.example` as a starting point:

```bash
cp .env.example .env
docker compose up --build
```

For personal local overrides, copy the example and layer it on top:

```bash
cp compose.local.yaml.example compose.local.yaml
docker compose -f compose.yaml -f compose.local.yaml up --build
```

Keep `compose.local.yaml` out of git. Use it for your own port, volume, or environment overrides without changing the shared project defaults.

### Docker Environment Variables

Useful runtime knobs:

```bash
docker run --rm -p 8000:8000 \
  -v boa-data:/data \
  -e BOA_JOURNEY_FOLD_DAYS=21 \
  boa:local
```

Available variables today:

- `BOA_DB_PATH`
  Default in container: `/data/boa.db`
- `BOA_IMAGE`
  Compose image tag, default `boa:local`
- `BOA_PORT`
  Host port mapped to container port `8000`
- `BOA_JOURNEY_FOLD_DAYS`
  Controls how many days ended / not-started journeys stay folded around the NOW line
- `BOA_STALE_KICKOFF_DAYS`
  Legacy fallback name still supported by the API code; `BOA_JOURNEY_FOLD_DAYS` takes precedence

### SMTP and Engine Room

Boa can send outbound email through a configurable SMTP relay. SMTP is the mail route behind the Email Mark Workflow in Boa 2.0.

Configure SMTP through environment variables:

| Variable | Default | Notes |
|---|---|---|
| `BOA_SMTP_ENABLED` | `false` | Set to `true` to enable outbound email |
| `BOA_SMTP_HOST` | — | SMTP server host, e.g. `smtp.example.com` |
| `BOA_SMTP_PORT` | `587` | SMTP server port |
| `BOA_SMTP_USERNAME` | — | Optional SMTP username |
| `BOA_SMTP_PASSWORD` | — | Optional SMTP password |
| `BOA_SMTP_FROM` | — | Required sender address when enabled |
| `BOA_SMTP_FROM_NAME` | `Boa` | Display name for the sender |
| `BOA_SMTP_STARTTLS` | `true` | Use STARTTLS |
| `BOA_SMTP_SSL` | `false` | Use SMTP_SSL directly; do not enable with STARTTLS |
| `BOA_SMTP_TIMEOUT` | `15` | Connection timeout in seconds |
| `BOA_SMTP_TEST_TO` | — | Default recipient for test emails from the Engine Room |

Validation rules:

- Port must be an integer between 1 and 65535.
- STARTTLS and SSL cannot both be enabled.
- Timeout must be a positive number.
- When enabled, `BOA_SMTP_HOST` and `BOA_SMTP_FROM` are required.
- Passwords are never returned in the UI, API, or logs.

Common provider examples:

Gmail / Google Workspace:

```bash
BOA_SMTP_HOST=smtp.gmail.com
BOA_SMTP_PORT=587
BOA_SMTP_STARTTLS=true
BOA_SMTP_SSL=false
BOA_SMTP_USERNAME=boa@example.com
BOA_SMTP_PASSWORD=<app-password>
BOA_SMTP_FROM=boa@example.com
```

Microsoft 365:

```bash
BOA_SMTP_HOST=smtp.office365.com
BOA_SMTP_PORT=587
BOA_SMTP_STARTTLS=true
BOA_SMTP_SSL=false
BOA_SMTP_USERNAME=boa@example.com
BOA_SMTP_PASSWORD=<password>
BOA_SMTP_FROM=boa@example.com
```

SendGrid:

```bash
BOA_SMTP_HOST=smtp.sendgrid.net
BOA_SMTP_PORT=587
BOA_SMTP_USERNAME=apikey
BOA_SMTP_PASSWORD=<SENDGRID_API_KEY>
BOA_SMTP_FROM=boa@example.com
```

Amazon SES:

```bash
BOA_SMTP_HOST=email-smtp.<region>.amazonaws.com
BOA_SMTP_PORT=587
BOA_SMTP_USERNAME=<SMTP_USERNAME>
BOA_SMTP_PASSWORD=<SMTP_PASSWORD>
BOA_SMTP_FROM=boa@example.com
```

Production email delivery requires a valid SMTP provider. Boa does not ship a public email service. Mailpit and similar local catchers are useful for development but are not a production email delivery solution.

Use the Engine Room panel in the Boa UI to check the mail route and send a test email.

### Email Mark Workflow

When SMTP is ready, Boa sends letters ahead of the journey. Each email carries a secret link that lets a milestone keeper leave a mark:

```text
Milestone → Reminder → Email → Secret link → Mark → Timeline update → Reminder stops
```

Send an on-demand mark request from the Reminders panel, or trigger all due reminder emails with the **Send all waiting messages** button. Each email contains a secure `/ack/{token}` link. The keeper may leave a quiet note; Boa records the mark and stops future reminders for that milestone.

Required environment variables:

- `BOA_SMTP_ENABLED=true`
- `BOA_SMTP_HOST`
- `BOA_SMTP_FROM`
- `BOA_BASE_URL` — used to build mark links

Optional tuning:

- `BOA_ACK_TOKEN_TTL_HOURS` — default 168 (7 days)
- `BOA_REMINDER_DAYS_BEFORE` — default `7,3,1`

### Common Docker Examples

Use a different host port:

```bash
docker run --rm -p 8080:8000 -v boa-data:/data boa:local
```

Use a published GHCR image:

```bash
docker run --rm -p 8000:8000 -v boa-data:/data ghcr.io/chengenzo/boa:2.0.0
```

Set folded-journey days:

```bash
docker run --rm -p 8000:8000 \
  -v boa-data:/data \
  -e BOA_JOURNEY_FOLD_DAYS=21 \
  ghcr.io/chengenzo/boa:2.0.0
```

Same idea with Compose:

```bash
BOA_PORT=8080 BOA_JOURNEY_FOLD_DAYS=21 docker compose up --build
```

Use a host-mounted database file instead of a Docker volume:

```bash
docker run --rm -p 8000:8000 \
  -v "$(pwd)/data:/data" \
  ghcr.io/chengenzo/boa:2.0.0
```

### Reset Docker Data

If you used the named volume `boa-data`, remove it with:

```bash
docker volume rm boa-data
```

## Environment Example

See [.env.example](.env.example) for the current image / port / fold-day defaults used by local tooling and Compose.
