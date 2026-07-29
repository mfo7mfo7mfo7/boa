# Boa 2.7 Release Notes

Boa 2.7 tightens the shared journey language and carries more of the journey forward with the journey itself.

This release makes the quiet rooms feel more complete: Reading Post now speaks the same language as Tend Journey, the settings travel through YAML import and export, and the Engine Room keeps a small current-time readout alive without drawing attention away from the page.

## What Changed

### Reading Post Joins The Journey Language

Reading Post now follows the same vocabulary as the rest of Tend Journey.

- `Update schedule` became `Rhythm`.
- `At milestones` became `Milestone`.
- `Deliver until` became `Until`.
- The schedule fields now use the shared 31px pill language instead of stretching into a different height system.
- `Never` hides the time and until controls cleanly, while every other rhythm keeps the clock visible.

### Reading Post Now Travels With The Journey

Reading Post settings are no longer trapped in the local draft.

- YAML export now includes the `reading_post` blueprint when one is configured.
- YAML import restores the Reading Post configuration alongside milestones.
- `Begin a Journey` and `Tend Journey` use the same Reading Post field set.
- When a new journey is created, its Reading Post settings can be saved with it so import/export stays round-trippable.
- Reading Post scheduling now follows the Engine Room clock instead of an unrelated UTC clock.

### Engine Room Current Time

The Engine Room now shows a quiet live clock in the `World clock` panel.

- The current time updates every second.
- The display stays small, warm, and non-distracting.
- The clock follows the server's `TZ` setting so the room and the scheduler stay on the same star.
- Date language remains beside it so the two controls read like one shared instrument.

### Hover Notes And Popups

Starlight hover notes now behave more like lifted paper notes.

- The popup can expand for longer content.
- The popup sits above the surrounding timeline layers so the `Now` line does not cover it.
- The hover card uses the same warm paper language as the rest of Boa.

## Validation

Boa 2.7 was prepared with:

```bash
node --check src/boa/static/app.js
uv run pytest
git diff --check
```

## Suggested Tag

- `v2.7.0`

## Closing Note

Boa 2.7 is still the same quiet book.

It just remembers a little more of the journey, speaks with a more consistent voice, and lets the little instruments breathe together without getting loud.
