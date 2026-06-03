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
- YAML Import / Export
- Timeline Shift
- Plugin Framework

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

## Docker Compose

Boa ships as one Compose service with SQLite persisted in a named volume. The first startup creates the database schema automatically at `/data/boa.db`.

```bash
docker compose up --build
```

To run a published GHCR image instead of building locally:

```bash
BOA_IMAGE=ghcr.io/<github-user>/boa:latest docker compose up
```

Or run the image directly:

```bash
docker run --rm -p 8000:8000 -v boa-data:/data ghcr.io/<github-user>/boa:latest
```

Useful knobs:

```bash
BOA_PORT=8080 docker compose up --build
BOA_JOURNEY_FOLD_DAYS=21 docker compose up --build
```

Data lives in the `boa-data` Docker volume. To reset the Docker database:

```bash
docker compose down -v
```
