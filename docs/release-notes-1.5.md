# Boa 1.5 Release Notes

Boa 1.5 makes context a first-class part of the journey.

## Highlights

### Milestone Notes

Milestones now carry a `note` field so owners can explain why a milestone matters or what it depends on. Notes are editable inline from the journey popover and the release settings dialog, and they persist through YAML import and export.

### Acknowledgement Notes

Acknowledgement notes are now structured as first-class content objects (`{"content": "..."}`) instead of raw strings. This lets the UI render them with the same markdown-aware note system used elsewhere.

### Acknowledgement Identity

Acknowledgements now record an explicit `ack_name` — the human who acknowledged the milestone. This separates the milestone owner from the person confirming the milestone, which matters for accountability without turning Boa into an enterprise form.

### Shared Note System

A single note renderer, `renderBoaNote()`, powers milestone field annotations, acknowledgement cards, and starlight night logs. Notes are stored as plain markdown and rendered as safe blocks in the UI.

### Milestone Note Card

Clicking a milestone opens a contextual card showing the milestone note and the latest acknowledgement, surfaced right on the timeline canvas.

### YAML Round-Trip

Milestone notes are preserved when a release blueprint is exported or imported, so context travels with the journey definition.

## API Changes

- `MilestoneCreateRequest` and `MilestoneUpdateRequest` accept `note: {"content": "..."}`.
- `AckRequest` now requires `ack_name` and accepts `note: {"content": "..."}`.
- Timeline responses include `ack_name` and structured `ack_note`.

## Suggested Tag

- `v1.5.0`
