# Boa 3.2.1 Release Notes

Boa 3.2.1 fixes a small but distracting scroll problem in the Starlight hover popup.

When the Starlight note content runs long, the popup now keeps the scroll inside the card instead of letting the card expand away from the note. The result is a cleaner right edge and a scrollbar that actually belongs to the popup.

## What Changed

### Starlight Popup Scrolls Internally Again

The Starlight hover popup now keeps long Page Notes inside the card.

- The popup no longer loses its own `overflow-y:auto` behavior to the surrounding timeline styling.
- Long notes now scroll inside the popup instead of stretching the whole floating card.
- The right-side scrollbar now reads like part of the card rather than a cut-off page artifact.

### Regression Coverage

Boa 3.2.1 adds a regression test to keep this from coming back.

- The test builds a long Page Notes observation.
- It verifies that the hover popup remains internally scrollable.
- It checks that the page itself does not get taller when the popup opens.

## Validation

Boa 3.2.1 was prepared with:

```bash
uv run pytest tests/test_playwright_e2e.py -k starlight_hover_popup_keeps_long_notes_inside_the_popup
git diff --check
```

## Suggested Tag

- `v3.2.1`

## Closing Note

Boa 3.2.1 keeps the scroll small and the reading centered where it belongs.
