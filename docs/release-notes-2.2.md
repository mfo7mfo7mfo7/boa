# Boa 2.2 Release Notes

Boa 2.2 makes the sky easier to read.

This release does not change what Boa is. It quiets the edges: the little paper windows speak the same language, hover notes open like lifted slips of paper, close milestones stop stepping on each other, and email marks now point to the public door instead of the room behind it.

## What Changed

### One Paper Language

The small inner windows now belong to the same world.

- Observation Notebook, Acknowledge, Engine Room, Bring a Journey, and Begin / Tend Journey share the same paper-dialog rhythm.
- Headers, close buttons, footer actions, journey keys, notices, fields, and soft panels now follow one shared visual language.
- The older SaaS-like fragments have been folded away so the page feels more like one quiet book.

### Hover Notes

Timeline hover cards now behave like small notes held over the page.

- Starlight, Bug Wave, milestone notes, and mark chips use the same paper tooltip family.
- Hover cards size themselves to their contents instead of feeling trapped in a fixed box.
- A tooltip stays open while the pointer moves into it, so a note can be read or copied without the paper vanishing.
- The placement is centered around the thing being inspected, then gently clamped inside the viewport.

### Horizon Labels

Milestone labels on the horizon are calmer when dates sit close together.

- The main timeline now uses the shared collision-avoidance logic for milestone names.
- Labels wait until they are truly close before moving.
- When movement is needed, nearby labels share the adjustment instead of one label always running away.
- Labels prefer small same-lane shifts before climbing to another lane.
- During journey editing, labels update while dragging, so the horizon does not wait until mouse-up to redraw itself.

### Marks And Email

Acknowledgement email is more useful without becoming louder.

- The acknowledgement button is unchanged.
- A subtle fallback link now appears below the button for email clients that block HTML buttons.
- The email includes the milestone name, expected date, and a quiet reading line such as:

```text
Starlight ✦73 · Storms 15
```

- Sent email events can appear in the Mark Trail alongside human marks.

### Public Links

Outbound acknowledgement links now use the public entry point.

Boa no longer sends links such as:

```text
http://localhost:8000/ack/<token>
```

Instead, it uses:

```text
${PUBLIC_BASE_URL}/ack/<token>
```

This matters when Boa lives behind Docker, nginx, or another reverse proxy.

## Configuration

Set `PUBLIC_BASE_URL` anywhere acknowledgement emails are sent.

Local development:

```bash
PUBLIC_BASE_URL=http://127.0.0.1:8000
```

Docker + nginx:

```bash
PUBLIC_BASE_URL=http://gitlab.qa:4001
```

Compose reads the same variable:

```bash
PUBLIC_BASE_URL=http://gitlab.qa:4001 docker compose up -d
```

If SMTP is enabled and `PUBLIC_BASE_URL` is missing, Boa refuses to send the acknowledgement email instead of sending an unreachable internal link.

## Validation

Boa 2.2 should pass:

```bash
node --check src/boa/static/app.js
uv run pytest
git diff --check
```

## Suggested Tag

- `v2.2.0`

## Closing Note

Boa 2.2 is a quieter page.

The journey still moves across the horizon. The starlight still gathers. The storms still show their shape. But the little notes, marks, and windows now feel like they were always part of the same book.
