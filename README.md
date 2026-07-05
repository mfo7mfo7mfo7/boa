# Boa

> Boa reveals the shape of a release.

Boa is a timeline-centric release health dashboard inspired by *The Little Prince*.

## Why Boa Exists

Most project management tools answer questions like:

- What tasks are assigned?
- What sprint are we in?
- How many tickets remain?

Release owners often need something simpler:

- What is the next milestone?
- Who owns it?
- Have they acknowledged it?
- Is quality improving or deteriorating?

Boa is built to answer those questions at a glance.

## What Boa Is

Boa is not a project management system.

Boa is not a bug tracking system.

Boa is a release visualization engine.

Its purpose is simple: help teams understand the shape of a release.

## Core Principles

- Timeline First
- YAML First
- Accountability over Authentication
- Visual First

## Core Capabilities

- Timeline
- Milestones
- Acknowledgements
- Notifications
- Bug Wave
- Starlight
- YAML Import / Export
- Timeline Shift
- Plugin Framework

## API Notes

- [Bug Wave API](docs/bug-wave.md)
- [Starlight API](docs/starlight.md)

## Release Notes

- [Boa 1.0](docs/release-notes-1.0.md)
- [Boa 1.5](docs/release-notes-1.5.md)
- [Boa 1.6](docs/release-notes-1.6.md)
- [Boa 1.7](docs/release-notes-1.7.md)

## Example Release Definition

```yaml
product: FortiSASE
version: 26.2
secret: boa-262

milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm

  - name: Regression Ready
    expected: 2026-02-10
    owner: alice

  - name: GA Release
    expected: 2026-03-30
    owner: manager
```

## Product Philosophy

YAML describes the snake.

SQLite records the snake's journey.

## Status

Boa is currently in early project setup.

## Local QA Reset

For manual UI QA, start each run from a clean release list and keep the resulting test data after the run.

```bash
uv run python -m boa.qa reset
```

This clears all local releases plus cascading milestone, ack, bug snapshot, and notification data from `boa.db`, while keeping the schema intact for the next run.

## Quick Start

Boa publishes container images to GitHub Container Registry.

```bash
docker run --rm -p 8000:8000 -v boa-data:/data ghcr.io/<github-user>/boa:latest
```

Then open <http://localhost:8000>.

The container listens on port `8000`. SQLite data is stored at `/data/boa.db`, so mount `/data` to keep journey data across container restarts.

The GHCR package should be set to public so others can pull it without logging in to GitHub.

## Docker

This repo ships:

- `Dockerfile`
- `compose.yaml`
- `docker-compose.yml`

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

Or, if someone explicitly uses the legacy filename flow:

```bash
docker-compose up --build
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

### SMTP (Boa 1.7 Foundation)

Boa can send outbound email through a configurable SMTP relay. This is the foundation for the upcoming Email Ack Workflow; Boa 1.7 itself only exposes status and a test-sending UI.

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
| `BOA_SMTP_TEST_TO` | — | Default recipient for test emails from the System panel |

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

Use the System panel in the top-right corner of the Boa UI to check SMTP status and send a test email.

### Common Docker Examples

Use a different host port:

```bash
docker run --rm -p 8080:8000 -v boa-data:/data boa:local
```

Use a published GHCR image:

```bash
docker run --rm -p 8000:8000 -v boa-data:/data ghcr.io/<github-user>/boa:latest
```

Set folded-journey days:

```bash
docker run --rm -p 8000:8000 \
  -v boa-data:/data \
  -e BOA_JOURNEY_FOLD_DAYS=21 \
  ghcr.io/<github-user>/boa:latest
```

Same idea with Compose:

```bash
BOA_PORT=8080 BOA_JOURNEY_FOLD_DAYS=21 docker compose up --build
```

Use a host-mounted database file instead of a Docker volume:

```bash
docker run --rm -p 8000:8000 \
  -v "$(pwd)/data:/data" \
  ghcr.io/<github-user>/boa:latest
```

### Reset Docker Data

If you used the named volume `boa-data`, remove it with:

```bash
docker volume rm boa-data
```

## Environment Example

See [.env.example](.env.example) for the current image / port / fold-day defaults used by local tooling and Compose.
