# Boa Design System

Boa should feel like a quiet illustrated notebook page, not a SaaS control panel.

## Core Direction

- Warm paper first
- Ink and light, not hard chrome
- A few typographic voices with clear roles
- Calm spacing and long horizontal breathing room
- No dashboard fragments, no accidental admin UI

## Palette

- **Paper** `#fbf8f1` — warm, calm background
- **Ink** `#2f3746` — primary text
- **Muted** `#8b8175` — secondary text and hints
- **Today** `#6f9f7a` — the present moment
- **Starlight gold** `#dcb87a` — accents, stars, warmth
- **Warm line** `rgba(96, 92, 84, 0.58)` — timeline spine
- **Ruler line** `rgba(125, 112, 96, 0.4)` — month ruler

## Typography Roles

### Title 1

- Purpose: dialog titles, card titles, release names
- Font: `Libre Baskerville`, `Georgia`, serif
- Tone: calm literary heading

### Title 2

- Purpose: section subtitles, compact section heads
- Font: `Instrument Sans`, `Helvetica Neue`, sans-serif
- Tone: quiet UI structure, never loud

### Title 3

- Purpose: helper text, metadata, labels, short explanations
- Font: `Instrument Sans`, `Helvetica Neue`, sans-serif
- Tone: light scaffolding, never the main voice

### Special Text

- Purpose: milestone names, a few poetic names on the journey
- Font: `Iowan Old Style`, `Georgia`, serif
- Tone: bookish, slightly handwritten, restrained

### Body Text

- Purpose: notebook prose, observation text, longer readable content
- Font: `Libre Baskerville`, `Georgia`, serif
- Tone: warm reading texture

## Timeline Baseline

The outside timeline is the visual reference language for the rest of Boa.

### Milestone Text

- Selector: `.journey-timeline .milestone-name`
- Font: `Iowan Old Style`, `Georgia`, serif
- Size: `13.5px`
- Style: italic
- Color: `rgba(78, 75, 69, 0.88)`
- Meaning: the journey's named point, never a system label

### Date Text

- Selector: `.journey-timeline .date-text`
- Font: `Instrument Sans`, `Helvetica Neue`, sans-serif
- Size: `10.5px`
- Weight: `600`
- Letter spacing: `0.02em`
- Color: `rgba(82, 127, 204, 0.82)`
- Meaning: positioning and verification, not the main story

### Month Text

- Selector: `.journey-timeline .month-label`
- Font: `Libre Baskerville`, `Georgia`, serif
- Size: `15px`
- Letter spacing: `0.01em`
- Color: `rgba(128, 112, 92, 0.78)`
- Meaning: quiet ruler text

### Timeline Line

- Selector: `.journey-timeline .timeline-spine`
- Stroke: `rgba(96, 92, 84, 0.58)`
- Width: `1.15`
- Treatment: subtle hand-drawn filter and very soft warm glow

### Month Ruler

- Selector: `.journey-timeline .month-ruler-line`
- Stroke: `rgba(125, 112, 96, 0.4)`
- Width: `0.95`
- Treatment: lighter and quieter than the main spine

## Popup System

All BOA popups should feel like pages from the same inner notebook.

### Shared Shell

- Use `paper-dialog` and `paper-surface`
- Rounded, warm, softly lit
- Header and footer should use the same height rhythm across dialogs
- Avoid cards-inside-cards-inside-cards

### Header

- Kicker: small `Title 3` style
- Main title: `Title 1`
- Intro text if needed: short `Body Text` or `Title 3`
- Keep the head compact; do not waste the first 30-40% of the sheet

### Footer

- One action row
- Button rhythm must match across dialogs
- Notes or validation should sit below the main action rhythm, not fight it on the same line

## Journey Dialog

The journey dialog should separate identity, timeline editing, and protection.

### Left Card

- Purpose: journey identity only
- Fields: `Product`, `Version`
- Voice: quiet form card using the shared popup language
- Do not mix security wording into this card

### Right Canvas

- Purpose: shape the journey and milestones
- Timeline language should match the main board as closely as possible
- Milestone editor should feel like a lifted paper note, not a generic admin form

### Journey Key

- User-facing term: `Journey key`
- Backend term may remain `secret`
- Purpose: protects edits, acknowledgements, and removal
- Placement: quiet footer utility, not a main identity field
- Tone: present but not visually loud

## Mobile Rules

- Never shrink important text into 8-10px decorative scraps
- Favor fewer columns over tiny type
- Inputs remain readable at phone scale
- Timeline labels may simplify, but should not become skeletal

## Motion

- Gentle hover lifts and fade transitions
- Motion should feel like paper breathing, not product chrome
- `@media (prefers-reduced-motion: reduce)` disables animations

## Vocabulary

Use journey language everywhere the user can see:

| Avoid | Prefer |
|-------|--------|
| Dashboard | Journey |
| System | Engine room |
| Notifications | Reminders |
| Settings | Journey settings |
| Status | Observation |
| Details | Observation notes |
| Secret | Journey key |
