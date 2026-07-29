# Boa 3.0 Release Notes

Boa 3.0 makes the shared journey language more complete.

This release pulls the last major travel instruments into one vocabulary: Reading Post now has a stable home in Tend Journey, the Engine Room explains the mail route and the clock more clearly, and the project docs finally describe the pieces that were already doing real work.

## What Changed

### Reading Post Is Now Part Of The Journey Language

Reading Post now belongs to the main journey flow instead of feeling like an extra side room.

- The Reading Post controls sit in Tend Journey beside the journey identity.
- The shared wording stays aligned with the rest of Boa.
- The settings are saved with the journey so import and export can carry them forward.
- Downloaded YAML includes the Reading Post configuration when one is present.
- A journey can be restored later with the same rhythm, time, and until settings intact.

### Reading Post And Scheduling

Reading Post scheduling now stays grounded in the Engine Room clock.

- The scheduler follows the Engine Room time language.
- The rhythm controls keep the daily, weekdays, milestone, and never choices visible in one place.
- The time and until fields use the shared dialog language instead of a one-off layout.
- The schedule summary updates from the current journey draft so future milestone edits stay part of the story.

### Engine Room And SMTP

The Engine Room now reads more like a proper control room.

- SMTP status is visible in the Engine Room.
- The test email action is documented and surfaced where the mail route is managed.
- The current time display stays quiet but explicit.
- The clock and date format controls share the same UI language as the rest of the dialogs.

### Documentation Catches Up

Boa 3.0 also fixes a quieter problem: the docs now describe the features that were already shipping.

- README now includes clearer guidance for SMTP and Reading Post.
- The release process is documented so version bumps, release notes, and feature docs move together.
- The release notes index now points to the latest release first.

## Validation

Boa 3.0 was prepared with:

```bash
uv run pytest
git diff --check
node --check src/boa/static/app.js
```

## Suggested Tag

- `v3.0.0`

## Closing Note

Boa 3.0 is still a quiet book.

It just keeps the mail route, the reading schedule, and the versioning discipline inside the same story instead of scattering them across the margins.
