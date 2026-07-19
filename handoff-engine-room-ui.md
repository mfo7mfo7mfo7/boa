# Boa UI Handoff: Engine Room / Info Popover Restructuring

## Current State (rolled back)

- src/boa/static/index.html and src/boa/static/app.css were just restored to HEAD.
- Header info popover still mixes the timeline legend with an Open engine room call-to-action.
- There is NO separate quiet Engine Room entry in the masthead.
- This is the state the user considers not good and wants another agent to redesign.

## Product Requirement

Boa is a journey visualization platform, not a SaaS admin dashboard. System/SMTP/diagnostics are implementation details that should exist but never become primary navigation.

### Goal

Separate these two concepts completely:

- Information button (i) should ONLY explain the timeline legend.
- Engine Room should have its own quiet entry on the far right of the header.

### Acceptance criteria

- Info popover contains ONLY the legend: Expected milestone, Acknowledged, Pending, Overdue.
- Engine Room is no longer inside the info popover.
- Engine Room has its own quiet entry on the far right of the header.
- The Engine Room entry is visually secondary (small pill / quiet icon + label).
- Header feels cleaner.
- Users can always find the Engine Room, but are never distracted by it.
- Boa feels less like a SaaS dashboard and more like a calm navigation instrument.

### Naming

- Do not call it System. Call it Engine Room (or short label Engine on the button).
- Keep the journey metaphor: Journey -> Timeline -> Observation -> Stars -> Engine Room.

### Visual priority

- Timeline / Observation / Milestones: 5 stars
- Engine Room: 1 star

## What was already attempted

I implemented a first version that:

1. Removed the engine-room section from .masthead-flyout.
2. Added a separate #engine-button.engine-room-entry button as a sibling after .legend-hover-shell inside .masthead-actions.
3. Styled the new entry as a small, low-contrast pill with an icon and the label Engine.
4. Left app.js unchanged because #engine-button already had an event listener.

Static checks passed, but the user asked to roll it back.

## Relevant files

- src/boa/static/index.html : Header markup, .masthead-actions, .legend-hover-shell, .masthead-flyout, #engine-button, #engine-dialog
- src/boa/static/app.css : .legend-hover-shell, .timeline-legend, .quiet-info-button, popover styles, engine room styles
- src/boa/static/app.js : elements.engineButton, openEngineDialog(), event listener around line 5173
- compose.yaml : Single Compose entrypoint for local Docker runs

## Key selectors / functions

- Header actions container: .masthead-actions
- Info button: #masthead-menu-toggle
- Info popover: .masthead-flyout (child of .legend-hover-shell)
- Legend list: .timeline-legend
- Engine dialog trigger (currently inside popover): #engine-button
- Engine dialog: #engine-dialog
- JS open function: openEngineDialog()
- JS element binding: elements.engineButton

## Recommended implementation plan for next agent

1. Extract the engine-room section from .masthead-flyout in index.html.
2. Place #engine-button as a sibling after .legend-hover-shell inside .masthead-actions.
3. Style the new entry as a very quiet pill (small, low opacity, minimal border).
4. Remove dead CSS classes related to the old flyout engine section.
5. Do NOT change the engine dialog itself.
6. Keep app.js wiring intact; #engine-button already opens the engine dialog.
7. Run static checks: node --check src/boa/static/app.js, CSS brace balance, python3 scripts/static_preflight.py.
8. Restart Docker if possible, or ask the user to visually inspect.

## Known environment constraints

- Docker commands are flaky inside the sandbox and may require escalation.
- Browser / Playwright testing is blocked; visual QA must be done by the user.
- view_image is blocked; image viewing is not available.
- Git checkout may hit .git/index.lock permission errors; use git show HEAD:path > path as fallback.
- Compose now uses a single `compose.yaml` entrypoint.

## Design principles to preserve

- Boa is a journey visualization platform.
- Use journey language, not enterprise language.
- Calmness, clarity, storytelling.
- The Little Prince character should subtly appear throughout.
- Every screen should feel like it belongs to the same poetic world.

## What NOT to do in this task

- Do NOT redesign the engine dialog internals.
- Do NOT introduce new product concepts.
- Do NOT perform unnecessary database migrations.
- Do NOT start Boa 2.2 / 3.0 features.
- Do NOT over-engineer; keep the change focused on the header/popover split.
