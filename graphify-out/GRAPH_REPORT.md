# Graph Report - .  (2026-06-17)

## Corpus Check
- 21 files · ~97,779 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 406 nodes · 1407 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 61% EXTRACTED · 39% INFERRED · 0% AMBIGUOUS · INFERRED: 552 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API & Domain Models|API & Domain Models]]
- [[_COMMUNITY_Timeline Rendering|Timeline Rendering]]
- [[_COMMUNITY_QA Reset & Storage|QA Reset & Storage]]
- [[_COMMUNITY_Docs & Deployment Config|Docs & Deployment Config]]
- [[_COMMUNITY_API Test Suite|API Test Suite]]
- [[_COMMUNITY_Input Validation Sanitizers|Input Validation Sanitizers]]
- [[_COMMUNITY_Release Management UI|Release Management UI]]
- [[_COMMUNITY_API Hardening Tests|API Hardening Tests]]
- [[_COMMUNITY_YAML ImportExport|YAML Import/Export]]
- [[_COMMUNITY_Reminder & Plugin UI|Reminder & Plugin UI]]
- [[_COMMUNITY_Playwright E2E Tests|Playwright E2E Tests]]
- [[_COMMUNITY_Board Layout & Month Ruler|Board Layout & Month Ruler]]
- [[_COMMUNITY_Journey Dialog UI|Journey Dialog UI]]
- [[_COMMUNITY_Journey Milestone Editor|Journey Milestone Editor]]
- [[_COMMUNITY_Release Date Math|Release Date Math]]
- [[_COMMUNITY_Acknowledgement UI|Acknowledgement UI]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]

## God Nodes (most connected - your core abstractions)
1. `BoaStorage` - 76 edges
2. `Milestone` - 53 edges
3. `ReleaseBlueprint` - 53 edges
4. `NotificationRecord` - 47 edges
5. `ReleaseRecord` - 46 edges
6. `MilestoneRecord` - 46 edges
7. `ReleaseTimeline` - 46 edges
8. `ReminderState` - 46 edges
9. `PluginDescriptor` - 46 edges
10. `BugSnapshotSubmission` - 46 edges

## Surprising Connections (you probably didn't know these)
- `Boa Mascot Hero Image` --references--> `Boa Project`  [INFERRED]
  boa.jpeg → README.md
- `date` --uses--> `BoaStorage`  [INFERRED]
  tests/test_playwright_e2e.py → src/boa/storage.py
- `Path` --uses--> `BoaStorage`  [INFERRED]
  tests/test_playwright_secret_validation.py → src/boa/storage.py
- `Boa Logo Mark` --rationale_for--> `Visual First Principle`  [INFERRED]
  src/boa/static/boa-logo.png → README.md
- `Horizon Selector` --semantically_similar_to--> `Timeline Shift Capability`  [INFERRED] [semantically similar]
  src/boa/static/index.html → README.md

## Import Cycles
- 1-file cycle: `src/boa/domain.py -> src/boa/domain.py`
- 1-file cycle: `src/boa/api.py -> src/boa/api.py`
- 1-file cycle: `src/boa/storage.py -> src/boa/storage.py`

## Hyperedges (group relationships)
- **GHCR Publish Pipeline** — workflows_docker_ghcr, workflows_docker_ghcr_buildx, workflows_docker_ghcr_login, workflows_docker_ghcr_metadata, workflows_docker_ghcr_buildpush [EXTRACTED 1.00]
- **Timeline UI Surface** — static_index_timeline_board, static_index_month_ruler, static_index_legend, static_index_release_template [EXTRACTED 1.00]
- **Boa Design Principles** — readme_timeline_first, readme_yaml_first, readme_accountability, readme_visual_first [EXTRACTED 1.00]

## Communities (18 total, 1 thin omitted)

### Community 0 - "API & Domain Models"
Cohesion: 0.17
Nodes (78): AckRecord, BaseModel, AckRequest, AckResponse, AppConfigResponse, _blueprint_response(), BugSnapshotCreateRequest, BugSnapshotResponse (+70 more)

### Community 1 - "Timeline Rendering"
Cohesion: 0.08
Nodes (38): applyBoardControls(), buildTimelineScale(), buildTimelineSpinePath(), buildWaveAreaPath(), buildWaveLinePath(), closeReleaseMenu(), drawRelease(), elements (+30 more)

### Community 2 - "QA Reset & Storage"
Cohesion: 0.13
Nodes (9): ArgumentParser, build_parser(), main(), Local QA helpers for resetting Boa release data., Delete all releases and cascading runtime data from the local QA database., reset_release_data(), BoaStorage, Repository layer for Boa's persisted state. (+1 more)

### Community 3 - "Docs & Deployment Config"
Cohesion: 0.07
Nodes (33): Boa Mascot Hero Image, boa-data Docker Volume, Boa Docker Compose Service, Healthcheck Config, Accountability over Authentication, Acknowledgements Capability, Boa Project, Bug Wave Capability (+25 more)

### Community 4 - "API Test Suite"
Cohesion: 0.16
Nodes (25): create_app(), SQLite-backed storage for Boa releases and runtime state., TestClient, test_ack_note_can_be_saved_and_edited_without_changing_ack_time(), test_ack_requires_matching_secret(), test_bug_snapshot_date_is_server_observed(), test_config_exposes_journey_fold_days(), test_delete_release_removes_related_rows() (+17 more)

### Community 5 - "Input Validation Sanitizers"
Cohesion: 0.09
Nodes (8): _clean_text(), pending_reminder_types(), Core domain objects for Boa release blueprints., reminder_type_due_on_day(), date, datetime, timedelta, ValueError

### Community 6 - "Release Management UI"
Cohesion: 0.23
Nodes (22): closeJourneyDialog(), deleteMilestone(), deleteRelease(), exportReleaseYaml(), finishMilestoneDrag(), formatCalendarDate(), getSelectedEditRelease(), handleReleaseMenuAction() (+14 more)

### Community 7 - "API Hardening Tests"
Cohesion: 0.23
Nodes (20): create_release(), make_client(), test_ack_rejects_unexpected_fields(), test_ack_trims_note(), test_bug_snapshot_rejects_bad_payloads_and_accepts_frequent_observations(), test_failed_ack_does_not_create_ack_state_or_persist_note(), test_integer_path_parameters_reject_non_integer_values(), test_milestone_accepts_date_boundaries_and_rejects_invalid_dates() (+12 more)

### Community 8 - "YAML Import/Export"
Cohesion: 0.21
Nodes (18): Any, _blueprint_from_mapping(), dump_release_blueprint(), load_release_blueprint(), _milestone_from_mapping(), _parse_date(), YAML import and export helpers for Boa release blueprints., _require_non_empty_string() (+10 more)

### Community 9 - "Reminder & Plugin UI"
Cohesion: 0.18
Nodes (19): buildReminderStateFromItems(), escapeHtml(), extractOptionalError(), getSelectedPlugin(), getSelectedPluginRelease(), loadPluginCatalog(), loadReminderState(), normalizePluginCatalog() (+11 more)

### Community 10 - "Playwright E2E Tests"
Cohesion: 0.28
Nodes (15): ack_milestone_via_api(), begin_new_journey(), boa_url(), create_release_via_api(), _free_port(), page(), date, Path (+7 more)

### Community 11 - "Board Layout & Month Ruler"
Cohesion: 0.23
Nodes (12): buildMonthLabels(), getBoardReleaseGroups(), getSortedReleasesForBoard(), getTimelineBoardMetrics(), getViewportNowRatioInTrack(), positionStoryGuides(), render(), renderMonthRuler() (+4 more)

### Community 12 - "Journey Dialog UI"
Cohesion: 0.20
Nodes (12): closeComposer(), createInitialJourneyDraft(), createJourneyDraftFromBlueprint(), createJourneyDraftFromRelease(), openComposerForImport(), openJourneyDialog(), openJourneyDialogFromDraft(), showJourneyDialog() (+4 more)

### Community 13 - "Journey Milestone Editor"
Cohesion: 0.25
Nodes (11): addJourneyMilestone(), closeJourneyMilestoneEditor(), createJourneyMilestone(), deleteJourneyMilestone(), finishJourneyDrag(), getJourneyActiveMilestone(), getJourneyTimelineScale(), renderJourneyDraft() (+3 more)

### Community 14 - "Release Date Math"
Cohesion: 0.27
Nodes (11): dateishTime(), daysBetween(), getOrderedMilestones(), getReleaseDestinationTime(), getReleaseFinalMilestone(), getReleaseKickoffTime(), getReleaseSortTime(), isReleaseEndedBeyondFoldWindow() (+3 more)

### Community 15 - "Acknowledgement UI"
Cohesion: 0.24
Nodes (11): formatDate(), formatDateTime(), formatLocalDate(), getSelectedAckMilestone(), getSelectedAckRelease(), isoDateFromOffset(), normalizeReminderItem(), numberish() (+3 more)

## Knowledge Gaps
- **18 isolated node(s):** `RELEASE_VIEWBOX`, `STORY_LAYOUT`, `state`, `elements`, `Docker Buildx Setup` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BoaStorage` connect `QA Reset & Storage` to `API & Domain Models`, `Playwright E2E Tests`, `API Test Suite`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `TestClient` connect `API Test Suite` to `QA Reset & Storage`, `API Hardening Tests`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `create_app()` connect `API Test Suite` to `API & Domain Models`, `Playwright E2E Tests`, `API Hardening Tests`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 46 inferred relationships involving `BoaStorage` (e.g. with `ArgumentParser` and `AckRequest`) actually correct?**
  _`BoaStorage` has 46 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `Milestone` (e.g. with `AckRecord` and `Any`) actually correct?**
  _`Milestone` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `ReleaseBlueprint` (e.g. with `AckRecord` and `Any`) actually correct?**
  _`ReleaseBlueprint` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `NotificationRecord` (e.g. with `AckRecord` and `AckRequest`) actually correct?**
  _`NotificationRecord` has 44 INFERRED edges - model-reasoned connections that need verification._