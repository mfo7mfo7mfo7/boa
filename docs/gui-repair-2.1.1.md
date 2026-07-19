# Boa 2.1.1 GUI Repair Notes

## Scope

This pass focuses on visual cleanup and demo-sky coherence, not new product features.

## Issues found

- The `i` legend trigger looked like a foreign utility icon instead of part of the Boa instrument panel.
- `Engine Room` lived in the header as a competing control, which made the masthead feel more like a SaaS toolbar than a quiet navigation surface.
- Demo mode behaved like a partial seed, which left stale demo journeys behind and made visual review inconsistent.
- The legend explained `Bug Wave` and `Starlight`, but the small SVG marks did not yet feel like members of the same visual family.

## Repairs in this pass

- Replaced the isolated `i` with a quieter `Legends` trigger that matches the masthead typography.
- Moved `Engine Room` into a low-contrast bottom note position so it remains discoverable without competing with horizon and perspective controls.
- Removed the old header-specific `Engine Room` entry styles and markup.
- Changed demo seeding from additive behavior to deterministic refresh behavior for demo releases.
- Kept the official demo universe limited to two galaxies:
  - `Lantern Vale`
  - `Rose Current`
- Updated demo copy from `Load Demo Sky` to `Open the Demo Sky` to better fit Boa's tone.
- Refined the legend swatches so `Bug Wave` and `Starlight` feel closer in color family and both read as a line passing through a mark.
- Removed the remaining responsive top padding that kept the masthead floating below the browser edge on narrower viewports.
- Reduced the masthead's reserved height and stage spacing so the first journey can breathe closer to the top of the page.
- Replaced the last visible `Loading` / `bug snapshot runner` language in the static UI flows with quieter journey / storm wording.

## Sprint 3 audit

The main SaaS feeling was not just styling. It came from layout reservation.

- The masthead had already become visually softer, but its old spacing model still kept a large invisible block above the content.
- A narrow-screen media query was still reintroducing top padding, which explained why the browser-top alignment seemed unchanged during tasting.
- Several plugin and status strings still spoke in backend terms, which subtly broke the Little Prince reading mood even when the visuals improved.

## Remaining polish targets

- The workshop dialog is cleaner than before, but it still reads slightly more operational than poetic.
- Empty-state action hierarchy should be checked one more time in a real browser after the masthead compression settles.
- The legend and observation surfaces now belong to the same world, but they still deserve one final side-by-side taste pass before calling the 2.1.1 GUI fully locked.

## Workshop cleanup follow-up

One additional pass has now been applied to the dialog layer.

- `Journey tools` was softened to `Workshop`.
- `Journey settings` became `Settings` so the panel stops sounding like a settings product inside the product.
- `Notifications` became `Reminder notes`.
- `Sky state` became `The sky today`.
- `Runner`, `Manual payload`, and `Ack Name` were replaced with calmer user-facing language.
- Dialog panels, inputs, subtle blocks, and status pills were all softened so they read like paper instruments instead of admin widgets.

This moves the workshop closer to:

notionally:
"a quiet place to tend the journey"

rather than:
"a dashboard of operational panels"

## Sprint 3 remaining polish list

After the latest wording and surface cleanup, the remaining issues are smaller and more specific.

### Worth carrying into Sprint 4

- The word `secret` still appears in several visible forms.
  - It is product-correct, but still slightly technical in tone.
  - We should decide whether Boa 2.1.1 wants to keep `secret` as-is, or soften it into a more world-fitting label while preserving API semantics.

- The import / instrument area still carries some necessary technical vocabulary.
  - `YAML`
  - `SMTP`
  - `storm instrument`
  - These may be acceptable if they remain contained inside workshop / engine surfaces.
  - They should not leak into the first reading of the board.

- The release dropdown action labels are intentionally plain right now:
  - `Settings`
  - `Download`
  - `Delete`
  - This is usable, but not yet art-directed.
  - Final pass should decide whether neutrality is better than poetry here.

- Observation and workshop are now in the same world linguistically, but they should still be tasted together in a real browser at different viewport widths.
  - especially header + first release
  - observation dialog over the live board
  - workshop beside empty-state entry points

### Probably done enough

- Header obstruction feeling
- Detached `i` / legend trigger problem
- Engine Room competing with masthead controls
- Demo-sky naming and stale seed confusion
- Obvious `Loading` / backend tool wording leaks
- Hover card admin tone
- Generic save/fail status wording

## What still needs visual tasting later

- The empty-state button hierarchy may still deserve one more pass once the full 2.1.1 GUI language is settled.
- The legend card and observation surfaces should be checked together in a real browser for final tonal consistency.
- Demo narrative copy is much better grounded now, but can still be art-directed further once the broader 2.1.1 visual system is locked.

## Intent

Boa should feel like a calm reading instrument for journeys in motion.

It should not feel like a control-heavy dashboard.
