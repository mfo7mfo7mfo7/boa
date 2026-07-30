# Boa 3.2 Release Notes

Boa 3.2 tightens the shared journey language again and makes the reading surface feel steadier.

This release folds the last glossary drift back into one vocabulary: the main page, the hover popup, the docs index, and the Reading Post story now line up around Page Notes, Today’s Reading, Storms, and the Engine Room instead of overlapping aliases.

## What Changed

### Starlight Hover And Popup Language Stay Focused

The Starlight hover popup now speaks with the same smaller vocabulary as the rest of Boa.

- The popup expand control now reads as Page Notes instead of a stray night-log label.
- The popup stays above the timeline layers so the `Now` line does not cover it.
- The expanded card rerenders its content when the user asks for more space.

### Reading Post And Observation Copy Rejoin The Same Terms

Reading Post and the observation dialogs now use one path through the story.

- Reading Post continues to send the full Today’s Reading.
- The observation dialog keeps Today’s Reading as the primary notebook phrase.
- Page Notes stays the focused place for the longer markdown detail.
- The supporting margin numbers live behind the reading instead of pretending to be the reading itself.

### Documentation And Versioning Stay In Sync

Boa 3.2 updates the public docs so the story reads the same way everywhere.

- README and docs index now use the same shared glossary order.
- The release notes index points at the new release first.
- The version markers and container examples move up to 3.2.0.

## Validation

Boa 3.2 was prepared with:

```bash
uv run pytest tests/test_playwright_e2e.py -k observation_notebook_records_starlight_storms_markdown_and_trail
git diff --check
```

## Suggested Tag

- `v3.2.0`

## Closing Note

Boa 3.2 keeps the storybook quiet.

It just leaves fewer names competing for the same place in the margin.
