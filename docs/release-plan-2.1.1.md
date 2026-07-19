# Boa 2.1.1 Release Plan

Boa 2.1.1 is a stabilization release.

This is not a feature-expansion release. The goal is to make the current Boa experience feel intentionally unified, easier to demo, and easier to trust.

## Release Goal

Ship a cleaner Boa that:

- presents a consistent Little Prince / journey-first interface
- seeds a believable demo universe without stale sample noise
- reduces leftover SaaS / admin-panel feeling
- tightens docs, setup, and operator guidance

## Scope Summary

Boa 2.1.1 is organized into four sprints:

1. Demo universe and data hygiene
2. Header / legend / hidden-entry cleanup
3. Product review and GUI / UX audit report
4. Final GUI unification and ship readiness

---

## Sprint 1

### Goal

Make demo mode and sample data trustworthy.

### Work

- define a safe strategy for clearing old sample / demo data
- keep the official demo universe limited to two galaxies:
  - `Lantern Vale`
  - `Rose Current`
- ensure each galaxy contains exactly three journeys:
  - one past journey
  - one ongoing journey
  - one future journey
- ensure all demo secrets are `demo`
- keep demo seeding on official product paths:
  - release import
  - shifted kickoff dates
  - bug snapshot API
  - starlight API
  - milestone acknowledgement API
- document the recommended demo reset / reseed flow
- verify folded-journey behavior and galaxy filtering on a clean universe

### Acceptance

- a clean environment seeds exactly 6 demo journeys across 2 galaxies
- no `Forti*` sample releases are created by demo mode
- `/api/timeline?galaxy=lantern-vale` returns 3 demo journeys
- `/api/timeline?galaxy=rose-current` returns 3 demo journeys
- past / ongoing / future story states are visually believable
- demo mode can be rerun without confusing duplicate sample data

### Risks

- local developers may already have stale demo data in `boa.db`
- demo reset must not accidentally destroy real team data

---

## Sprint 2

### Goal

Make the header, legend, and hidden system surfaces feel like one world.

### Work

- reduce visual mismatch inside the masthead
- refine `Horizon` and `Perspective` controls as the primary sky-reading instruments
- keep legend access quiet and integrated
- remove any leftover floating or isolated legend artifacts
- move `Bug Wave` and `Starlight` legend language into a single shared legend surface
- decide and implement a better resting place for `Engine Room`
- ensure `Engine Room` is discoverable but visually secondary
- remove remaining obvious admin / control-panel feeling from top-level entry points

### Acceptance

- the header reads as one composition rather than separate widgets
- legend access no longer feels like a separate app control
- `Engine Room` no longer competes with the main journey-reading controls
- `Bug Wave`, `Starlight`, `Milestones`, and `Horizon` feel related
- narrow widths do not create visual awkwardness or alignment drift

### Risks

- hiding `Engine Room` too deeply may reduce operator discoverability
- over-polishing the header can accidentally reduce usability

---

## Sprint 3

### Goal

Review Boa 2.1.1 as a product, not just as a codebase.

### Work

- run a full terminology pass across visible UI
- check consistency of:
  - `Journey`
  - `Release`
  - `Observation`
  - `Workshop`
  - `Engine Room`
- audit key surfaces:
  - universe view
  - galaxy view
  - empty states
  - not-found galaxy state
  - observation workspace
  - settings / workshop surfaces
  - demo mode
- update Docker / GHCR / Compose guidance where needed
- draft `2.1.1` release notes

### Required Deliverable

Produce a dedicated GUI / UX review report covering:

- style-language consistency
- visual hierarchy
- interaction consistency
- world-building breaks
- residual SaaS / admin feeling
- naming drift
- surfaces that still feel prototyped instead of productized

The report should classify findings as:

- `must fix`
- `should fix`
- `can wait`

### Acceptance

- a written review report exists
- the report is specific enough to drive the final sprint
- remaining design debt is clearly categorized instead of vaguely described

### Risks

- review without categorization becomes too subjective
- design debt may be noticed late unless findings are concrete

---

## Sprint 4

### Goal

Use the Sprint 3 report to complete the final product pass and prepare shipment.

### Work

- fix all `must fix` GUI / UX issues from the report
- address selected `should fix` items where cost is reasonable
- rerun end-to-end visual acceptance on:
  - clean demo universe
  - normal existing data set
  - galaxy routes
  - empty states
  - observation workflow
- finalize `2.1.1` release notes
- finalize Docker / GHCR / Compose docs
- prepare ship checklist

### Acceptance

- all `must fix` issues from the Sprint 3 report are resolved
- no release-blocking visual incoherence remains
- demo mode, docs, and product UI tell the same story
- Boa is ready to ship as `2.1.1`

### Risks

- Sprint 3 may surface more work than expected
- some `should fix` items may need deferral to a later release

---

## Non-Goals

Boa 2.1.1 does not exist to introduce major new concepts.

Out of scope unless separately approved:

- new persistence models
- large workflow expansions
- unrelated backend architecture changes
- broad redesign of Starlight or Bug Wave semantics
- operator features unrelated to product polish and release readiness

## Suggested Ship Criteria

Ship Boa 2.1.1 when all of the following are true:

- demo data is clean and believable
- header / legend / hidden system entry points feel unified
- a GUI / UX review report has been completed
- all `must fix` issues from that report are done
- Docker / GHCR / Compose guidance is current
- release notes are ready

## Suggested Tag

- `v2.1.1`
