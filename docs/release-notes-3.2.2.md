# Boa 3.2.2 Release Notes

Boa 3.2.2 tightens the Engine Room and timeline layering so the shared reading surface stays readable instead of fighting its own controls.

This release focuses on visual fixes, hover behavior, and the release vocabulary that keeps the board feeling like one room.

## What Changed

### Starlight Hover Cards Float Above The Now Line Again

The Starlight hover popup now sits above the Now line and its controls instead of getting pinned underneath them.

- The popup keeps its floating-card feel when expanded.
- The expanded note re-renders wider content instead of keeping the narrow wrapped layout.
- The Now label and Now toggles step out of the way while the reading card is open.

### Now Expand And Fold Controls Stay Clickable

The `+ / -` Now controls remain reachable when no popup is open.

- The top and bottom Now controls keep their own click targets.
- The fold state still works for ended and future journeys.
- The regression test now covers extend and fold explicitly.

### Reading And Engine Room Layout Stay In One Language

The surrounding controls now keep the same visual vocabulary as the rest of Boa.

- The left-side journey menu stays above the Today’s Reading surface.
- The Engine Room date-format dropdown no longer wraps its options into awkward two-line items.
- Safari keeps the month ruler visible with the floating popup layered correctly above the timeline.

### Regression Coverage

Boa 3.2.2 adds and updates browser coverage for the fixes above.

- The Starlight hover popup remains above the Now line.
- The Now controls can still fold and extend journeys.
- Safari keeps the timeline ruler and floating popup in the right order.
- The date-format menu stays wide enough for its labels.

## Validation

Boa 3.2.2 was prepared with:

```bash
uv run pytest
git diff --check
docker compose up --build -d
```

## Suggested Tag

- `v3.2.2`

## Closing Note

Boa 3.2.2 keeps the board quiet, readable, and less willing to fight its own layering.
