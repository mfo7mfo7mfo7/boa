const SVG_NS = "http://www.w3.org/2000/svg";
const RELEASE_VIEWBOX = {
  width: 1120,
  height: 280,
  baselineY: 208,
  leftPad: 18,
  rightPad: 18,
};

const STORY_LAYOUT = {
  projectUnits: 2,
  pastUnits: 4,
  futureUnits: 6,
};

STORY_LAYOUT.timelineUnits = STORY_LAYOUT.pastUnits + STORY_LAYOUT.futureUnits;
STORY_LAYOUT.totalUnits = STORY_LAYOUT.projectUnits + STORY_LAYOUT.timelineUnits;
STORY_LAYOUT.projectRatio = STORY_LAYOUT.projectUnits / STORY_LAYOUT.totalUnits;
STORY_LAYOUT.timelineRatio = STORY_LAYOUT.timelineUnits / STORY_LAYOUT.totalUnits;
STORY_LAYOUT.nowRatioInTimeline = STORY_LAYOUT.pastUnits / STORY_LAYOUT.timelineUnits;

const BOARD_NOW_RATIO = 0.5;
const STARLIGHT_VISUAL_CONFIG = {
  bugWaveApexStarlight: 75,
  bugWaveMinHeightRatio: 0.08,
  bugWaveMaxHeightRatio: 1,
  bugWaveLowRiskThreshold: 5,
  bugWaveLowRiskMaxHeightRatio: 0.25,
  bugWaveUseRollingPeak: false,
  bugWaveFallbackPeakRisk: 1,
  bugWaveSmoothingWindow: 3,
};
const JOURNEY_INTERACTION_CONFIG = {
  dragStartThresholdPx: 12,
  dragPixelsPerDay: 24,
  dragFallbackRangeDays: 3650,
  selectionStartThresholdPx: 8,
};
const BUG_WAVE_MANUAL_FIXTURES = {
  normalConvergence: [10, 30, 80, 50, 20],
  newPeakToday: [10, 30, 80, 90],
  lowRiskRelease: [0, 1, 2, 1, 0],
  noBugs: [0, 0, 0],
  flatHighRisk: [50, 50, 50, 50],
};
const DATE_FORMAT_STORAGE_KEY = "boa.dateFormat";
const DATE_FORMAT_OPTIONS = {
  storybook: {
    label: "Jun 29, 2026",
    shortLabel: "Jun 29",
  },
  iso: {
    label: "2026-06-29",
    shortLabel: "2026-06-29",
  },
  "day-first": {
    label: "29 Jun 2026",
    shortLabel: "29 Jun",
  },
};

const state = {
  releases: [],
  timeline: null,
  pageScope: getPageScope(),
  journeyFoldDays: 15,
  horizonMonths: 3,
  perspective: "due-soon",
  dateFormat: getDateFormatPreference(),
  journeyDraft: null,
  activeMenuReleaseId: null,
  expandedReleaseIds: new Set(),
  ackContext: null,
  ackSubmitPendingConfirmation: false,
  ackSubmitConfirmationArmedAt: 0,
  ackSubmitConfirmUnlockTimer: null,
  observationContext: null,
  observationDetailPreview: false,
  observationByRelease: {},
  drag: null,
  nowToggleExpanded: {
    top: false,
    bottom: false,
  },
};

const elements = {
  releaseStage: document.querySelector(".release-stage"),
  board: document.querySelector("#timeline-board"),
  boardSummary: document.querySelector("#board-summary"),
  empty: document.querySelector("#empty-state"),
  emptyEyebrow: document.querySelector("#empty-eyebrow"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyBody: document.querySelector("#empty-body"),
  emptyReturnLink: document.querySelector("#empty-return-link"),
  monthRuler: document.querySelector("#month-ruler"),
  monthRulerWrap: document.querySelector(".month-ruler-wrap"),
  journeyStar: document.querySelector(".journey-star"),
  nowLine: document.querySelector(".now-line"),
  nowLabel: document.querySelector(".now-label"),
  nowToggles: [...document.querySelectorAll("[data-now-toggle]")],
  journeyDialog: document.querySelector("#journey-dialog"),
  closeJourneyDialogButton: document.querySelector("#close-journey-dialog-button"),
  journeyKicker: document.querySelector("#journey-kicker"),
  journeyTitle: document.querySelector("#journey-title"),
  journeyIntro: document.querySelector("#journey-intro"),
  journeyForm: document.querySelector("#journey-form"),
  journeyProduct: document.querySelector("#journey-product"),
  journeyVersion: document.querySelector("#journey-version"),
  journeySecret: document.querySelector("#journey-secret"),
  journeyCreateButton: document.querySelector("#journey-create-button"),
  journeyMessage: document.querySelector("#journey-message"),
  journeyTimeline: document.querySelector("#journey-timeline"),
  journeyAddMilestone: document.querySelector("#journey-add-milestone"),
  journeyMilestonePopover: document.querySelector("#journey-milestone-popover"),
  journeyMilestoneTitle: document.querySelector("#journey-milestone-title"),
  journeyMilestoneDate: document.querySelector("#journey-milestone-date"),
  journeyMilestoneName: document.querySelector("#journey-milestone-name"),
  journeyMilestoneOwner: document.querySelector("#journey-milestone-owner"),
  journeyMilestoneNote: document.querySelector("#journey-milestone-note"),
  journeyMilestoneEmail: document.querySelector("#journey-milestone-email"),
  journeyMilestoneMenu: document.querySelector("#journey-milestone-menu"),
  journeyMilestoneMenuPanel: document.querySelector("#journey-milestone-menu-panel"),
  journeyMilestoneDelete: document.querySelector("#journey-milestone-delete"),
  horizonSelector: document.querySelector("#horizon-selector"),
  perspectiveSelector: document.querySelector("#perspective-selector"),
  seedButton: document.querySelector("#seed-button"),
  newReleaseButton: document.querySelector("#new-release-button"),
  boardScope: document.querySelector("#board-scope"),
  journeyActionMenu: document.querySelector("#journey-action-menu"),
  newJourneyOption: document.querySelector("#new-journey-option"),
  importJourneyOption: document.querySelector("#import-journey-option"),
  emptyNewReleaseButton: document.querySelector("#empty-new-release-button"),
  statusPill: document.querySelector("#status-pill"),
  importDialog: document.querySelector("#import-dialog"),
  closeImportDialogButton: document.querySelector("#close-import-dialog-button"),
  createMessage: document.querySelector("#import-message"),
  importForm: document.querySelector("#import-form"),
  importFile: document.querySelector("#import-file"),
  importFileSummary: document.querySelector("#import-file-summary"),
  importKeepOriginal: document.querySelector("#import-keep-original"),
  importShiftTimeline: document.querySelector("#import-shift-timeline"),
  importKickoffLabel: document.querySelector("#import-kickoff-label"),
  importKickoffDate: document.querySelector("#import-kickoff-date"),
  importMessage: document.querySelector("#import-message"),
  ackDialog: document.querySelector("#ack-dialog"),
  closeAckDialogButton: document.querySelector("#close-ack-dialog-button"),
  ackForm: document.querySelector("#ack-form"),
  ackReleaseName: document.querySelector("#ack-release-name"),
  ackReleaseVersion: document.querySelector("#ack-release-version"),
  ackMilestoneName: document.querySelector("#ack-milestone-name"),
  ackMilestoneDate: document.querySelector("#ack-milestone-date"),
  ackDate: document.querySelector("#ack-date"),
  ackTrail: document.querySelector("#ack-trail"),
  ackSecret: document.querySelector("#ack-secret"),
  ackName: document.querySelector("#ack-name"),
  ackKeeperDisplay: document.querySelector("#ack-keeper-display"),
  ackKeeperChangeButton: document.querySelector("#ack-keeper-change-button"),
  ackNote: document.querySelector("#ack-note"),
  ackHint: document.querySelector("#ack-hint"),
  ackSubmitButton: document.querySelector("#ack-submit-button"),
  ackMessage: document.querySelector("#ack-message"),
  observationDialog: document.querySelector("#observation-dialog"),
  closeObservationDialogButton: document.querySelector("#close-observation-dialog-button"),
  observationForm: document.querySelector("#observation-form"),
  observationReleaseName: document.querySelector("#observation-release-name"),
  observationReleaseVersion: document.querySelector("#observation-release-version"),
  observationLastUpdated: document.querySelector("#observation-last-updated"),
  observationStatusPill: document.querySelector("#observation-status-pill"),
  observationStateSummary: document.querySelector("#observation-state-summary"),
  observationStarlight: document.querySelector("#observation-starlight"),
  observationStarlightReadout: document.querySelector("#observation-starlight-readout"),
  observationStorms: document.querySelector("#observation-storms"),
  observationStormSummary: document.querySelector("#observation-storm-summary"),
  observationWhisper: document.querySelector("#observation-whisper"),
  observationDetail: document.querySelector("#observation-detail"),
  observationDetailPreview: document.querySelector("#observation-detail-preview"),
  observationDetailPreviewToggle: document.querySelector("#observation-detail-preview-toggle"),
  observationDone: document.querySelector("#observation-done"),
  observationTotal: document.querySelector("#observation-total"),
  observationBlocked: document.querySelector("#observation-blocked"),
  observationTrailSummary: document.querySelector("#observation-trail-summary"),
  observationSaveButton: document.querySelector("#observation-save-button"),
  observationMessage: document.querySelector("#observation-message"),
  engineButton: document.querySelector("#engine-button"),
  engineDialog: document.querySelector("#engine-dialog"),
  closeEngineDialogButton: document.querySelector("#close-engine-dialog-button"),
  engineSmtpLamp: document.querySelector("#engine-smtp-lamp"),
  engineSmtpTitle: document.querySelector("#engine-smtp-title"),
  engineSmtpStatus: document.querySelector("#engine-smtp-status"),
  engineSmtpMessage: document.querySelector("#engine-smtp-message"),
  engineSmtpHost: document.querySelector("#engine-smtp-host"),
  engineSmtpFrom: document.querySelector("#engine-smtp-from"),
  engineSmtpSecurity: document.querySelector("#engine-smtp-security"),
  engineDateFormatButton: document.querySelector("#engine-date-format-button"),
  engineDateFormatLabel: document.querySelector("#engine-date-format-label"),
  engineDateFormatMenu: document.querySelector("#engine-date-format-menu"),
  engineSmtpTestForm: document.querySelector("#engine-smtp-test-form"),
  engineSmtpTestTo: document.querySelector("#engine-smtp-test-to"),
  engineSmtpSendButton: document.querySelector("#engine-smtp-send-button"),
  engineSmtpTestMessage: document.querySelector("#engine-smtp-test-message"),
  editMessage: document.querySelector("#journey-message"),
  releaseTemplate: document.querySelector("#release-template"),
};

async function request(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload.detail) {
        message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch (_error) {
      // keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function requestOptional(path, options = {}) {
  try {
    const response = await fetch(path, options);
    const contentType = response.headers.get("content-type") || "";
    let payload = null;

    if (response.status === 204) {
      payload = null;
    } else if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      payload: null,
      error,
    };
  }
}

async function loadTimeline() {
  setStatus("Listening");
  try {
    const query = state.pageScope.mode === "galaxy"
      ? `?galaxy=${encodeURIComponent(state.pageScope.galaxySlug)}`
      : "";
    const timelinePayload = await request(`/api/timeline${query}`);
    state.releases = timelinePayload.map(normalizeTimelineRelease);
    state.observationByRelease = Object.fromEntries(
      state.releases.map((release) => [release.id, buildObservationWorkspaceFromRelease(release)]),
    );
    if (state.pageScope.mode === "galaxy" && state.releases.length) {
      state.pageScope.label = state.releases[0].product;
    }
    state.timeline = buildTimelineScale(state.releases);
    if (state.observationContext?.releaseId) {
      const activeRelease = getReleaseById(state.observationContext.releaseId);
      if (activeRelease) {
        state.observationContext = buildObservationContext(
          activeRelease,
          state.observationByRelease[activeRelease.id] || buildObservationWorkspaceFromRelease(activeRelease),
        );
      } else {
        state.observationContext = null;
      }
    }
    render();
    if (state.pageScope.mode === "galaxy" && !state.releases.length) {
      setStatus("Uncharted galaxy");
    } else {
      setStatus(state.releases.length ? "Quietly current" : "Waiting");
    }
  } catch (error) {
    console.error(error);
    state.releases = [];
    state.timeline = buildTimelineScale([]);
    syncBoardChromeVisibility(false);
    elements.board.innerHTML = `<section class="empty-state"><p class="empty-eyebrow">Unable to load</p><h2>The horizon is hidden.</h2><p>${escapeHtml(error.message)}</p></section>`;
    elements.empty.classList.add("hidden");
    updateBoardSummary();
    setStatus("Load failed");
  }
}

async function loadAppConfig() {
  try {
    const config = await request("/api/config");
    const journeyFoldDays = Number(config.journey_fold_days ?? config.stale_kickoff_days);
    if (Number.isFinite(journeyFoldDays) && journeyFoldDays >= 0) {
      state.journeyFoldDays = journeyFoldDays;
    }
  } catch (error) {
    console.warn("Using default Boa config.", error);
  }
}

function render(allowTimelineRealign = true) {
  elements.board.innerHTML = "";
  const { endedReleases, activeReleases, upcomingReleases } = getBoardReleaseGroups(state.releases);
  const releases = [
    ...(state.nowToggleExpanded.top ? endedReleases : []),
    ...activeReleases,
    ...(state.nowToggleExpanded.bottom ? upcomingReleases : []),
  ];
  const hasAnyReleases = state.releases.length > 0;
  const hasReleases = releases.length > 0;
  syncPageScope();
  renderEmptyState(hasAnyReleases);
  syncBoardChromeVisibility(hasAnyReleases);
  elements.empty.classList.toggle("hidden", hasAnyReleases);
  updateBoardSummary();
  syncNowControls();

  if (hasAnyReleases) {
    renderMonthRuler(state.timeline);
  } else {
    renderMonthRuler(null);
  }

  releases.forEach((release, index) => {
    const fragment = elements.releaseTemplate.content.cloneNode(true);
    const releaseTitle = `${release.product} ${release.version}`;
    const orderedMilestones = getOrderedMilestones(release);
    const palette = getReleasePalette(release, index);

    const productNode = fragment.querySelector(".release-product");
    const galaxyHref = `/${slugify(release.product)}`;
    productNode.textContent = release.product;
    productNode.setAttribute("href", galaxyHref);
    productNode.setAttribute("aria-label", `Open ${release.product} galaxy`);
    if (state.pageScope.mode === "galaxy" && state.pageScope.galaxySlug === slugify(release.product)) {
      productNode.setAttribute("aria-current", "page");
    }
    const versionNode = fragment.querySelector(".release-version");
    versionNode.textContent = release.version;
    versionNode.style.color = palette.stroke;

    const menuButton = fragment.querySelector(".release-menu-button");
    const menu = fragment.querySelector(".release-menu");
    const isMenuOpen = state.activeMenuReleaseId === release.id;
    menu.classList.toggle("hidden", !isMenuOpen);
    menuButton.setAttribute("aria-expanded", String(isMenuOpen));
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleReleaseMenu(release.id);
    });
    menu.querySelectorAll(".release-menu-item").forEach((item) => {
      item.addEventListener("click", () => handleReleaseMenuAction(release, item.dataset.action));
    });
    const observeButton = fragment.querySelector(".release-observe-button");
    if (observeButton) {
      observeButton.textContent = release.starlight ? "Continue Observation" : "Today’s Reading";
      observeButton.addEventListener("click", () => openObservationDialog(release.id));
    }

    const row = fragment.querySelector(".release-row");
    row.setAttribute("aria-label", releaseTitle);
    row.dataset.releaseId = String(release.id);
    row.classList.toggle("dates-visible", state.expandedReleaseIds.has(release.id));
    row.style.setProperty("--release-accent", palette.stroke);
    row.style.setProperty("--release-soft-rgb", palette.softRgb);
    row.style.setProperty("--release-stroke-rgb", palette.strokeRgb);
    row.style.setProperty("--release-shadow-rgb", palette.shadowRgb);
    renderReleaseStarlight(fragment, release);

    const svg = fragment.querySelector(".release-canvas");
    const detailCard = fragment.querySelector(".starlight-detail-card");
    const milestoneCard = fragment.querySelector(".milestone-note-card");
    drawRelease(
      svg,
      { ...release, milestones: orderedMilestones },
      state.timeline,
      palette,
      { detailCard, milestoneCard },
    );

    elements.board.appendChild(fragment);
  });
  if (hasReleases) {
    positionStoryGuides();
    if (allowTimelineRealign) {
      const actualNowRatio = getViewportNowRatioInTrack();
      const currentNowRatio = (state.timeline?.todayPercent ?? BOARD_NOW_RATIO * 100) / 100;
      if (Math.abs(actualNowRatio - currentNowRatio) > 0.005) {
        state.timeline = buildTimelineScale(state.releases, actualNowRatio);
        render(false);
        return;
      }
    }
  }
}

function renderReleaseStarlight(fragment, release) {
  const panel = fragment.querySelector(".starlight-summary");
  const starlight = release.starlight || null;
  if (!panel) {
    return;
  }

  panel.classList.remove("hidden");
  const whisperNode = fragment.querySelector(".starlight-whisper");
  if (!starlight) {
    whisperNode.textContent = "The sky has not been written yet.";
    panel.title = "Open the observation workspace to record where the journey is now.";
    return;
  }

  whisperNode.textContent = starlight.whisper;
  const metricBits = summarizeStarlightMetrics(starlight.metrics);
  panel.title = metricBits ? `${starlight.whisper} • ${metricBits}` : starlight.whisper;
}

function describeStarlightState(value) {
  if (value >= 90) {
    return "Ready sky";
  }
  if (value >= 75) {
    return "Confident";
  }
  if (value >= 50) {
    return "Advancing";
  }
  if (value >= 25) {
    return "Emerging";
  }
  return "Faint";
}

function getPageScope() {
  const pathname = window.location.pathname.replace(/\/+$/g, "") || "/";
  if (pathname === "/") {
    return {
      mode: "universe",
      galaxySlug: null,
      label: "All journeys",
    };
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) {
    const galaxySlug = slugify(segments[0]);
    if (galaxySlug) {
      return {
        mode: "galaxy",
        galaxySlug,
        label: formatGalaxyTitle(segments[0]),
      };
    }
  }
  return {
    mode: "universe",
    galaxySlug: null,
    label: "All journeys",
  };
}

function formatGalaxyLabel(value) {
  return String(value || "")
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function formatGalaxyTitle(value) {
  return formatGalaxyLabel(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function syncPageScope() {
  if (state.pageScope.mode === "galaxy") {
    const label = state.pageScope.label || formatGalaxyTitle(state.pageScope.galaxySlug);
    elements.boardScope.textContent = `Galaxy view: ${label}`;
    elements.boardScope.classList.remove("hidden");
    return;
  }
  elements.boardScope.textContent = "";
  elements.boardScope.classList.add("hidden");
}

function renderEmptyState(hasAnyReleases) {
  const isGalaxy = state.pageScope.mode === "galaxy";
  elements.releaseStage.classList.toggle("is-empty-state", !hasAnyReleases);
  elements.releaseStage.classList.toggle("is-empty-galaxy", isGalaxy && !hasAnyReleases);
  elements.releaseStage.classList.toggle("is-empty-universe", !isGalaxy && !hasAnyReleases);
  if (!isGalaxy) {
    elements.emptyEyebrow.textContent = "No journey yet";
    elements.emptyTitle.textContent = "The sky is waiting for its first journey.";
    elements.emptyBody.textContent = "When the first journey begins, Boa will trace its horizon.";
    elements.emptyNewReleaseButton.classList.remove("hidden");
    elements.seedButton.classList.remove("hidden");
    elements.emptyReturnLink.classList.add("hidden");
    return;
  }

  const galaxyLabel = state.pageScope.label || formatGalaxyTitle(state.pageScope.galaxySlug);
  elements.emptyEyebrow.textContent = "Galaxy not found";
  elements.emptyTitle.textContent = `${galaxyLabel} has not been observed yet.`;
  elements.emptyBody.textContent = hasAnyReleases
    ? "This galaxy is quiet for now."
    : "No journeys map to this galaxy yet. Return to the full universe to keep traveling.";
  elements.emptyNewReleaseButton.classList.add("hidden");
  elements.seedButton.classList.add("hidden");
  elements.emptyReturnLink.classList.remove("hidden");
}

function syncBoardChromeVisibility(hasAnyReleases) {
  const shouldShow = Boolean(hasAnyReleases);
  elements.nowLine.classList.toggle("hidden", !shouldShow);
  elements.nowLabel.classList.toggle("hidden", !shouldShow);
  elements.monthRulerWrap.classList.toggle("hidden", !shouldShow);
  elements.journeyStar.classList.toggle("hidden", !shouldShow);
  elements.nowToggles.forEach((toggle) => {
    toggle.classList.toggle("hidden", !shouldShow);
  });
}

function normalizeTimelineRelease(release) {
  return {
    ...release,
    milestones: Array.isArray(release.milestones) ? release.milestones.map(normalizeTimelineMilestone) : [],
    bug_snapshots: Array.isArray(release.bug_snapshots) ? release.bug_snapshots.map((snapshot) => ({ ...snapshot })) : [],
    starlight: normalizeStarlightStatus(release.starlight),
    starlight_trail: Array.isArray(release.starlight_trail)
      ? release.starlight_trail.map(normalizeStarlightEvent)
      : [],
  };
}

function normalizeTimelineMilestone(milestone) {
  return {
    ...milestone,
    note: normalizeBoaNote(milestone?.note),
    ack_note: normalizeBoaNote(milestone?.ack_note),
    ack_trail: Array.isArray(milestone?.ack_trail) ? milestone.ack_trail.map(normalizeAckTrailEvent) : [],
  };
}

function normalizeAckTrailEvent(event) {
  return {
    id: Number(event?.id || 0),
    acked_at: event?.acked_at || null,
    ack_name: String(event?.ack_name || ""),
    note: normalizeBoaNote(event?.note),
  };
}

function normalizeBoaNote(note) {
  const content = typeof note === "string"
    ? note
    : (note && typeof note === "object" ? note.content : "");
  const cleaned = String(content || "").trim();
  return cleaned ? { content: cleaned } : null;
}

function normalizeStarlightStatus(starlight) {
  if (!starlight || typeof starlight !== "object") {
    return null;
  }
  return {
    release_id: Number(starlight.release_id),
    starlight: Number(starlight.starlight),
    whisper: String(starlight.whisper || ""),
    observed_on: starlight.observed_on || null,
    updated_at: starlight.updated_at || null,
    detail: normalizeStarlightDetail(starlight.detail),
    metrics: normalizeStarlightMetrics(starlight.metrics || starlight.details),
  };
}

function normalizeStarlightEvent(event) {
  return {
    date: event?.date || null,
    starlight: Number(event?.starlight || 0),
    whisper: String(event?.whisper || ""),
    detail: normalizeStarlightDetail(event?.detail),
    metrics: normalizeStarlightMetrics(event?.metrics || event?.details),
  };
}

function normalizeStarlightDetail(detail) {
  return {
    type: detail?.type === "markdown" ? "markdown" : "markdown",
    content: String(detail?.content || ""),
  };
}

function normalizeStarlightMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return null;
  }
  return {
    done: Number(metrics?.done || 0),
    total: Number(metrics?.total || 0),
    blocked: Number(metrics?.blocked || 0),
  };
}

function normalizeObservationWorkspace(payload, releaseFallback = null) {
  const fallbackReleaseId = Number(releaseFallback?.id || payload?.release_id || 0);
  return {
    release_id: fallbackReleaseId,
    product: String(payload?.product || releaseFallback?.product || ""),
    version: String(payload?.version || releaseFallback?.version || ""),
    current: normalizeStarlightStatus(payload?.current),
    trail: Array.isArray(payload?.trail) ? payload.trail.map(normalizeStarlightEvent) : [],
  };
}

function buildObservationWorkspaceFromRelease(release) {
  return normalizeObservationWorkspace({
    release_id: release?.id,
    product: release?.product,
    version: release?.version,
    current: release?.starlight || null,
    trail: release?.starlight_trail || [],
  }, release);
}

function getBoaNoteContent(note) {
  return String(note?.content || "").trim();
}

function hasBoaNote(note) {
  return Boolean(getBoaNoteContent(note));
}

function getTimelineBoardMetrics() {
  const firstRow = elements.board.querySelector(".release-row");
  const firstTrack = elements.board.querySelector(".release-track");
  const firstCanvas = elements.board.querySelector(".release-canvas");
  const boardRect = elements.board.getBoundingClientRect();
  const rowRect = firstRow?.getBoundingClientRect() || boardRect;
  const trackRect = firstTrack?.getBoundingClientRect() || boardRect;
  const canvasRect = firstCanvas?.getBoundingClientRect() || trackRect;
  const projectWidth = rowRect.width * STORY_LAYOUT.projectRatio;
  const timelineWidth = rowRect.width * STORY_LAYOUT.timelineRatio;
  const trackLeft = rowRect.left + projectWidth;
  const trackWidth = Math.max(trackRect.width || timelineWidth, 320);
  const canvasWidth = Math.max(canvasRect.width || trackWidth, 320);
  const todayPercent = BOARD_NOW_RATIO;

  return {
    boardRect,
    rowRect,
    trackRect,
    canvasRect,
    projectWidth,
    timelineWidth,
    trackLeft,
    trackWidth,
    canvasWidth,
    todayPercent,
  };
}

function renderMonthRuler(timeline) {
  if (!elements.monthRuler) {
    return;
  }

  elements.monthRuler.innerHTML = "";
  if (!timeline) {
    return;
  }

  const width = 960;
  const defs = svgNode("defs");
  const filter = svgNode("filter", { id: "handdrawn-month" });
  filter.appendChild(svgNode("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.018",
    numOctaves: "2",
    seed: "7",
    result: "noise",
  }));
  filter.appendChild(svgNode("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "noise",
    scale: "0.8",
  }));
  defs.appendChild(filter);
  elements.monthRuler.appendChild(defs);

  const path = svgNode("path", {
    d: "M0 0 C160 -1, 320 1, 480 0 C640 -1, 800 1, 960 0",
    filter: "url(#handdrawn-month)",
  });
  elements.monthRuler.appendChild(path);

  const labels = buildMonthLabels(timeline, width);
  labels.forEach((label) => {
    const text = svgNode("text", {
      x: String(label.x),
      y: "28",
      class: "month-label",
      "text-anchor": label.anchor,
    });
    text.textContent = label.text;
    elements.monthRuler.appendChild(text);
  });

  positionStoryGuides();
}

function buildMonthLabels(timeline, width) {
  const labels = [];
  const start = new Date(timeline.startTime);
  start.setDate(1);
  start.setHours(12, 0, 0, 0);
  const end = new Date(timeline.endTime);
  end.setDate(1);
  end.setHours(12, 0, 0, 0);
  for (const cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setMonth(cursor.getMonth() + 1)) {
    const x = Math.min(
      Math.max((width * timeline.nowRatio) + (Math.round((cursor.getTime() - timeline.todayTime) / (24 * 60 * 60 * 1000)) * (width / Math.max(timeline.totalDays, 1))), 0),
      width,
    );
    labels.push({
      x,
      anchor: x < 20 ? "start" : x > width - 20 ? "end" : "middle",
      text: cursor.toLocaleDateString(undefined, { month: "short" }),
    });
  }

  return labels;
}

function getViewportNowRatioInTrack() {
  const firstTrack = elements.board.querySelector(".release-track");
  const trackRect = firstTrack?.getBoundingClientRect();
  if (!trackRect || !trackRect.width) {
    return BOARD_NOW_RATIO;
  }
  const rawRatio = (getViewportCenterX() - trackRect.left) / trackRect.width;
  return Math.min(Math.max(rawRatio, 0.05), 0.95);
}

function getViewportCenterX() {
  if (window.visualViewport) {
    return window.visualViewport.offsetLeft + (window.visualViewport.width / 2);
  }
  return window.innerWidth / 2;
}

function positionStoryGuides() {
  const metrics = getTimelineBoardMetrics();
  if (!metrics.canvasWidth) {
    return;
  }

  const firstCanvas = elements.board.querySelector(".release-canvas");
  const canvasRect = firstCanvas?.getBoundingClientRect();
  const actualCanvasWidth = canvasRect?.width ?? metrics.canvasWidth;
  const nowViewportX = getViewportCenterX();
  const nowRatio = state.timeline?.nowRatio ?? BOARD_NOW_RATIO;
  const rulerLeft = nowViewportX - (actualCanvasWidth * nowRatio);

  if (elements.nowLine) {
    elements.nowLine.style.left = `${nowViewportX}px`;
  }
  if (elements.nowLabel) {
    elements.nowLabel.style.left = `${nowViewportX}px`;
  }
  elements.nowToggles.forEach((toggle) => {
    toggle.style.left = `${nowViewportX}px`;
  });
  if (elements.monthRulerWrap) {
    elements.monthRulerWrap.style.width = `${actualCanvasWidth}px`;
    elements.monthRulerWrap.style.left = `${rulerLeft}px`;
    elements.monthRulerWrap.style.transform = "translateX(0)";
  }
}

function toggleNowControl(position) {
  if (!Object.hasOwn(state.nowToggleExpanded, position)) {
    return;
  }
  const wasExpanded = state.nowToggleExpanded[position];
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  state.nowToggleExpanded[position] = !state.nowToggleExpanded[position];
  syncNowControls();
  if (position === "top" || position === "bottom") {
    render();
    if (!wasExpanded) {
      restoreScrollPosition(scrollX, scrollY);
    } else if (position === "top") {
      restoreScrollPosition(scrollX, scrollY);
    } else if (position === "bottom") {
      restoreScrollPosition(scrollX, scrollY);
    }
  }
}

function syncNowControls() {
  const { endedReleases, upcomingReleases } = getBoardReleaseGroups(state.releases);
  elements.nowToggles.forEach((toggle) => {
    const position = toggle.dataset.nowToggle;
    const isExpanded = Boolean(state.nowToggleExpanded[position]);
    toggle.classList.toggle("is-expanded", isExpanded);
    toggle.setAttribute("aria-expanded", String(isExpanded));
    const action = isExpanded ? "Collapse" : "Expand";
    let label = `${action} ${position} Now line panel`;
    if (position === "top" && endedReleases.length) {
      label = `${action} ended journeys folded above`;
    } else if (position === "bottom" && upcomingReleases.length) {
      label = `${action} journeys not started folded below`;
    }
    toggle.setAttribute("aria-label", label);
    const symbol = toggle.querySelector("span");
    if (symbol) {
      symbol.textContent = isExpanded ? "-" : "+";
    }
  });
}

function restoreScrollPosition(scrollX, scrollY) {
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

function getReleaseById(releaseId) {
  return state.releases.find((item) => item.id === releaseId) || null;
}

function getLatestBugSnapshot(release) {
  const snapshots = normalizeObservedBugSnapshots(release?.bug_snapshots);
  return snapshots.at(-1) || null;
}

function getObservationRelease() {
  return state.observationContext ? getReleaseById(state.observationContext.releaseId) : null;
}

function buildObservationContext(release, workspace = buildObservationWorkspaceFromRelease(release)) {
  const current = workspace.current;
  const metrics = current?.metrics || null;
  const latestSnapshot = getLatestBugSnapshot(release);
  const today = formatLocalDate(new Date());
  return {
    releaseId: release.id,
    current,
    trail: workspace.trail,
    initialStorms: latestSnapshot ? Number(latestSnapshot.open_bug_count) : null,
    fields: {
      starlight: current?.starlight ?? 0,
      observedOn: today,
      whisper: current?.whisper || "",
      detail: current?.detail?.content || "",
      storms: latestSnapshot ? String(latestSnapshot.open_bug_count) : "",
      done: metrics ? String(metrics.done) : "",
      total: metrics ? String(metrics.total) : "",
      blocked: metrics ? String(metrics.blocked) : "",
    },
  };
}

function formatObservationTrail(trail) {
  if (!trail.length) {
    return "The trail will remember the next brightening.";
  }
  const moments = trail.map((event) => `✦${event.starlight}`);
  return moments.join(" → ");
}

function syncObservationStarlightReadout(value) {
  const starlight = Math.min(Math.max(Number(value) || 0, 0), 100);
  elements.observationStarlightReadout.textContent = `${starlight} / 100 · ${describeStarlightState(starlight)}`;
}

function syncObservationStormSummary(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    elements.observationStormSummary.textContent = "Leave this blank if the weather is still unknown.";
    return;
  }
  const count = Number(trimmed);
  if (!Number.isFinite(count) || count < 0) {
    elements.observationStormSummary.textContent = "Use zero or a whole number above.";
    return;
  }
  if (count === 0) {
    elements.observationStormSummary.textContent = "The sky feels calm for now.";
    return;
  }
  if (count === 1) {
    elements.observationStormSummary.textContent = "A single trouble is still in view.";
    return;
  }
  elements.observationStormSummary.textContent = "Several known troubles are still moving through.";
}

function renderObservationWorkspace() {
  const context = state.observationContext;
  const release = getObservationRelease();
  if (!context || !release) {
    elements.observationStatusPill.hidden = true;
    elements.observationStatusPill.textContent = "";
    elements.observationReleaseName.textContent = "";
    elements.observationReleaseVersion.textContent = "";
    elements.observationLastUpdated.textContent = "";
    elements.observationStateSummary.textContent = "Bring in a journey to begin its page.";
    elements.observationStormSummary.textContent = "Storms are still unknown.";
    elements.observationTrailSummary.textContent = "The trail will remember the next brightening.";
    elements.observationMessage.textContent = "";
    elements.observationForm.reset();
    elements.observationSaveButton.disabled = true;
    syncObservationStarlightReadout(0);
    syncObservationDetailPreview();
    return;
  }

  const current = context.current;
  elements.observationSaveButton.disabled = false;
  elements.observationReleaseName.textContent = release.product;
  elements.observationReleaseVersion.textContent = release.version;
  elements.observationStatusPill.hidden = true;
  elements.observationStatusPill.textContent = "";
  elements.observationStarlight.value = String(context.fields.starlight);
  elements.observationWhisper.value = context.fields.whisper;
  elements.observationDetail.value = context.fields.detail;
  elements.observationStorms.value = context.fields.storms;
  elements.observationDone.value = context.fields.done;
  elements.observationTotal.value = context.fields.total;
  elements.observationBlocked.value = context.fields.blocked;
  syncObservationStormSummary(context.fields.storms);
  syncObservationStarlightReadout(context.fields.starlight);
  syncObservationDetailPreview();

  if (current) {
    const updatedLabel = current.updated_at ? formatDateTime(current.updated_at) : "just now";
    elements.observationLastUpdated.textContent = `Last updated ${updatedLabel}`;
    elements.observationStateSummary.textContent = current.whisper || "No current observation yet.";
  } else {
    elements.observationLastUpdated.textContent = "Last updated —";
    elements.observationStateSummary.textContent = "This page has not been written yet.";
  }

  elements.observationTrailSummary.textContent = formatObservationTrail(context.trail);
}

function renderObservationDetailPreview() {
  if (!elements.observationDetailPreview) {
    return;
  }
  renderBoaNote(elements.observationDetailPreview, elements.observationDetail.value, {
    emptyFallback: "Nothing has been written on this page yet.",
  });
}

function syncObservationDetailPreview() {
  if (!elements.observationDetail || !elements.observationDetailPreview || !elements.observationDetailPreviewToggle) {
    return;
  }
  const isPreview = Boolean(state.observationDetailPreview);
  elements.observationDetail.classList.toggle("hidden", isPreview);
  elements.observationDetailPreview.classList.toggle("hidden", !isPreview);
  elements.observationDetailPreviewToggle.setAttribute("aria-pressed", String(isPreview));
  elements.observationDetailPreviewToggle.classList.toggle("is-active", isPreview);
  elements.observationDetailPreviewToggle.querySelector(".observation-detail-preview-label").textContent = isPreview
    ? "Write"
    : "Preview";
  if (isPreview) {
    renderObservationDetailPreview();
  }
}

async function loadObservationWorkspace(releaseId, { silent = false } = {}) {
  if (!releaseId) {
    return null;
  }

  if (!silent) {
    elements.observationStatusPill.textContent = "Listening";
  }

  const release = getReleaseById(releaseId);
  const response = await requestOptional(`/api/releases/${releaseId}/observation`);
  if (!response.ok) {
    elements.observationStatusPill.textContent = "Unavailable";
    if (!silent) {
      elements.observationMessage.textContent = extractOptionalError(response);
    }
    return null;
  }

  state.observationByRelease[releaseId] = normalizeObservationWorkspace(response.payload, release);
  if (state.observationContext?.releaseId === releaseId && release) {
    state.observationContext = buildObservationContext(release, state.observationByRelease[releaseId]);
    renderObservationWorkspace();
  }
  return state.observationByRelease[releaseId];
}

function syncAckFormState() {
  const milestone = getSelectedAckMilestone();
  const release = getSelectedAckRelease();
  if (state.ackSubmitConfirmUnlockTimer) {
    window.clearTimeout(state.ackSubmitConfirmUnlockTimer);
    state.ackSubmitConfirmUnlockTimer = null;
  }
  state.ackSubmitPendingConfirmation = false;
  state.ackSubmitConfirmationArmedAt = 0;
  if (!milestone) {
    elements.ackName.value = "";
    elements.ackKeeperDisplay.textContent = "No keeper set";
    elements.ackKeeperChangeButton.classList.add("hidden");
    elements.ackNote.value = "";
    elements.ackName.disabled = true;
    elements.ackName.readOnly = true;
    elements.ackNote.disabled = false;
    elements.ackSecret.disabled = false;
    elements.ackSubmitButton.disabled = false;
    elements.ackSecret.closest(".ack-key-shell")?.classList.remove("hidden");
    elements.ackSubmitButton.classList.remove("hidden");
    elements.ackReleaseName.textContent = "No journey selected";
    elements.ackReleaseVersion.textContent = "";
    elements.ackMilestoneName.textContent = "Quietly mark this milestone.";
    elements.ackMilestoneDate.textContent = "Choose a milestone to mark.";
    elements.ackDate.textContent = "Last updated —";
    renderAckTrailEntries([
      {
        stateClass: "is-pending",
        line: "Waiting for a mark.",
        subline: "Choose a milestone, then leave its keeper and quiet note here.",
      },
    ]);
    elements.ackSubmitButton.textContent = "Acknowledge";
    elements.ackSubmitButton.classList.remove("paper-button-confirm");
    elements.ackHint.textContent = "The ack trail will remember the keeper, date, and quiet note together.";
    return;
  }

  elements.ackName.disabled = false;
  elements.ackName.readOnly = true;
  elements.ackNote.disabled = false;
  elements.ackSecret.disabled = false;
  elements.ackSubmitButton.disabled = false;
  elements.ackSecret.closest(".ack-key-shell")?.classList.remove("hidden");
  elements.ackSubmitButton.classList.remove("hidden");
  elements.ackReleaseName.textContent = release ? release.product : "";
  elements.ackReleaseVersion.textContent = release ? release.version : "";
  elements.ackMilestoneName.textContent = milestone.name;
  elements.ackMilestoneDate.textContent = `Expected on ${formatDate(milestone.expected)}.`;
  elements.ackName.value = milestone.owner || "";
  elements.ackKeeperDisplay.textContent = milestone.owner || "No keeper set";
  elements.ackKeeperChangeButton.classList.toggle("hidden", !release);
  elements.ackNote.value = "";
  elements.ackDate.textContent = milestone.acked_at
    ? `Last updated ${formatDateTime(milestone.acked_at)}`
    : "Last updated —";
  const ackTrailState = getAckTrailState(milestone);
  const ackTrailEntries = buildAckTrailEntries(milestone);
  elements.ackSubmitButton.textContent = "Acknowledge";
  elements.ackSubmitButton.classList.remove("paper-button-confirm");
  if (milestone.acked_at) {
    renderAckTrailEntries(ackTrailEntries);
    elements.ackHint.textContent = ackTrailEntries.some((entry) => entry.note)
      ? "Hover a note chip to read the quiet note."
      : "";
  } else {
    renderAckTrailEntries([
      {
        stateClass: ackTrailState.stateClass,
        line: ackTrailState.line,
        subline: ackTrailState.subline,
      },
    ]);
    elements.ackHint.textContent = ackTrailState.stateClass === "is-overdue"
      ? "Overdue, waiting for a mark."
      : "Ready for today's mark.";
  }
}

function syncAckSubmitButton() {
  if (!elements.ackSubmitButton) {
    return;
  }
  elements.ackSubmitButton.textContent = state.ackSubmitPendingConfirmation ? "Confirmed?" : "Acknowledge";
  elements.ackSubmitButton.classList.toggle("paper-button-confirm", state.ackSubmitPendingConfirmation);
}

function ensureAckActionsBound() {
  if (!elements.ackForm || !elements.ackSubmitButton) {
    return;
  }
  if (elements.ackForm.dataset.ackBound === "true" && elements.ackSubmitButton.dataset.ackBound === "true") {
    return;
  }
  elements.ackForm.onsubmit = (event) => {
    event.preventDefault();
    handleAckSubmitButtonClick();
  };
  elements.ackSubmitButton.onclick = () => {
    handleAckSubmitButtonClick();
  };
  elements.ackForm.dataset.ackBound = "true";
  elements.ackSubmitButton.dataset.ackBound = "true";
}

function resetAckConfirmationState() {
  if (state.ackSubmitConfirmUnlockTimer) {
    window.clearTimeout(state.ackSubmitConfirmUnlockTimer);
    state.ackSubmitConfirmUnlockTimer = null;
  }
  if (!state.ackSubmitPendingConfirmation) {
    state.ackSubmitConfirmationArmedAt = 0;
    elements.ackSubmitButton.disabled = false;
    syncAckSubmitButton();
    return;
  }
  state.ackSubmitPendingConfirmation = false;
  state.ackSubmitConfirmationArmedAt = 0;
  elements.ackSubmitButton.disabled = false;
  syncAckSubmitButton();
}

function setAckFieldState(field, message = "") {
  if (!field) {
    return;
  }
  const isInvalid = Boolean(message);
  field.classList.toggle("is-invalid", isInvalid);
  field.setAttribute("aria-invalid", String(isInvalid));
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getAckTrailState(milestone) {
  const expectedTime = dateishTime(milestone.expected);
  const ackTime = milestone.acked_at ? dateishTime(milestone.acked_at) : null;
  const todayTime = dateishTime(new Date());
  const isLateAck = typeof ackTime === "number" && ackTime > expectedTime;
  const isOverduePending = !milestone.acked_at && todayTime > expectedTime;

  if (milestone.acked_at) {
    return {
      stateClass: isLateAck ? "is-overdue" : "is-acknowledged",
      line: formatDateTime(milestone.acked_at),
      subline: isLateAck
        ? "This point was acknowledged after its expected day."
        : "This point in the journey has been marked in time.",
    };
  }

  if (isOverduePending) {
    return {
      stateClass: "is-overdue",
      line: `Overdue since ${formatDate(milestone.expected)}`,
      subline: "Still waiting for a keeper and quiet note.",
    };
  }

  return {
    stateClass: "is-pending",
    line: `Waiting until ${formatDate(milestone.expected)}`,
    subline: "Leave a keeper and quiet note, then confirm with the journey key.",
  };
}

function buildAckTrailEntries(milestone) {
  const trail = Array.isArray(milestone?.ack_trail) ? milestone.ack_trail : [];
  if (trail.length) {
    return trail.map((entry) => {
      const entryState = getAckEventTrailState(milestone, entry);
      return {
        stateClass: entryState.stateClass,
        line: formatDateTime(entry.acked_at),
        keeper: entry.ack_name || "Unknown keeper",
        note: getBoaNoteContent(entry.note),
      };
    });
  }

  if (!milestone?.acked_at) {
    return [];
  }

  const fallbackState = getAckTrailState(milestone);
  return [{
    stateClass: fallbackState.stateClass,
    line: formatDateTime(milestone.acked_at),
    keeper: milestone.ack_name || "Unknown keeper",
    note: getBoaNoteContent(milestone.ack_note),
  }];
}

function getAckEventTrailState(milestone, entry) {
  const expectedTime = dateishTime(milestone.expected);
  const entryTime = entry?.acked_at ? dateishTime(entry.acked_at) : null;
  const isLateAck = typeof entryTime === "number" && entryTime > expectedTime;
  return {
    stateClass: isLateAck ? "is-overdue" : "is-acknowledged",
  };
}

function renderAckTrailEntries(entries) {
  if (!elements.ackTrail) {
    return;
  }
  elements.ackTrail.replaceChildren();
  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = `ack-trail-item ${entry.stateClass}`;

    const marker = document.createElement("span");
    marker.className = "ack-trail-marker";
    marker.setAttribute("aria-hidden", "true");

    const meta = document.createElement("div");
    meta.className = "ack-trail-meta";

    const lineEl = document.createElement("p");
    lineEl.className = "ack-trail-line";
    lineEl.append(entry.line);
    if (entry.keeper) {
      const divider = document.createElement("span");
      divider.className = "ack-trail-divider";
      divider.textContent = " · ";
      lineEl.append(divider, entry.keeper);
    }
    if (entry.note) {
      const chip = document.createElement("span");
      chip.className = "ack-trail-note-chip";
      chip.dataset.noteFull = entry.note;
      chip.textContent = truncateText(entry.note, 52);
      lineEl.append(chip);
    } else if (entry.stateClass === "is-acknowledged" || entry.stateClass === "is-overdue") {
      const chip = document.createElement("span");
      chip.className = "ack-trail-note-chip is-empty";
      chip.textContent = "No quiet note";
      lineEl.append(chip);
    }

    meta.append(lineEl);
    if (entry.subline) {
      const sublineEl = document.createElement("p");
      sublineEl.className = "ack-trail-subline";
      sublineEl.textContent = entry.subline;
      meta.append(sublineEl);
    }
    item.append(marker, meta);
    elements.ackTrail.append(item);
  });
}

function getSelectedAckRelease() {
  if (!state.ackContext?.releaseId) {
    return null;
  }
  return state.releases.find((item) => item.id === state.ackContext.releaseId) || null;
}

function getSelectedAckMilestone() {
  const release = getSelectedAckRelease();
  if (!release) {
    return null;
  }
  return release.milestones.find((item) => item.id === state.ackContext?.milestoneId) || null;
}

function drawRelease(svg, release, timeline, palette, options = {}) {
  svg.innerHTML = "";
  const detailCard = options.detailCard || null;
  const milestoneCard = options.milestoneCard || null;

  const { width, height, baselineY, leftPad, rightPad } = RELEASE_VIEWBOX;

  const defs = svgNode("defs");
  const gradient = svgNode("linearGradient", {
    id: `boaWave-${release.id}`,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  gradient.appendChild(svgNode("stop", { offset: "0%", "stop-color": palette.stroke, "stop-opacity": "0.14" }));
  gradient.appendChild(svgNode("stop", { offset: "68%", "stop-color": palette.soft, "stop-opacity": "0.08" }));
  gradient.appendChild(svgNode("stop", { offset: "100%", "stop-color": palette.soft, "stop-opacity": "0" }));
  defs.appendChild(gradient);

  const filter = svgNode("filter", {
    id: "handdrawn",
  });
  filter.appendChild(svgNode("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.018",
    numOctaves: "2",
    seed: "7",
    result: "noise",
  }));
  filter.appendChild(svgNode("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "noise",
    scale: "0.8",
  }));
  defs.appendChild(filter);
  svg.appendChild(defs);

  const oneDay = 24 * 60 * 60 * 1000;
  const drawableWidth = width - leftPad - rightPad;
  const nowX = leftPad + (drawableWidth * timeline.nowRatio);
  const pixelsPerDay = drawableWidth / Math.max(timeline.totalDays, 1);
  const xForDate = (value) => {
    const point = dateishTime(value);
    const dayOffset = Math.round((point - timeline.todayTime) / oneDay);
    return nowX + (dayOffset * pixelsPerDay);
  };

  const clampX = (value) => Math.min(Math.max(value, leftPad), width - rightPad);

  const dateForX = (x) => {
    const limited = Math.min(Math.max(x, leftPad), width - rightPad);
    const rawTime = timeline.todayTime + (((limited - nowX) / pixelsPerDay) * oneDay);
    return new Date(Math.round(rawTime / 86400000) * 86400000);
  };

  const observedBugSnapshots = normalizeObservedBugSnapshots(release.bug_snapshots);
  const starlightEvents = getMeaningfulStarlightEvents(release);
  const releaseExtent = getReleaseExtent(release, observedBugSnapshots, timeline);
  const bugWaveMetrics = buildBugWaveMetrics(observedBugSnapshots, baselineY);
  const spineStartX = clampX(xForDate(releaseExtent.startTime));
  const spineEndX = clampX(xForDate(releaseExtent.endTime));

  const wash = svgNode("path", {
    d: buildWaveAreaPath(observedBugSnapshots, xForDate, baselineY, spineStartX, spineEndX, bugWaveMetrics),
    fill: `url(#boaWave-${release.id})`,
    opacity: "0.7",
    class: "wave-wash",
  });
  svg.appendChild(wash);

  const haze = svgNode("path", {
    d: buildWaveLinePath(observedBugSnapshots, xForDate, baselineY, spineStartX, spineEndX, bugWaveMetrics),
    fill: "none",
    stroke: `rgba(${palette.softRgb}, 0.5)`,
    "stroke-width": "11",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: "0.28",
    class: "wave-haze",
  });
  svg.appendChild(haze);

  const wave = svgNode("path", {
    d: buildWaveLinePath(observedBugSnapshots, xForDate, baselineY, spineStartX, spineEndX, bugWaveMetrics),
    fill: "none",
    stroke: palette.stroke,
    "stroke-width": "2.05",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: "0.82",
    class: "wave-stroke",
  });
  svg.appendChild(wave);

  const latestSnapshot = observedBugSnapshots.at(-1);
  if (latestSnapshot) {
    const sourceX = xForDate(latestSnapshot.observed_at);
    const sourceY = wavePointY(latestSnapshot, bugWaveMetrics, observedBugSnapshots.length - 1, baselineY);
    const source = svgNode("g", { class: "wave-source", cursor: "help" });
    source.appendChild(svgTitle([
      `${latestSnapshot.open_bug_count} open bugs`,
      `risk ${Math.round(getBugRisk(latestSnapshot))}`,
      `observed ${formatDateTime(latestSnapshot.observed_at)}`,
    ]));
    source.appendChild(svgNode("circle", {
      cx: String(sourceX),
      cy: String(sourceY),
      r: "9.5",
      fill: `rgba(${palette.softRgb}, 0.26)`,
      class: "wave-source-glow",
    }));
    const core = svgNode("circle", {
      cx: String(sourceX),
      cy: String(sourceY),
      r: "3.1",
      fill: `rgba(${palette.strokeRgb}, 0.9)`,
      class: "wave-source-core",
    });
    source.appendChild(core);
    svg.appendChild(source);
  }

  const spine = svgNode("path", {
    d: buildTimelineSpinePath(spineStartX, spineEndX, baselineY),
    class: "timeline-spine",
  });
  svg.appendChild(spine);

  const actionablePendingId = release.milestones.find((item) => !item.acked_at)?.id ?? null;

  release.milestones.forEach((milestone) => {
    const x = xForDate(milestone.expected);
    const notePoint = { x, y: baselineY - 24 };
    const expectedTime = dateishTime(milestone.expected);
    const ackTime = milestone.acked_at ? dateishTime(milestone.acked_at) : null;
    const isLateAck = typeof ackTime === "number" && ackTime > expectedTime;
    const isActionablePending = !milestone.acked_at && milestone.id === actionablePendingId;
    const shouldRenderAckMarker = milestone.acked_at || isActionablePending;
    const hasMilestoneContext = hasBoaNote(milestone.note) || hasBoaNote(milestone.ack_note);
    const markerColor = milestone.acked_at
      ? (isLateAck ? "#c75b4a" : "#6f9f7a")
      : "#9c9c9c";

    const milestoneGroup = svgNode("g", { class: "milestone-marker" });

    milestoneGroup.appendChild(svgNode("line", {
      x1: String(x),
      x2: String(x),
      y1: String(baselineY - 8),
      y2: String(baselineY + 8),
      stroke: "rgba(103, 92, 83, 0.24)",
      "stroke-width": "1.05",
      "stroke-dasharray": "2 6",
    }));

    const expectedIcon = svgNode("polygon", {
      points: `${x},${baselineY - 3} ${x - 7},${baselineY - 15} ${x + 7},${baselineY - 15}`,
      fill: palette.stroke,
      class: "expected-marker",
    });
    expectedIcon.appendChild(svgTitle([
      milestone.name,
      formatDate(milestone.expected),
    ]));
    if (hasMilestoneContext) {
      expectedIcon.setAttribute("tabindex", "0");
      expectedIcon.setAttribute("role", "button");
      expectedIcon.setAttribute("aria-label", `${milestone.name} note`);
      bindMilestoneNoteTrigger(expectedIcon, milestoneCard, svg, notePoint, milestone);
    }
    milestoneGroup.appendChild(expectedIcon);
    milestoneGroup.appendChild(labelTextNode(milestone.name, x, baselineY - 22, "rgba(47, 55, 70, 0.88)", 12, "middle", "marker-label milestone-name milestone-expected-label"));
    milestoneGroup.appendChild(labelTextNode(formatShortDate(milestone.expected), x + 12, baselineY - 9, "var(--muted)", 10, "start", "marker-date date-text milestone-date milestone-expected"));

    const lowerAnchor = {
      y: baselineY + 15,
      fill: markerColor,
      label: milestone.acked_at ? formatShortDate(milestone.acked_at) : "Pending",
      tooltip: [milestone.acked_at ? formatDate(milestone.acked_at) : "Pending"],
      className: milestone.acked_at
        ? (isLateAck ? "overdue-marker" : "ack-marker")
        : "pending-marker",
    };

    if (shouldRenderAckMarker) {
      const lowerIcon = svgNode("polygon", {
        points: `${x},${lowerAnchor.y - 12} ${x - 7},${lowerAnchor.y} ${x + 7},${lowerAnchor.y}`,
        fill: lowerAnchor.fill,
        class: lowerAnchor.className,
        cursor: "pointer",
      });
      lowerIcon.appendChild(svgTitle(lowerAnchor.tooltip));
      lowerIcon.setAttribute("tabindex", "0");
      lowerIcon.setAttribute("role", "button");
      lowerIcon.setAttribute("aria-label", `${milestone.name} acknowledgement`);
      lowerIcon.addEventListener("click", () => openAckDialog(release.id, milestone.id));
      lowerIcon.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openAckDialog(release.id, milestone.id);
        }
      });
      milestoneGroup.appendChild(lowerIcon);
    }

    const hitArea = svgNode("rect", {
      x: String(x - 20),
      y: String(baselineY - 22),
      width: "40",
      height: "44",
      fill: "transparent",
      cursor: isMilestoneDragEnabled(release.id) ? "grab" : "default",
    });
    if (isMilestoneDragEnabled(release.id)) {
      hitArea.addEventListener("pointerdown", (event) => startMilestoneDrag(event, release.id, milestone.id, milestone.name, release.product, release.version, dateForX));
    } else {
      hitArea.setAttribute("pointer-events", "none");
    }
    milestoneGroup.appendChild(hitArea);

    if (shouldRenderAckMarker) {
      milestoneGroup.appendChild(labelTextNode(
        lowerAnchor.label,
        x + 12,
        baselineY + 9,
        lowerAnchor.fill,
        10,
        "start",
        "marker-date owner-text milestone-date milestone-ackdate",
      ));
    }
    svg.appendChild(milestoneGroup);
  });

  renderStarlightTrail(svg, starlightEvents, xForDate, clampX, detailCard);
}

function getMeaningfulStarlightEvents(release) {
  const events = Array.isArray(release.starlight_trail) ? release.starlight_trail : [];
  return events
    .filter((event) => event && event.date)
    .sort((left, right) => dateishTime(left.date) - dateishTime(right.date))
    .filter((event, index, source) => index === 0 || event.starlight !== source[index - 1].starlight);
}

function renderStarlightTrail(svg, events, xForDate, clampX, detailCard) {
  if (!events.length) {
    return;
  }

  const points = events.map((event) => {
    const x = clampX(xForDate(event.date));
    const y = starlightToY(event.starlight);
    return { event, x, y };
  });
  const path = buildStarlightPath(points);

  const curve = svgNode("path", {
    d: path,
    class: "starlight-curve-glow",
    fill: "none",
    stroke: "rgba(239, 219, 174, 0.22)",
    "stroke-width": "7.2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: "0.78",
    style: "filter: blur(1.8px);",
  });
  svg.appendChild(curve);

  const coreCurve = svgNode("path", {
    d: path,
    class: "starlight-curve",
    fill: "none",
    stroke: "rgba(214, 182, 112, 0.56)",
    "stroke-width": "1.24",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    opacity: "0.92",
    style: "filter: none;",
  });
  svg.appendChild(coreCurve);

  points.forEach(({ event, x, y }, index) => {
    const starPoint = buildStarlightPoint(event, x, y, index);
    const direction = getStarlightDirection(points, index);
    const marker = svgNode("g", { class: "starlight-event", cursor: "help" });
    marker.setAttribute("tabindex", "0");
    marker.setAttribute("role", "button");
    marker.setAttribute("aria-label", `Starlight ${event.starlight} on ${formatDate(event.date)}`);

    const haloLayer = svgNode("g", {
      class: "starlight-halo-layer",
      transform: `translate(${starPoint.x} ${starPoint.y})`,
      style: `animation-delay:${starPoint.twinkleDelay}s; --halo-duration:${starPoint.haloDuration}s;`,
    });
    haloLayer.appendChild(svgNode("circle", {
      cx: "0",
      cy: "0",
      r: "8.8",
      class: "starlight-glow",
      fill: "rgba(239, 214, 159, 0.16)",
      style: `animation-delay:${starPoint.twinkleDelay}s; --halo-duration:${starPoint.haloDuration}s;`,
    }));
    haloLayer.appendChild(svgNode("path", {
      d: createIrregularStarPath(starPoint.points, 10.2, 4.4, 0.12, starPoint.seed + 211),
      fill: "rgba(247, 229, 190, 0.07)",
      stroke: "none",
      opacity: "0.8",
    }));
    marker.appendChild(haloLayer);

    const tailLayer = svgNode("g", {
      class: "starlight-tail-layer",
      transform: `translate(${starPoint.x} ${starPoint.y}) rotate(${direction})`,
      "aria-hidden": "true",
    });
    tailLayer.appendChild(svgNode("path", {
      d: buildStarlightTailPath(index === points.length - 1 ? 26 : 18),
      class: "starlight-tail",
    }));
    marker.appendChild(tailLayer);

    const twinkleLayer = svgNode("g", {
      class: "starlight-star starlight-twinkle-layer",
      transform: `translate(${starPoint.x} ${starPoint.y}) rotate(${starPoint.rotation}) scale(${starPoint.scale})`,
      style: `opacity:${starPoint.opacity}; animation-delay:${starPoint.twinkleDelay}s; --twinkle-duration:${starPoint.twinkleDuration}s;`,
    });
    twinkleLayer.appendChild(svgNode("path", {
      d: createIrregularStarPath(starPoint.points, 7.8, 3.1, 0.18, starPoint.seed),
      fill: "rgba(240, 210, 141, 0.84)",
      stroke: "rgba(255, 244, 219, 0.56)",
      "stroke-width": "0.5",
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));
    twinkleLayer.appendChild(svgNode("path", {
      d: createIrregularStarPath(starPoint.points, 4.2, 1.7, 0.14, starPoint.seed + 101),
      fill: "rgba(255, 249, 236, 0.94)",
      stroke: "none",
    }));
    twinkleLayer.appendChild(svgNode("circle", {
      cx: "0",
      cy: "0",
      r: "0.95",
      fill: "rgba(255, 251, 243, 0.95)",
      opacity: "0.82",
    }));
    marker.appendChild(twinkleLayer);

    const label = textNode(String(event.starlight), starPoint.x + 12, starPoint.y - 8, "rgba(130, 107, 69, 0.7)", 10, "start", "starlight-label-text");
    marker.appendChild(label);
    bindStarlightDetail(marker, svg, detailCard, starPoint, event);
    svg.appendChild(marker);
  });
}

function buildStarlightPath(points) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    const anchor = points[0];
    return `M ${(anchor.x - 10).toFixed(2)} ${anchor.y.toFixed(2)} L ${(anchor.x + 10).toFixed(2)} ${anchor.y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const beforePrevious = points[index - 2] || previous;
    const afterCurrent = points[index + 1] || current;
    const spanStartX = Math.min(previous.x, current.x);
    const spanEndX = Math.max(previous.x, current.x);
    const controlOneX = Math.min(Math.max(previous.x + ((current.x - beforePrevious.x) / 6), spanStartX), spanEndX);
    const controlOneY = previous.y + ((current.y - beforePrevious.y) / 6);
    const controlTwoX = Math.min(Math.max(current.x - ((afterCurrent.x - previous.x) / 6), spanStartX), spanEndX);
    const controlTwoY = current.y - ((afterCurrent.y - previous.y) / 6);
    d += ` C ${controlOneX.toFixed(2)} ${controlOneY.toFixed(2)}, ${controlTwoX.toFixed(2)} ${controlTwoY.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }
  return d;
}

function buildStarlightPoint(event, x, y, index) {
  const seedSource = `${event.date}:${event.starlight}:${index}:${event.whisper}`;
  const seed = hashString(seedSource);
  const pick = (offset) => seededUnit(seed + offset);
  const rawPoints = [4, 5, 6][Math.floor(pick(11) * 3)] || 5;
  return {
    x,
    y,
    value: event.starlight,
    points: rawPoints,
    rotation: -16 + (pick(23) * 32),
    scale: 0.88 + (pick(37) * 0.28),
    opacity: 0.58 + (pick(41) * 0.22),
    twinkleDelay: Number((pick(53) * 8).toFixed(2)),
    twinkleDuration: Number((8.4 + (pick(59) * 5.2)).toFixed(2)),
    haloDuration: Number((11.6 + (pick(67) * 6.4)).toFixed(2)),
    seed,
  };
}

function getStarlightDirection(points, index) {
  const previous = points[index - 1] || points[index];
  const next = points[index + 1] || points[index];
  const deltaX = next.x - previous.x;
  const deltaY = next.y - previous.y;
  return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
}

function buildStarlightTailPath(length) {
  return `M 0 0 C ${(-length * 0.28).toFixed(2)} ${(-1.8).toFixed(2)}, ${(-length * 0.72).toFixed(2)} ${(1.6).toFixed(2)}, ${(-length).toFixed(2)} 0`;
}

function bindStarlightDetail(marker, svg, detailCard, point, event) {
  if (!detailCard) {
    return;
  }

  if (!detailCard.dataset.hoverBound) {
    detailCard.dataset.hoverBound = "true";
    detailCard.addEventListener("mouseenter", () => {
      detailCard.dataset.hovering = "true";
      window.clearTimeout(detailCard._hideTimer);
      window.clearTimeout(detailCard._fadeTimer);
      detailCard.classList.remove("hidden");
      detailCard.classList.add("is-revealed");
    });
    detailCard.addEventListener("mouseleave", () => {
      detailCard.dataset.hovering = "false";
      hideStarlightDetail(detailCard);
    });
  }

  const show = () => showStarlightDetail(detailCard, svg, point, event);
  const hide = () => {
    detailCard.dataset.markerHover = "false";
    hideStarlightDetail(detailCard);
  };

  marker.addEventListener("mouseenter", () => {
    detailCard.dataset.markerHover = "true";
    show();
  });
  marker.addEventListener("focus", show);
  marker.addEventListener("mouseleave", hide);
  marker.addEventListener("blur", hide);
}

function showStarlightDetail(detailCard, svg, point, event) {
  const body = detailCard.querySelector(".starlight-detail-body");
  const stats = detailCard.querySelector(".starlight-detail-stats");
  detailCard.querySelector(".starlight-detail-value").textContent = `✦ ${event.starlight} ${describeStarlightState(event.starlight)}`;
  detailCard.querySelector(".starlight-detail-date").textContent = formatDate(event.date);
  detailCard.querySelector(".starlight-detail-whisper").textContent = event.whisper;
  renderBoaNote(body, event.detail?.content || "", { emptyFallback: "No night log recorded." });

  if (event.metrics) {
    detailCard.querySelector(".starlight-detail-done").textContent = String(event.metrics.done);
    detailCard.querySelector(".starlight-detail-total").textContent = String(event.metrics.total);
    detailCard.querySelector(".starlight-detail-blocked").textContent = String(event.metrics.blocked);
    stats.classList.remove("hidden");
  } else {
    stats.classList.add("hidden");
  }

  detailCard.dataset.hovering = detailCard.dataset.hovering || "false";
  detailCard.classList.remove("hidden");
  detailCard.classList.remove("is-revealed");
  window.clearTimeout(detailCard._hideTimer);
  window.clearTimeout(detailCard._fadeTimer);
  positionStoryCard(detailCard, svg, point, { verticalGap: 22, preferred: "above" });
  window.requestAnimationFrame(() => {
    detailCard.classList.add("is-revealed");
  });
}

function hideStarlightDetail(detailCard) {
  if (detailCard.dataset.hovering === "true" || detailCard.dataset.markerHover === "true") {
    return;
  }
  window.clearTimeout(detailCard._hideTimer);
  window.clearTimeout(detailCard._fadeTimer);
  detailCard._fadeTimer = window.setTimeout(() => {
    if (detailCard.dataset.hovering === "true" || detailCard.dataset.markerHover === "true") {
      return;
    }
    detailCard.classList.remove("is-revealed");
    detailCard._hideTimer = window.setTimeout(() => {
      if (detailCard.dataset.hovering === "true" || detailCard.dataset.markerHover === "true") {
        return;
      }
      detailCard.classList.add("hidden");
    }, 1080);
  }, 220);
}

function initializeMilestoneNoteCard(card) {
  if (!card || card.dataset.ready === "true") {
    return;
  }
  card.dataset.ready = "true";
  card.dataset.hovering = "false";
  card.dataset.markerHover = "false";
  card.addEventListener("mouseenter", () => {
    card.dataset.hovering = "true";
    card.classList.remove("hidden");
    card.classList.add("is-revealed");
  });
  card.addEventListener("mouseleave", () => {
    card.dataset.hovering = "false";
    hideMilestoneNoteCard(card);
  });
}

function positionStoryCard(card, svg, point, { verticalGap = 18, preferred = "above" } = {}) {
  const track = svg.closest(".release-track");
  if (!track) {
    return;
  }
  const box = svg.viewBox.baseVal;
  const trackRect = track.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();
  const ratioX = point.x / Math.max(box.width, 1);
  const ratioY = point.y / Math.max(box.height, 1);
  const pointLeft = (svgRect.left - trackRect.left) + (ratioX * svgRect.width);
  const pointTop = (svgRect.top - trackRect.top) + (ratioY * svgRect.height);
  const cardWidth = card.offsetWidth || 280;
  const cardHeight = card.offsetHeight || 180;
  const minLeft = 14;
  const maxLeft = Math.max(minLeft, trackRect.width - cardWidth - 14);
  const left = Math.min(Math.max(pointLeft - (cardWidth / 2), minLeft), maxLeft);
  const aboveTop = pointTop - cardHeight - verticalGap;
  const belowTop = pointTop + verticalGap;
  const maxTop = Math.max(14, trackRect.height - cardHeight - 14);
  const top = preferred === "above"
    ? (aboveTop >= 14 ? aboveTop : Math.min(belowTop, maxTop))
    : Math.min(Math.max(belowTop, 14), maxTop);
  card.style.left = `${left}px`;
  card.style.top = `${Math.min(Math.max(top, 14), maxTop)}px`;
}

function showMilestoneNoteCard(card, svg, point, milestone) {
  if (!card) {
    return;
  }
  initializeMilestoneNoteCard(card);
  card.querySelector(".milestone-note-title").textContent = milestone.name;
  card.querySelector(".milestone-note-date").textContent = formatDate(milestone.expected);
  const noteBody = card.querySelector(".milestone-note-body");
  renderBoaNote(noteBody, getBoaNoteContent(milestone.note));
  noteBody.classList.toggle("hidden", !hasBoaNote(milestone.note));

  const ackShell = card.querySelector(".milestone-ack-shell");
  if (hasBoaNote(milestone.ack_note)) {
    ackShell.classList.remove("hidden");
    card.querySelector(".milestone-ack-meta").textContent = milestone.acked_at
      ? `Acked by ${milestone.ack_name || "unknown"} on ${formatDateTime(milestone.acked_at)}`
      : `Acked by ${milestone.ack_name || "unknown"}`;
    renderBoaNote(card.querySelector(".milestone-ack-body"), getBoaNoteContent(milestone.ack_note));
  } else {
    ackShell.classList.add("hidden");
    card.querySelector(".milestone-ack-meta").textContent = "";
    card.querySelector(".milestone-ack-body").replaceChildren();
  }

  card.classList.remove("hidden");
  card.classList.remove("is-revealed");
  window.clearTimeout(card._hideTimer);
  window.clearTimeout(card._fadeTimer);
  positionStoryCard(card, svg, point, { verticalGap: 18, preferred: "above" });
  window.requestAnimationFrame(() => {
    card.classList.add("is-revealed");
  });
}

function hideMilestoneNoteCard(card) {
  if (!card || card.dataset.hovering === "true" || card.dataset.markerHover === "true") {
    return;
  }
  window.clearTimeout(card._hideTimer);
  window.clearTimeout(card._fadeTimer);
  card._fadeTimer = window.setTimeout(() => {
    if (card.dataset.hovering === "true" || card.dataset.markerHover === "true") {
      return;
    }
    card.classList.remove("is-revealed");
    card._hideTimer = window.setTimeout(() => {
      if (card.dataset.hovering === "true" || card.dataset.markerHover === "true") {
        return;
      }
      card.classList.add("hidden");
    }, 300);
  }, 120);
}

function bindMilestoneNoteTrigger(target, card, svg, point, milestone) {
  if (!target || !card) {
    return;
  }
  const show = () => {
    card.dataset.markerHover = "true";
    showMilestoneNoteCard(card, svg, point, milestone);
  };
  const hide = () => {
    card.dataset.markerHover = "false";
    hideMilestoneNoteCard(card);
  };
  target.addEventListener("mouseenter", show);
  target.addEventListener("focus", show);
  target.addEventListener("mouseleave", hide);
  target.addEventListener("blur", hide);
  target.addEventListener("click", (event) => {
    event.stopPropagation();
    show();
  });
}

function composeStarlightTitleLines(event) {
  const lines = [`Starlight ${event.starlight}`, event.whisper];
  const metricBits = summarizeStarlightMetrics(event.metrics);
  if (metricBits) {
    lines.push(metricBits);
  }
  return lines;
}

function summarizeStarlightMetrics(metrics) {
  if (!metrics) {
    return "";
  }
  return `Done ${metrics.done} / Total ${metrics.total} / Blocked ${metrics.blocked}`;
}

function renderBoaNote(container, markdown, { emptyFallback = "" } = {}) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const blocks = safeMarkdownToBlocks(markdown);
  if (!blocks.length) {
    if (emptyFallback) {
      const paragraph = document.createElement("p");
      paragraph.textContent = emptyFallback;
      container.appendChild(paragraph);
    }
    return;
  }
  blocks.forEach((block) => {
    if (block.type === "heading") {
      const heading = document.createElement(block.level <= 2 ? "h2" : "h3");
      appendInlineMarkdown(heading, block.text);
      container.appendChild(heading);
      return;
    }
    if (block.type === "list") {
      const list = document.createElement(block.ordered ? "ol" : "ul");
      block.items.forEach((item) => {
        const li = document.createElement("li");
        if (item.checked !== undefined) {
          const checkbox = document.createElement("span");
          checkbox.className = "boa-note-checkbox";
          checkbox.textContent = item.checked ? "☑" : "☐";
          li.appendChild(checkbox);
          li.appendChild(document.createTextNode(" "));
          appendInlineMarkdown(li, item.text);
        } else {
          appendInlineMarkdown(li, item.text || item);
        }
        list.appendChild(li);
      });
      container.appendChild(list);
      return;
    }
    if (block.type === "code") {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = block.text;
      pre.appendChild(code);
      container.appendChild(pre);
      return;
    }
    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, block.text);
    container.appendChild(paragraph);
  });
}

function safeMarkdownToBlocks(markdown) {
  const source = String(markdown || "").replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  const blocks = [];
  let paragraph = [];
  let list = [];
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) {
      return;
    }
    blocks.push({ type: "list", items: list.slice(), ordered: Boolean(list.ordered) });
    list = [];
  };
  const flushCode = () => {
    if (!codeLines.length) {
      return;
    }
    blocks.push({ type: "code", text: codeLines.join("\n") });
    codeLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
      return;
    }
    const checkboxMatch = trimmed.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (checkboxMatch) {
      flushParagraph();
      list.push({ checked: checkboxMatch[1].toLowerCase() === "x", text: checkboxMatch[2].trim() });
      return;
    }
    const unorderedListMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedListMatch) {
      flushParagraph();
      list.push({ text: unorderedListMatch[1].trim() });
      return;
    }
    const orderedListMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedListMatch) {
      flushParagraph();
      if (list.length && !list.ordered) {
        flushList();
      }
      list.ordered = true;
      list.push({ text: orderedListMatch[1].trim() });
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  flushCode();
  return blocks.filter((block) => {
    if (block.type === "list") {
      return block.items.length > 0;
    }
    return Boolean(block.text);
  });
}

function appendInlineMarkdown(node, text) {
  const source = String(text || "");
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(source))) {
    if (match.index > lastIndex) {
      node.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
    }
    if (match[1] && match[2]) {
      const anchor = document.createElement("a");
      anchor.href = match[2];
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = match[1];
      node.appendChild(anchor);
    } else if (match[3]) {
      const code = document.createElement("code");
      code.textContent = match[3];
      node.appendChild(code);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < source.length) {
    node.appendChild(document.createTextNode(source.slice(lastIndex)));
  }
}

function createIrregularStarPath(points, outerRadius, innerRadius, irregularity = 0.18, seed = 0) {
  const total = points * 2;
  const coords = [];

  for (let index = 0; index < total; index += 1) {
    const angle = ((Math.PI * 2 * index) / total) - (Math.PI / 2);
    const baseRadius = index % 2 === 0 ? outerRadius : innerRadius;
    const jitter = 1 + ((seededUnit(seed + (index * 17)) * 2) - 1) * irregularity;
    const radius = baseRadius * jitter;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    coords.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `${coords.join(" ")} Z`;
}

function seededUnit(seed) {
  const value = Math.sin((seed + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function startMilestoneDrag(event, releaseId, milestoneId, milestoneName, product, version, dateForX) {
  event.preventDefault();
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) {
    return;
  }

  const dragState = {
    releaseId,
    milestoneId,
    milestoneName,
    product,
    version,
    svg,
    dateForX,
    x: 0,
    overlay: ensureDragOverlay(svg),
    bounds: svg.getBoundingClientRect(),
  };
  state.drag = dragState;
  updateMilestoneDrag(event.clientX);
}

function ensureDragOverlay(svg) {
  let overlay = svg.querySelector(".drag-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    return overlay;
  }

  overlay = svgNode("g", { class: "drag-overlay" });
  const line = svgNode("line", {
    x1: "0",
    x2: "0",
    y1: "16",
    y2: String(RELEASE_VIEWBOX.baselineY),
    stroke: "rgba(172, 79, 67, 0.78)",
    "stroke-width": "1.2",
    "stroke-dasharray": "3 6",
  });
  const marker = svgNode("circle", {
    cx: "0",
    cy: String(RELEASE_VIEWBOX.baselineY),
    r: "6",
    fill: "rgba(172, 79, 67, 0.88)",
    stroke: "rgba(251, 248, 241, 0.98)",
    "stroke-width": "1.2",
  });
  const label = svgNode("text", {
    x: "0",
    y: "12",
    fill: "rgba(172, 79, 67, 0.92)",
    "font-size": "12",
    "font-family": '"IBM Plex Serif", "Source Serif 4", "Iowan Old Style", serif',
    "text-anchor": "middle",
  });
  label.textContent = "Dragging";
  overlay.append(line, marker, label);
  svg.appendChild(overlay);
  return overlay;
}

function updateMilestoneDrag(clientX) {
  if (!state.drag) {
    return;
  }

  const { bounds, dateForX, overlay } = state.drag;
  const x = clientX - bounds.left;
  const clamped = Math.min(Math.max(x, 42), bounds.width - 38);
  const projectedDate = dateForX(clamped);
  state.drag.x = clamped;

  const line = overlay.querySelector("line");
  const marker = overlay.querySelector("circle");
  const label = overlay.querySelector("text");
  if (line) {
    line.setAttribute("x1", String(clamped));
    line.setAttribute("x2", String(clamped));
  }
  if (marker) {
    marker.setAttribute("cx", String(clamped));
  }
  if (label) {
    label.setAttribute("x", String(clamped));
    label.textContent = formatShortDate(projectedDate);
  }
}

async function finishMilestoneDrag() {
  if (!state.drag) {
    return;
  }

  const drag = state.drag;
  state.drag = null;
  const finalDate = drag.dateForX(drag.x || 42);
  drag.overlay.classList.add("hidden");

  const release = state.releases.find((item) => item.id === drag.releaseId);
  if (!release) {
    return;
  }
  const milestone = release.milestones.find((item) => item.id === drag.milestoneId);
  if (!milestone) {
    return;
  }

  setStatus("Moving milestone");
  try {
    await request(`/api/milestones/${drag.milestoneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: milestone.name,
        expected: formatCalendarDate(finalDate),
        owner: milestone.owner,
      }),
    });
    await loadTimeline();
    setStatus("Milestone moved");
  } catch (error) {
    console.error(error);
    setStatus("Move failed");
    elements.editMessage.textContent = error.message;
  }
}

function buildWaveLinePath(snapshots, xForDate, baselineY, leftEdge, rightEdge, metrics = buildBugWaveMetrics(snapshots, baselineY)) {
  if (!snapshots.length) {
    return `M ${leftEdge} ${baselineY} L ${rightEdge} ${baselineY}`;
  }

  const points = snapshots.map((snapshot, index) => {
    const x = xForDate(snapshot.observed_at);
    const y = wavePointY(snapshot, metrics, index, baselineY);
    return [x, y];
  });

  return smoothPath(points);
}

function buildTimelineSpinePath(leftEdge, rightEdge, baselineY) {
  const width = Math.max(rightEdge - leftEdge, 120);
  const quarter = width * 0.25;
  const half = width * 0.5;
  const threeQuarter = width * 0.75;
  return [
    `M${leftEdge} ${baselineY}`,
    `C${leftEdge + quarter * 0.72} ${baselineY - 1}, ${leftEdge + half * 0.64} ${baselineY + 1}, ${leftEdge + half} ${baselineY}`,
    `C${leftEdge + half + quarter * 0.72} ${baselineY - 1}, ${leftEdge + threeQuarter + quarter * 0.2} ${baselineY + 1}, ${rightEdge} ${baselineY}`,
  ].join(" ");
}

function buildWaveAreaPath(snapshots, xForDate, baselineY, leftEdge, rightEdge, metrics = buildBugWaveMetrics(snapshots, baselineY)) {
  if (!snapshots.length) {
    return `M ${leftEdge} ${baselineY} L ${rightEdge} ${baselineY}`;
  }

  const points = snapshots.map((snapshot, index) => {
    const x = xForDate(snapshot.observed_at);
    const y = wavePointY(snapshot, metrics, index, baselineY);
    return [x, y];
  });

  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last[0]} ${baselineY} L ${first[0]} ${baselineY} Z`;
}

function getReleaseExtent(release, observedBugSnapshots, timeline) {
  const oneDay = 24 * 60 * 60 * 1000;
  const releaseTimes = [
    ...release.milestones.map((item) => dateishTime(item.expected)),
    ...observedBugSnapshots.map((item) => dateishTime(item.observed_at)),
  ];
  const minTime = releaseTimes.length ? Math.min(...releaseTimes) : timeline.todayTime - 14 * oneDay;
  const maxTime = releaseTimes.length ? Math.max(...releaseTimes) : timeline.todayTime + 14 * oneDay;
  return {
    startTime: minTime - 12 * oneDay,
    endTime: maxTime + 12 * oneDay,
  };
}

function getStarlightSkyBounds() {
  return {
    top: 20,
    bottom: RELEASE_VIEWBOX.baselineY - 44,
  };
}

function starlightToY(starlight, bounds = getStarlightSkyBounds()) {
  const readiness = Math.min(Math.max(Number(starlight) || 0, 0), 100) / 100;
  const range = Math.max(bounds.bottom - bounds.top, 1);
  const skyLift = Math.pow(readiness, 1.28);
  return bounds.bottom - (skyLift * range);
}

function getBugRisk(snapshot) {
  return Math.max(Number(snapshot?.open_bug_count) || 0, 0);
}

function smoothRiskSeries(risks, windowSize = STARLIGHT_VISUAL_CONFIG.bugWaveSmoothingWindow) {
  const size = Math.max(Math.floor(windowSize || 0), 1);
  if (size <= 1 || risks.length <= 2) {
    return risks.slice();
  }
  const radius = Math.floor(size / 2);
  return risks.map((_risk, index) => {
    let total = 0;
    let count = 0;
    for (let cursor = Math.max(0, index - radius); cursor <= Math.min(risks.length - 1, index + radius); cursor += 1) {
      total += risks[cursor];
      count += 1;
    }
    return count ? total / count : risks[index];
  });
}

function computePeakRisk(risks, config = STARLIGHT_VISUAL_CONFIG) {
  const fallback = Math.max(Number(config.bugWaveFallbackPeakRisk) || 1, 1);
  if (!risks.length) {
    return fallback;
  }
  const peak = Math.max(...risks, 0);
  return peak > 0 ? peak : fallback;
}

function getBugWaveEffectiveMaxRatio(peakRisk, config = STARLIGHT_VISUAL_CONFIG) {
  if (peakRisk > 0 && peakRisk < config.bugWaveLowRiskThreshold) {
    return Math.min(Math.max(config.bugWaveLowRiskMaxHeightRatio, 0), 1);
  }
  return config.bugWaveMaxHeightRatio;
}

function normalizeBugWaveHeight(risk, peakRisk, config = STARLIGHT_VISUAL_CONFIG) {
  if (peakRisk <= 0) {
    return 0;
  }
  const effectiveMaxRatio = getBugWaveEffectiveMaxRatio(peakRisk, config);
  let normalizedRisk = Math.min(Math.max(risk / peakRisk, 0), 1);
  if (risk > 0) {
    normalizedRisk = Math.max(normalizedRisk, config.bugWaveMinHeightRatio);
  }
  return Math.min(Math.max(normalizedRisk * effectiveMaxRatio, 0), effectiveMaxRatio);
}

function buildBugWaveMetrics(snapshots, baselineY, config = STARLIGHT_VISUAL_CONFIG) {
  // The wave apex maps to a starlight readiness height so sea and sky share one story scale.
  const apexY = starlightToY(config.bugWaveApexStarlight);
  const apexHeight = Math.max(baselineY - apexY, 1);
  const rawRisks = snapshots.map(getBugRisk);
  const smoothedRisks = smoothRiskSeries(rawRisks, config.bugWaveSmoothingWindow);
  const releasePeakRisk = computePeakRisk(rawRisks, config);
  const peaks = config.bugWaveUseRollingPeak
    ? rawRisks.map((_risk, index) => computePeakRisk(rawRisks.slice(0, index + 1), config))
    : smoothedRisks.map(() => releasePeakRisk);
  const effectiveMaxRatio = getBugWaveEffectiveMaxRatio(releasePeakRisk, config);
  const normalizedRisks = smoothedRisks.map((risk, index) => normalizeBugWaveHeight(risk, peaks[index], config));
  const maxNormalizedRisk = normalizedRisks.length ? Math.max(...normalizedRisks, 0) : 0;
  const peakPointY = baselineY - (maxNormalizedRisk * apexHeight);

  return {
    apexY,
    apexHeight,
    rawRisks,
    smoothedRisks,
    releasePeakRisk,
    peaks,
    effectiveMaxRatio,
    normalizedRisks,
    maxNormalizedRisk,
    peakPointY,
  };
}

function wavePointY(snapshot, metrics, index, baselineY = RELEASE_VIEWBOX.baselineY) {
  const pointIndex = Number.isFinite(index) && index >= 0 ? index : 0;
  const normalized = metrics.normalizedRisks[pointIndex] || 0;
  return baselineY - (normalized * metrics.apexHeight);
}

function inspectBugWaveSeries(risks, baselineY = RELEASE_VIEWBOX.baselineY, config = STARLIGHT_VISUAL_CONFIG) {
  const snapshots = risks.map((risk, index) => ({
    open_bug_count: risk,
    observed_at: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));
  const metrics = buildBugWaveMetrics(snapshots, baselineY, config);
  return {
    config,
    baselineY,
    starlight75Y: starlightToY(config.bugWaveApexStarlight),
    apexY: metrics.apexY,
    sameSkyCoordinateSystem: metrics.apexY === starlightToY(config.bugWaveApexStarlight),
    yAxisDirection: "smaller-y-is-higher",
    releasePeakRisk: metrics.releasePeakRisk,
    effectiveMaxRatio: metrics.effectiveMaxRatio,
    maxNormalizedRisk: metrics.maxNormalizedRisk,
    peakPointY: metrics.peakPointY,
    points: snapshots.map((snapshot, index) => ({
      risk: risks[index],
      smoothedRisk: metrics.smoothedRisks[index],
      peakRisk: metrics.peaks[index],
      normalizedRisk: metrics.normalizedRisks[index],
      y: wavePointY(snapshot, metrics, index, baselineY),
    })),
  };
}

function inspectBugWaveFixtures() {
  return Object.fromEntries(
    Object.entries(BUG_WAVE_MANUAL_FIXTURES).map(([name, risks]) => [name, inspectBugWaveSeries(risks)]),
  );
}

function getReleasePalette(release, fallbackIndex = 0) {
  const palettes = [
    { stroke: "#5d8cd6", soft: "#d8e3f5", label: "#31445f", shadowRgb: "93, 140, 214", strokeRgb: "93, 140, 214", softRgb: "216, 227, 245" },
    { stroke: "#9a79cf", soft: "#eadff7", label: "#54416f", shadowRgb: "154, 121, 207", strokeRgb: "154, 121, 207", softRgb: "234, 223, 247" },
    { stroke: "#ee9845", soft: "#f9ead6", label: "#74502b", shadowRgb: "238, 152, 69", strokeRgb: "238, 152, 69", softRgb: "249, 234, 214" },
    { stroke: "#73a596", soft: "#d7ebe4", label: "#35544c", shadowRgb: "115, 165, 150", strokeRgb: "115, 165, 150", softRgb: "215, 235, 228" },
    { stroke: "#d07e72", soft: "#f5dfdb", label: "#6a443d", shadowRgb: "208, 126, 114", strokeRgb: "208, 126, 114", softRgb: "245, 223, 219" },
  ];
  const seed = hashString(`${release.product}:${release.version}`);
  return palettes[(seed || fallbackIndex) % palettes.length];
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeObservedBugSnapshots(snapshots) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayTime = today.getTime();

  return [...snapshots]
    .map((snapshot) => ({
      ...snapshot,
      observed_at: snapshot.observed_at || snapshot.date,
      signal_type: snapshot.signal_type || "total",
      quality: snapshot.quality || "normal",
    }))
    .filter((snapshot) => snapshot.signal_type === "total")
    .filter((snapshot) => snapshot.quality === "normal")
    .filter((snapshot) => dateishTime(snapshot.observed_at) <= todayTime)
    .sort((left, right) => dateishTime(left.observed_at) - dateishTime(right.observed_at));
}

function smoothPath(points) {
  if (points.length === 1) {
    return `M ${points[0][0]} ${points[0][1]}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length; index += 1) {
    const [prevX, prevY] = points[index - 1];
    const [x, y] = points[index];
    const controlX = (prevX + x) / 2;
    d += ` C ${controlX} ${prevY}, ${controlX} ${y}, ${x} ${y}`;
  }
  return d;
}

function svgNode(name, attributes = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
  return node;
}

function textNode(text, x, y, fill, size, anchor, className = "") {
  const node = svgNode("text", {
    x: String(x),
    y: String(y),
    fill,
    "font-size": String(size),
    "font-family": '"Libre Baskerville", "Iowan Old Style", "Georgia", serif',
    "text-anchor": anchor,
  });
  if (className) {
    node.setAttribute("class", className);
  }
  node.textContent = text;
  return node;
}

function labelTextNode(text, x, y, fill, size, anchor, className = "") {
  const node = textNode(text, x, y, fill, size, anchor, className);
  node.setAttribute("dominant-baseline", "middle");
  return node;
}

function svgTitle(lines) {
  const title = svgNode("title");
  title.textContent = lines.join("\n");
  return title;
}

function setStatus(text) {
  elements.statusPill.textContent = text;
}

function createJourneyMilestone(name, expected, owner = "", email = "", type = "custom", note = "", sourceId = null) {
  return {
    id: `journey-${Math.random().toString(36).slice(2, 10)}`,
    sourceId,
    name,
    expected,
    owner,
    email,
    note,
    type,
  };
}

function createInitialJourneyDraft() {
  const kickoff = new Date();
  kickoff.setHours(12, 0, 0, 0);
  const ga = new Date(kickoff);
  ga.setDate(ga.getDate() + 90);

  return {
    mode: "create",
    releaseId: null,
    expectedSecret: "",
    product: "",
    version: "",
    secret: "",
    milestones: [
      createJourneyMilestone("Kickoff", kickoff, "pm", "", "kickoff"),
      createJourneyMilestone("GA Release", ga, "manager", "", "ga"),
    ],
    activeMilestoneId: null,
    selectedMilestoneIds: [],
    dragMilestoneId: null,
    dragCandidateMilestoneId: null,
    dragStartX: null,
    dragMoved: false,
    dragGroupSnapshot: null,
    pendingDragClientX: null,
    dragRenderFrame: null,
    selectionAnchor: null,
    selectionRect: null,
    selectionMoved: false,
  };
}

function createJourneyDraftFromRelease(release) {
  const draft = createInitialJourneyDraft();
  draft.mode = "edit";
  draft.releaseId = release.id;
  draft.expectedSecret = release.secret || "";
  draft.product = release.product;
  draft.version = release.version;
  draft.secret = "";
  draft.milestones = [...release.milestones]
    .sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected))
    .map((milestone) => createJourneyMilestone(
      milestone.name,
      new Date(milestone.expected),
      milestone.owner || "",
      milestone.email || "",
      milestone.name === "Kickoff" ? "kickoff" : milestone.name === "GA Release" ? "ga" : "custom",
      getBoaNoteContent(milestone.note),
      milestone.id,
    ));
  return draft;
}

function createJourneyDraftFromBlueprint(blueprint) {
  const draft = createInitialJourneyDraft();
  draft.product = blueprint.product || "";
  draft.version = blueprint.version || "";
  draft.secret = blueprint.secret || "";
  draft.milestones = [...(blueprint.milestones || [])]
    .sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected))
    .map((milestone, index, milestones) => createJourneyMilestone(
      milestone.name,
      new Date(`${milestone.expected}T12:00:00`),
      milestone.owner || "",
      milestone.email || "",
      milestone.name === "Kickoff"
        ? "kickoff"
        : milestone.name === "GA Release" || index === milestones.length - 1 ? "ga" : "custom",
      getBoaNoteContent(milestone.note),
      milestone.id || null,
    ));
  draft.activeMilestoneId = null;
  return draft;
}

function openJourneyDialog(release = null) {
  state.journeyDraft = release ? createJourneyDraftFromRelease(release) : createInitialJourneyDraft();
  showJourneyDialog();
}

function openJourneyDialogForMilestone(release, milestoneId, focusField = null) {
  if (!release || !milestoneId) {
    return;
  }
  const draft = createJourneyDraftFromRelease(release);
  if (draft.milestones.some((milestone) => milestone.id === milestoneId)) {
    draft.activeMilestoneId = milestoneId;
    draft.selectedMilestoneIds = [milestoneId];
  }
  openJourneyDialogFromDraft(draft);
  if (focusField === "keeper") {
    window.requestAnimationFrame(() => {
      elements.journeyMilestoneOwner.focus();
      elements.journeyMilestoneOwner.select();
    });
  }
}

function openJourneyDialogFromDraft(draft) {
  state.journeyDraft = draft;
  showJourneyDialog();
}

function showJourneyDialog() {
  syncJourneyForm();
  renderJourneyDraft();
  elements.journeyMessage.textContent = "";
  if (elements.journeyDialog.open) {
    return;
  }
  elements.journeyDialog.showModal();
}

function closeJourneyDialog() {
  if (elements.journeyDialog.open) {
    elements.journeyDialog.close();
  }
  state.journeyDraft = null;
}

function syncJourneyForm() {
  if (!state.journeyDraft) {
    return;
  }
  const isEditMode = state.journeyDraft.mode === "edit";
  elements.journeyKicker.textContent = isEditMode ? "Tend Journey" : "Begin a Journey";
  elements.journeyTitle.textContent = isEditMode ? "Tend the journey" : "Shape the journey";
  elements.journeyIntro.textContent = isEditMode
    ? "Adjust the points already resting on this horizon."
    : "Place the first points of this release on the horizon.";
  elements.journeyProduct.value = state.journeyDraft.product;
  elements.journeyVersion.value = state.journeyDraft.version;
  elements.journeySecret.value = state.journeyDraft.secret;
  elements.journeyProduct.disabled = isEditMode;
  elements.journeyVersion.disabled = isEditMode;
  elements.journeySecret.placeholder = isEditMode ? "Journey key to save" : "Journey key";
  elements.journeyCreateButton.textContent = isEditMode ? "Save Journey" : "Begin Journey";
  elements.journeyAddMilestone.classList.remove("hidden");
}

function getJourneyTimelineScale() {
  const milestones = state.journeyDraft?.milestones ?? [];
  const oneDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const times = milestones.map((item) => dateishTime(item.expected));
  const minTime = times.length ? Math.min(...times) : today.getTime();
  const maxTime = times.length ? Math.max(...times) : today.getTime() + (90 * oneDay);
  const isEditMode = state.journeyDraft?.mode === "edit";
  const shouldIncludePastMilestones = isEditMode || minTime < today.getTime();
  const startTime = shouldIncludePastMilestones ? (minTime - (10 * oneDay)) : today.getTime();
  const endTime = maxTime + (10 * oneDay);
  const range = Math.max(endTime - startTime, oneDay);
  const totalDays = Math.max(Math.round(range / oneDay), 1);
  const nowRatio = Math.min(Math.max((today.getTime() - startTime) / range, 0), 1);
  return {
    startTime,
    endTime,
    range,
    totalDays,
    nowRatio,
    todayTime: today.getTime(),
  };
}

function getJourneyActiveMilestone() {
  if (!state.journeyDraft?.activeMilestoneId) {
    return null;
  }
  return state.journeyDraft.milestones.find((item) => item.id === state.journeyDraft.activeMilestoneId) || null;
}

function renderJourneyPopover(anchorRatio = null) {
  const active = getJourneyActiveMilestone();
  const isDragging = Boolean(state.journeyDraft?.dragMilestoneId);
  const shell = elements.journeyTimeline?.closest(".journey-canvas-shell");
  shell?.classList.toggle("has-active-editor", Boolean(active && !isDragging));
  elements.journeyMilestonePopover.classList.toggle("hidden", !active || isDragging);
  if (!active) {
    elements.journeyMilestonePopover.style.left = "50%";
    elements.journeyMilestonePopover.style.transform = "translateX(-50%)";
    elements.journeyMilestonePopover.style.removeProperty("--journey-popover-arrow-x");
    elements.journeyMilestoneMenuPanel.classList.add("hidden");
    return;
  }
  const isEditMode = state.journeyDraft?.mode === "edit";
  elements.journeyMilestoneTitle.textContent = active.name;
  elements.journeyMilestoneName.value = active.name;
  elements.journeyMilestoneOwner.value = active.owner;
  elements.journeyMilestoneEmail.value = active.email || "";
  elements.journeyMilestoneNote.value = active.note || "";
  elements.journeyMilestoneDate.textContent = formatDate(active.expected);
  elements.journeyMilestoneName.disabled = false;
  elements.journeyMilestoneMenu.disabled = active.type !== "custom";
  if (active.type !== "custom") {
    elements.journeyMilestoneMenuPanel.classList.add("hidden");
  }

  if (anchorRatio !== null) {
    const shellWidth = shell?.clientWidth || 0;
    const popoverWidth = elements.journeyMilestonePopover.offsetWidth || 220;
    if (shellWidth) {
      const rawLeft = anchorRatio * shellWidth;
      const clampedLeft = Math.min(
        Math.max(rawLeft, (popoverWidth / 2) + 8),
        shellWidth - (popoverWidth / 2) - 8,
      );
      const arrowX = Math.min(
        Math.max(rawLeft - (clampedLeft - (popoverWidth / 2)), 34),
        popoverWidth - 34,
      );
      elements.journeyMilestonePopover.style.left = `${clampedLeft}px`;
      elements.journeyMilestonePopover.style.transform = "translateX(-50%)";
      elements.journeyMilestonePopover.style.setProperty("--journey-popover-arrow-x", `${arrowX}px`);
    }
  }
}

function closeJourneyMilestoneEditor() {
  if (!state.journeyDraft) {
    return;
  }
  state.journeyDraft.activeMilestoneId = null;
  renderJourneyPopover();
}

function clearJourneySelection() {
  if (!state.journeyDraft) {
    return;
  }
  state.journeyDraft.selectedMilestoneIds = [];
  state.journeyDraft.selectionAnchor = null;
  state.journeyDraft.selectionRect = null;
  state.journeyDraft.selectionMoved = false;
}

function getJourneySelectedMilestoneIds() {
  return state.journeyDraft?.selectedMilestoneIds ?? [];
}

function isJourneyMilestoneSelected(milestoneId) {
  return getJourneySelectedMilestoneIds().includes(milestoneId);
}

function getJourneySvgPoint(clientX, clientY) {
  const svg = elements.journeyTimeline;
  if (!svg) {
    return { x: 0, y: 0 };
  }
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const scaleX = viewBox.width / Math.max(rect.width, 1);
  const scaleY = viewBox.height / Math.max(rect.height, 1);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function getJourneyMilestoneSelectionBounds(milestone, labelX, x, nameY, dateY, baselineY, anchor = "middle") {
  const estimatedLabelWidth = Math.max(72, Math.min((milestone.name?.length || 0) * 7.4, 122));
  const left = anchor === "end"
    ? labelX - estimatedLabelWidth - 8
    : anchor === "start"
      ? labelX - 8
      : labelX - (estimatedLabelWidth / 2);
  const right = anchor === "end"
    ? labelX + 12
    : anchor === "start"
      ? labelX + estimatedLabelWidth + 12
      : labelX + (estimatedLabelWidth / 2) + 12;
  const top = Math.min(nameY - 16, dateY - 10, baselineY - 42);
  const bottom = baselineY + 16;
  return {
    left,
    right,
    top,
    bottom,
  };
}

function getJourneyDragSnapshot(milestoneId) {
  if (!state.journeyDraft) {
    return null;
  }
  const selectedIds = isJourneyMilestoneSelected(milestoneId) && getJourneySelectedMilestoneIds().length > 1
    ? [...getJourneySelectedMilestoneIds()]
    : [milestoneId];
  const milestones = [...state.journeyDraft.milestones]
    .sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected));
  const oneDay = 24 * 60 * 60 * 1000;
  const selectedSet = new Set(selectedIds);
  const baseTimes = Object.fromEntries(selectedIds.map((id) => {
    const milestone = milestones.find((item) => item.id === id);
    return [id, milestone ? dateishTime(milestone.expected) : 0];
  }));

  let minDeltaDays = Number.NEGATIVE_INFINITY;
  let maxDeltaDays = Number.POSITIVE_INFINITY;

  milestones.forEach((milestone, index) => {
    if (!selectedSet.has(milestone.id)) {
      return;
    }
    const baseTime = baseTimes[milestone.id];
    for (let prevIndex = index - 1; prevIndex >= 0; prevIndex -= 1) {
      const prev = milestones[prevIndex];
      if (selectedSet.has(prev.id)) {
        continue;
      }
      minDeltaDays = Math.max(minDeltaDays, Math.ceil(((dateishTime(prev.expected) + oneDay) - baseTime) / oneDay));
      break;
    }
    for (let nextIndex = index + 1; nextIndex < milestones.length; nextIndex += 1) {
      const next = milestones[nextIndex];
      if (selectedSet.has(next.id)) {
        continue;
      }
      maxDeltaDays = Math.min(maxDeltaDays, Math.floor(((dateishTime(next.expected) - oneDay) - baseTime) / oneDay));
      break;
    }
  });

  if (!Number.isFinite(minDeltaDays)) {
    minDeltaDays = -JOURNEY_INTERACTION_CONFIG.dragFallbackRangeDays;
  }
  if (!Number.isFinite(maxDeltaDays)) {
    maxDeltaDays = JOURNEY_INTERACTION_CONFIG.dragFallbackRangeDays;
  }

  return {
    selectedIds,
    baseTimes,
    anchorMilestoneId: milestoneId,
    anchorTime: baseTimes[milestoneId],
    minDeltaDays,
    maxDeltaDays,
  };
}

function renderJourneyDraft() {
  if (!state.journeyDraft || !elements.journeyTimeline) {
    return;
  }

  const svg = elements.journeyTimeline;
  svg.classList.toggle("is-dragging", Boolean(state.journeyDraft.dragMilestoneId && state.journeyDraft.dragMoved));
  svg.innerHTML = "";
  const timeline = getJourneyTimelineScale();
  const width = 1120;
  const baselineY = 170;
  const leftPad = 90;
  const rightPad = 110;
  const topLabelY = 68;
  const xForDate = (value) => {
    const point = dateishTime(value);
    return leftPad + ((point - timeline.startTime) / timeline.range) * (width - leftPad - rightPad);
  };
  const dateForX = (x) => {
    const limited = Math.min(Math.max(x, leftPad), width - rightPad);
    const ratio = (limited - leftPad) / (width - leftPad - rightPad);
    return new Date(timeline.startTime + (ratio * timeline.range));
  };

  const defs = svgNode("defs");
  const filter = svgNode("filter", { id: "journey-handdrawn" });
  filter.appendChild(svgNode("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.018",
    numOctaves: "2",
    seed: "7",
    result: "noise",
  }));
  filter.appendChild(svgNode("feDisplacementMap", {
    in: "SourceGraphic",
    in2: "noise",
    scale: "0.7",
  }));
  defs.appendChild(filter);
  svg.appendChild(defs);

  const backgroundHit = svgNode("rect", {
    x: "0",
    y: "0",
    width: String(width),
    height: "260",
    fill: "transparent",
    class: "journey-canvas-hit",
  });
  backgroundHit.addEventListener("pointerdown", (event) => {
    if (!state.journeyDraft) {
      return;
    }
    event.preventDefault();
    const point = getJourneySvgPoint(event.clientX, event.clientY);
    state.journeyDraft.selectionAnchor = point;
    state.journeyDraft.selectionRect = { x: point.x, y: point.y, width: 0, height: 0 };
    state.journeyDraft.selectionMoved = false;
    state.journeyDraft.activeMilestoneId = null;
    renderJourneyPopover();
  });
  svg.appendChild(backgroundHit);

  svg.appendChild(svgNode("path", {
    d: buildTimelineSpinePath(leftPad, width - rightPad, baselineY),
    class: "timeline-spine-glow",
  }));

  svg.appendChild(svgNode("path", {
    d: buildTimelineSpinePath(leftPad, width - rightPad, baselineY),
    class: "timeline-spine",
  }));

  const orderedMilestones = [...state.journeyDraft.milestones]
    .sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected));
  let activeMilestoneRatio = null;
  const selectionBounds = [];

  const labelLayouts = [];
  const laneLastRight = [];
  const laneThreshold = 52;
  const maxLanes = 6;
  let clusterIndex = 0;
  let previousX = null;
  orderedMilestones.forEach((milestone) => {
    const x = xForDate(milestone.expected);
    clusterIndex = previousX !== null && x - previousX < 136 ? clusterIndex + 1 : 0;
    previousX = x;
    const crowdAnchor = clusterIndex === 0
      ? "middle"
      : clusterIndex % 2 === 1
        ? "start"
        : "end";
    const horizontalOffsetBase = crowdAnchor === "start" ? 28 : crowdAnchor === "end" ? -28 : 0;
    const horizontalOffset = horizontalOffsetBase + (crowdAnchor === "middle" ? 0 : Math.min(clusterIndex, 4) * (crowdAnchor === "start" ? 7 : -7));
    const estimatedWidth = Math.max(80, Math.min((milestone.name?.length || 0) * 7.4, 132));
    const leftBound = x + horizontalOffset - (crowdAnchor === "end" ? estimatedWidth : crowdAnchor === "middle" ? estimatedWidth / 2 : 0);
    const rightBound = x + horizontalOffset + (crowdAnchor === "start" ? estimatedWidth : crowdAnchor === "middle" ? estimatedWidth / 2 : 0);
    let level = 0;
    for (let lane = 0; lane < maxLanes; lane += 1) {
      const lastRight = laneLastRight[lane];
      if (typeof lastRight !== "number" || leftBound - lastRight >= laneThreshold) {
        level = lane;
        laneLastRight[lane] = rightBound;
        break;
      }
      if (lane === maxLanes - 1) {
        level = lane;
        laneLastRight[lane] = rightBound;
      }
    }
    labelLayouts.push({
      id: milestone.id,
      x,
      level,
      anchor: crowdAnchor,
      horizontalOffset,
    });
  });

  orderedMilestones.forEach((milestone) => {
    const x = xForDate(milestone.expected);
    if (state.journeyDraft.activeMilestoneId === milestone.id) {
      activeMilestoneRatio = x / width;
    }
    const layout = labelLayouts.find((item) => item.id === milestone.id) || { level: 0, anchor: "middle", horizontalOffset: 0 };
    const level = layout.level ?? 0;
    const verticalOffset = level * 24;
    const arrowTipY = baselineY;
    const arrowTopY = baselineY - 15;
    const labelX = x + (layout.horizontalOffset ?? 0);
    const nameY = arrowTopY - 19 - verticalOffset;
    const dateY = nameY + 12;
    const isSelected = isJourneyMilestoneSelected(milestone.id);
    const isActiveEditor = state.journeyDraft.activeMilestoneId === milestone.id;
    const isDraggable = state.journeyDraft.mode === "edit"
      ? true
      : milestone.type !== "custom" ? milestone.type === "kickoff" || milestone.type === "ga" : true;
    const marker = svgNode("g", { class: `journey-marker ${isSelected ? "is-selected" : ""} ${isActiveEditor ? "is-active-editor" : ""}` });
    if (isSelected) {
      marker.appendChild(svgNode("rect", {
        x: String(labelX - 56),
        y: String(nameY - 34),
        width: "112",
        height: "80",
        rx: "24",
        class: "journey-selection-halo",
      }));
    }
    marker.appendChild(svgNode("line", {
      x1: String(x),
      x2: String(x),
      y1: String(baselineY - 8),
      y2: String(baselineY + 8),
      stroke: "rgba(103, 92, 83, 0.24)",
      "stroke-width": "1.05",
      "stroke-dasharray": "2 6",
      class: "journey-marker-stem",
    }));
    marker.appendChild(labelTextNode(milestone.name, labelX, nameY, "rgba(47, 55, 70, 0.88)", 12, layout.anchor, "marker-label milestone-name"));
    marker.appendChild(labelTextNode(formatShortDate(milestone.expected), labelX, dateY, "var(--muted)", 10, layout.anchor, "marker-date date-text"));
    marker.appendChild(svgNode("polygon", {
      points: `${x},${arrowTipY - 3} ${x - 7},${arrowTopY} ${x + 7},${arrowTopY}`,
      class: "expected-marker",
    }));

    const hit = svgNode("rect", {
      x: String(x - 18),
      y: String(baselineY - 38),
      width: "36",
      height: "54",
      fill: "transparent",
      class: `journey-milestone-hit ${isDraggable ? "is-draggable" : ""} ${isSelected ? "is-selected" : ""}`,
    });
    hit.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.journeyDraft.selectionAnchor = null;
      state.journeyDraft.selectionRect = null;
      state.journeyDraft.selectionMoved = false;
      state.journeyDraft.dragCandidateMilestoneId = milestone.id;
      state.journeyDraft.dragStartX = event.clientX;
      state.journeyDraft.dragMoved = false;
      if (isDraggable) {
        if (!isSelected) {
          clearJourneySelection();
        }
        state.journeyDraft.dragMilestoneId = milestone.id;
        state.journeyDraft.dragGroupSnapshot = getJourneyDragSnapshot(milestone.id);
      }
    });
    marker.appendChild(hit);
    svg.appendChild(marker);
    selectionBounds.push({
      id: milestone.id,
      ...getJourneyMilestoneSelectionBounds(milestone, labelX, x, nameY, dateY, baselineY, layout.anchor),
    });
  });

  svg.appendChild(svgNode("path", {
    d: `M${leftPad} ${baselineY + 28} C${leftPad + 154} ${baselineY + 27}, ${leftPad + 307} ${baselineY + 29}, ${leftPad + 460} ${baselineY + 28} C${leftPad + 614} ${baselineY + 27}, ${leftPad + 767} ${baselineY + 29}, ${width - rightPad} ${baselineY + 28}`,
    class: "month-ruler-line-glow",
  }));

  svg.appendChild(svgNode("path", {
    d: `M${leftPad} ${baselineY + 28} C${leftPad + 154} ${baselineY + 27}, ${leftPad + 307} ${baselineY + 29}, ${leftPad + 460} ${baselineY + 28} C${leftPad + 614} ${baselineY + 27}, ${leftPad + 767} ${baselineY + 29}, ${width - rightPad} ${baselineY + 28}`,
    filter: "url(#journey-handdrawn)",
    class: "month-ruler-line",
  }));

  buildMonthLabels(timeline, width - leftPad - rightPad).forEach((label) => {
    const monthText = svgNode("text", {
      x: String(leftPad + label.x),
      y: String(baselineY + 42),
      class: "month-label",
      "text-anchor": label.anchor,
    });
    monthText.textContent = label.text;
    svg.appendChild(monthText);
  });

  if (state.journeyDraft.selectionRect) {
    const { x, y, width: rectWidth, height: rectHeight } = state.journeyDraft.selectionRect;
    svg.appendChild(svgNode("rect", {
      x: String(x),
      y: String(y),
      width: String(rectWidth),
      height: String(rectHeight),
      rx: "10",
      class: "journey-selection-box",
    }));
  }

  state.journeyDraft.selectionBounds = selectionBounds;

  renderJourneyPopover(activeMilestoneRatio);
}

function addJourneyMilestone() {
  if (!state.journeyDraft) {
    return;
  }
  clearJourneySelection();
  const ordered = [...state.journeyDraft.milestones].sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected));
  const gaMilestone = ordered.find((item) => item.type === "ga");
  const beforeGa = gaMilestone
    ? ordered.filter((item) => item.id !== gaMilestone.id && dateishTime(item.expected) < dateishTime(gaMilestone.expected))
    : ordered;
  const anchor = beforeGa.at(-1) || ordered[0];
  const nextDate = new Date(anchor.expected);
  nextDate.setDate(nextDate.getDate() + 10);
  if (gaMilestone && nextDate.getTime() >= dateishTime(gaMilestone.expected)) {
    nextDate.setTime(dateishTime(gaMilestone.expected));
    nextDate.setDate(nextDate.getDate() - 10);
  }
  const milestone = createJourneyMilestone("New Milestone", nextDate, "", "", "custom");
  state.journeyDraft.milestones.push(milestone);
  state.journeyDraft.activeMilestoneId = milestone.id;
  renderJourneyDraft();
}

function updateJourneyActiveMilestone(field, value) {
  const active = getJourneyActiveMilestone();
  if (!active) {
    return;
  }
  clearJourneySelection();
  active[field] = value;
  renderJourneyDraft();
}

function deleteJourneyMilestone() {
  const active = getJourneyActiveMilestone();
  if (!active || active.type !== "custom") {
    return;
  }
  clearJourneySelection();
  state.journeyDraft.milestones = state.journeyDraft.milestones.filter((item) => item.id !== active.id);
  state.journeyDraft.activeMilestoneId = null;
  elements.journeyMilestoneMenuPanel.classList.add("hidden");
  renderJourneyDraft();
}

function updateJourneyDrag(clientX) {
  if (!state.journeyDraft || !elements.journeyTimeline) {
    return;
  }
  if (!state.journeyDraft.dragMilestoneId || !state.journeyDraft.dragCandidateMilestoneId || state.journeyDraft.dragStartX === null) {
    return;
  }
  state.journeyDraft.pendingDragClientX = clientX;
  if (state.journeyDraft.dragRenderFrame !== null) {
    return;
  }
  state.journeyDraft.dragRenderFrame = requestAnimationFrame(() => {
    if (!state.journeyDraft) {
      return;
    }
    state.journeyDraft.dragRenderFrame = null;
    const pendingClientX = state.journeyDraft.pendingDragClientX;
    if (pendingClientX === null) {
      return;
    }
    if (!state.journeyDraft.dragMoved && Math.abs(pendingClientX - state.journeyDraft.dragStartX) < JOURNEY_INTERACTION_CONFIG.dragStartThresholdPx) {
      return;
    }
    if (!state.journeyDraft.dragMoved) {
      state.journeyDraft.dragMoved = true;
      state.journeyDraft.activeMilestoneId = null;
      renderJourneyPopover();
    }
    const snapshot = state.journeyDraft.dragGroupSnapshot || getJourneyDragSnapshot(state.journeyDraft.dragMilestoneId);
    if (!snapshot) {
      return;
    }
    const oneDay = 24 * 60 * 60 * 1000;
    const pixelDelta = pendingClientX - state.journeyDraft.dragStartX;
    const rawDeltaDays = Math.round(pixelDelta / JOURNEY_INTERACTION_CONFIG.dragPixelsPerDay);
    const deltaDays = Math.min(Math.max(rawDeltaDays, snapshot.minDeltaDays), snapshot.maxDeltaDays);
    snapshot.selectedIds.forEach((id) => {
      const milestone = state.journeyDraft.milestones.find((item) => item.id === id);
      if (!milestone) {
        return;
      }
      const shifted = new Date(snapshot.baseTimes[id] + (deltaDays * oneDay));
      shifted.setHours(12, 0, 0, 0);
      milestone.expected = shifted;
    });
    renderJourneyDraft();
  });
}

function finishJourneyDrag() {
  if (state.journeyDraft) {
    const shouldOpenEditor = state.journeyDraft.dragCandidateMilestoneId && !state.journeyDraft.dragMoved;
    const selectedCount = getJourneySelectedMilestoneIds().length;
    const candidateIsSelected = shouldOpenEditor
      ? isJourneyMilestoneSelected(state.journeyDraft.dragCandidateMilestoneId)
      : false;
    if (shouldOpenEditor && !(candidateIsSelected && selectedCount > 1)) {
      clearJourneySelection();
      state.journeyDraft.activeMilestoneId = state.journeyDraft.dragCandidateMilestoneId;
    }
    state.journeyDraft.dragMilestoneId = null;
    state.journeyDraft.dragCandidateMilestoneId = null;
    state.journeyDraft.dragStartX = null;
    state.journeyDraft.dragGroupSnapshot = null;
    state.journeyDraft.pendingDragClientX = null;
    if (state.journeyDraft.dragRenderFrame !== null) {
      cancelAnimationFrame(state.journeyDraft.dragRenderFrame);
      state.journeyDraft.dragRenderFrame = null;
    }
    renderJourneyDraft();
    setTimeout(() => {
      if (state.journeyDraft) {
        state.journeyDraft.dragMoved = false;
      }
    }, 0);
  }
}

function updateJourneySelection(clientX, clientY) {
  if (!state.journeyDraft?.selectionAnchor) {
    return;
  }
  const current = getJourneySvgPoint(clientX, clientY);
  const start = state.journeyDraft.selectionAnchor;
  const rect = {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
  if (
    !state.journeyDraft.selectionMoved &&
    rect.width < JOURNEY_INTERACTION_CONFIG.selectionStartThresholdPx &&
    rect.height < JOURNEY_INTERACTION_CONFIG.selectionStartThresholdPx
  ) {
    return;
  }
  state.journeyDraft.selectionMoved = true;
  state.journeyDraft.selectionRect = rect;
  const selectedIds = (state.journeyDraft.selectionBounds || [])
    .filter((bounds) => (
      rect.x <= bounds.right &&
      rect.x + rect.width >= bounds.left &&
      rect.y <= bounds.bottom &&
      rect.y + rect.height >= bounds.top
    ))
    .map((bounds) => bounds.id);
  state.journeyDraft.selectedMilestoneIds = selectedIds;
  renderJourneyDraft();
}

function finishJourneySelection() {
  if (!state.journeyDraft?.selectionAnchor) {
    return;
  }
  const didMove = state.journeyDraft.selectionMoved;
  state.journeyDraft.selectionAnchor = null;
  state.journeyDraft.selectionRect = null;
  state.journeyDraft.selectionMoved = false;
  if (!didMove) {
    state.journeyDraft.selectedMilestoneIds = [];
    state.journeyDraft.activeMilestoneId = null;
  }
  renderJourneyDraft();
}

function openImportDialog() {
  elements.importMessage.textContent = "";
  if (!elements.importDialog.open) {
    elements.importDialog.showModal();
  }
  setTimeout(() => {
    elements.importFile.focus();
  }, 0);
}

function toggleJourneyActionMenu() {
  const isOpen = !elements.journeyActionMenu.classList.contains("hidden");
  setJourneyActionMenuOpen(!isOpen);
}

function setJourneyActionMenuOpen(isOpen) {
  elements.journeyActionMenu.classList.toggle("hidden", !isOpen);
  elements.newReleaseButton.setAttribute("aria-expanded", String(isOpen));
}

function openAckDialog(releaseId, milestoneId) {
  state.ackContext = { releaseId, milestoneId };
  elements.ackMessage.textContent = "";
  elements.ackSecret.value = "";
  ensureAckActionsBound();
  syncAckFormState();
  if (elements.ackDialog.open) {
    elements.ackNote.focus();
    return;
  }
  elements.ackDialog.showModal();
  elements.ackNote.focus();
}

async function openObservationDialog(releaseId) {
  const release = getReleaseById(releaseId);
  if (!release) {
    return;
  }

  state.observationContext = buildObservationContext(
    release,
    state.observationByRelease[releaseId] || buildObservationWorkspaceFromRelease(release),
  );
  state.observationDetailPreview = false;
  elements.observationMessage.textContent = "";
  renderObservationWorkspace();
  if (!elements.observationDialog.open) {
    elements.observationDialog.showModal();
  }
  requestAnimationFrame(() => {
    if (window.innerWidth <= 720) {
      return;
    }
    elements.observationWhisper.focus();
    elements.observationWhisper.select();
  });
  await loadObservationWorkspace(releaseId, { silent: true });
}

function closeImportDialog() {
  if (elements.importDialog.open) {
    elements.importDialog.close();
  }
}

function closeAckDialog() {
  if (elements.ackDialog.open) {
    elements.ackDialog.close();
  }
}

function closeObservationDialog() {
  if (elements.observationDialog.open) {
    elements.observationDialog.close();
  }
  state.observationContext = null;
  state.observationDetailPreview = false;
}

function openEngineDialog() {
  elements.engineSmtpTestMessage.textContent = "";
  syncEngineDateFormat();
  if (!elements.engineDialog.open) {
    elements.engineDialog.showModal();
  }
  loadSystemStatus();
}

function closeEngineDialog() {
  if (elements.engineDialog.open) {
    elements.engineDialog.close();
  }
}

function formatSmtpFrom(status) {
  const name = status.from_name || "Boa";
  if (status.from) {
    return `${name} <${status.from}>`;
  }
  return name;
}

function formatSmtpSecurity(status) {
  if (status.ssl) {
    return "SSL";
  }
  if (status.starttls) {
    return "STARTTLS";
  }
  return "None";
}

function renderSystemSmtp(status) {
  if (!status) {
    elements.engineSmtpStatus.textContent = "Unavailable";
    elements.engineSmtpMessage.textContent = "The mail route could not be read right now.";
    elements.engineSmtpHost.textContent = "Not set";
    elements.engineSmtpFrom.textContent = "Not set";
    elements.engineSmtpSecurity.textContent = "None";
    elements.engineSmtpSendButton.disabled = true;
    elements.engineSmtpLamp.classList.remove("is-ready", "is-error");
    return;
  }

  let statusLabel = "Disabled";
  if (status.enabled) {
    statusLabel = status.ready ? "Ready" : "Not configured";
  }
  if (status.message && status.message.startsWith("SMTP configuration is invalid")) {
    statusLabel = "Error";
  }
  elements.engineSmtpStatus.textContent = statusLabel;

  const message = status.ready
    ? "The mail route is ready."
    : (status.message || "The mail route has not been prepared yet.");
  elements.engineSmtpMessage.textContent = message;

  elements.engineSmtpHost.textContent = status.host || "Not set";
  elements.engineSmtpFrom.textContent = formatSmtpFrom(status);
  elements.engineSmtpSecurity.textContent = formatSmtpSecurity(status);

  elements.engineSmtpLamp.classList.remove("is-ready", "is-error");
  if (status.ready) {
    elements.engineSmtpLamp.classList.add("is-ready");
  } else if (statusLabel === "Error") {
    elements.engineSmtpLamp.classList.add("is-error");
  }

  elements.engineSmtpTestTo.value = status.test_to || "";
  elements.engineSmtpSendButton.disabled = !status.ready;
}

async function loadSystemStatus() {
  try {
    const status = await request("/api/system/smtp");
    renderSystemSmtp(status);
  } catch (error) {
    renderSystemSmtp(null);
    elements.engineSmtpTestMessage.textContent = error.message;
  }
}

async function submitEngineSmtpTest(event) {
  event.preventDefault();
  elements.engineSmtpTestMessage.textContent = "";
  const to = elements.engineSmtpTestTo.value.trim();
  elements.engineSmtpSendButton.disabled = true;
  try {
    const result = await request("/api/system/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(to ? { to } : {}),
    });
    elements.engineSmtpTestMessage.textContent = result.ok ? "A test email was sent." : (result.message || "The route answered unexpectedly.");
    if (!result.ok && result.error) {
      elements.engineSmtpTestMessage.textContent += ` ${result.error}`;
    }
  } catch (error) {
    elements.engineSmtpTestMessage.textContent = error.message;
  } finally {
    loadSystemStatus();
  }
}

function getSelectedEditRelease() {
  return state.releases.find((item) => String(item.id) === elements.editRelease.value) || state.releases[0] || null;
}

function renderPreservingViewport() {
  const currentScrollX = window.scrollX;
  const currentScrollY = window.scrollY;
  render();
  window.scrollTo(currentScrollX, currentScrollY);
}

function toggleReleaseMenu(releaseId) {
  state.activeMenuReleaseId = state.activeMenuReleaseId === releaseId ? null : releaseId;
  renderPreservingViewport();
}

function closeReleaseMenu() {
  if (state.activeMenuReleaseId === null) {
    return;
  }
  state.activeMenuReleaseId = null;
  renderPreservingViewport();
}

function toggleReleaseDates(releaseId) {
  if (state.expandedReleaseIds.has(releaseId)) {
    state.expandedReleaseIds.delete(releaseId);
  } else {
    state.expandedReleaseIds.add(releaseId);
  }
  syncDateVisibility();
}

function toggleAllReleaseDates() {
  if (!state.releases.length) {
    return;
  }

  const shouldExpand = state.expandedReleaseIds.size !== state.releases.length;
  state.expandedReleaseIds = shouldExpand
    ? new Set(state.releases.map((release) => release.id))
    : new Set();
  syncDateVisibility();
}

function syncDateVisibility() {
  const rows = elements.board.querySelectorAll(".release-row");
  rows.forEach((row) => {
    const releaseId = Number(row.dataset.releaseId);
    row.classList.toggle("dates-visible", state.expandedReleaseIds.has(releaseId));
  });
}

function isMilestoneDragEnabled(releaseId) {
  return Boolean(
    elements.journeyDialog.open &&
    state.journeyDraft?.mode === "edit" &&
    state.journeyDraft?.releaseId === releaseId
  );
}


function extractOptionalError(response) {
  if (response?.error?.message) {
    return response.error.message;
  }
  const detail = response?.payload?.detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (detail) {
    return JSON.stringify(detail);
  }
  return `Request failed with status ${response.status || "unknown"}.`;
}

function numberish(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function handleReleaseMenuAction(release, action) {
  closeReleaseMenu();
  if (action === "settings") {
    openJourneyDialog(release);
    return;
  }

  if (action === "export") {
    await exportReleaseYaml(release);
    return;
  }

  if (action === "delete") {
    await deleteRelease(release);
  }
}

async function exportReleaseYaml(release) {
  setStatus("Preparing journey");
  try {
    const yamlText = await request(`/api/releases/${release.id}/export`);
    const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(release.product)}-${slugify(release.version)}.yaml`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus("Journey downloaded");
  } catch (error) {
    console.error(error);
    elements.importMessage.textContent = error.message;
    setStatus("Journey download failed");
  }
}

async function deleteRelease(release) {
  const secret = window.prompt(`Type the journey key to remove ${release.product} ${release.version}.`);
  if (secret === null) {
    return;
  }
  if (secret.trim() !== String(release.secret || "").trim()) {
    elements.journeyMessage.textContent = "Journey key did not match. The journey was not removed.";
    setStatus("Journey removal paused");
    return;
  }
  const confirmed = window.confirm(`Are you sure you want to remove this release?\n\n${release.product} ${release.version}\n\nThis removes its milestones and bug history.`);
  if (!confirmed) {
    return;
  }

  setStatus("Deleting");
  try {
    await request(`/api/releases/${release.id}`, { method: "DELETE" });
    await loadTimeline();
    setStatus("Journey removed");
  } catch (error) {
    console.error(error);
    elements.journeyMessage.textContent = error.message;
    setStatus("Journey could not be removed");
  }
}

const DEMO_UNIVERSE_SCENARIOS = [
  {
    product: "Lantern Vale",
    version: "1.2",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: -148, owner: "aurore", ack: true },
      { name: "Dev Ready", dayOffset: -112, owner: "lin", ack: true },
      { name: "Regression Ready", dayOffset: -76, owner: "mika", ack: true },
      { name: "GA Release", dayOffset: -42, owner: "sora", ack: true },
    ],
    bugSeries: [
      { dayOffset: -122, openBugCount: 18 },
      { dayOffset: -96, openBugCount: 32 },
      { dayOffset: -74, openBugCount: 21 },
      { dayOffset: -58, openBugCount: 11 },
      { dayOffset: -46, openBugCount: 4 },
      { dayOffset: -40, openBugCount: 0 },
    ],
    starlightMoments: [
      {
        observedOn: -144,
        starlight: 18,
        whisper: "The route was named and the first lanterns were lit.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Scope gathered around one clear route\n- First engineering rhythm agreed\n\n## Risk\n\n- Interface boundaries were still soft",
        },
        metrics: { done: 3, total: 21, blocked: 2 },
      },
      {
        observedOn: -114,
        starlight: 41,
        whisper: "The valley stopped echoing and began to answer.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Core flow connected end to end\n- Owners settled the handoff shape\n\n## In Progress\n\n- Reliability passes along the edge cases",
        },
        metrics: { done: 9, total: 21, blocked: 2 },
      },
      {
        observedOn: -79,
        starlight: 72,
        whisper: "Most of the rough weather had already passed behind us.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Regression route calmed down\n- Documentation caught up with the build\n\n## Risk\n\n- Final compatibility checks were still underway",
        },
        metrics: { done: 16, total: 21, blocked: 1 },
      },
      {
        observedOn: -42,
        starlight: 100,
        whisper: "The lanterns held steady all the way to arrival.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- General availability reached quietly\n- Post-release watch stayed calm\n\n## Notes\n\nThe trail is complete, but still visible.",
        },
        metrics: { done: 21, total: 21, blocked: 0 },
      },
    ],
  },
  {
    product: "Lantern Vale",
    version: "1.6",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: -58, owner: "aurore", ack: true },
      { name: "Dev Ready", dayOffset: -18, owner: "lin", ack: true },
      { name: "Regression Ready", dayOffset: 14, owner: "mika", ack: false },
      { name: "GA Release", dayOffset: 38, owner: "sora", ack: false },
    ],
    bugSeries: [
      { dayOffset: -42, openBugCount: 9 },
      { dayOffset: -30, openBugCount: 16 },
      { dayOffset: -20, openBugCount: 28 },
      { dayOffset: -12, openBugCount: 22 },
      { dayOffset: -5, openBugCount: 13 },
      { dayOffset: 0, openBugCount: 8 },
    ],
    starlightMoments: [
      {
        observedOn: -54,
        starlight: 16,
        whisper: "The path reopened, but the sky was still dim.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Kickoff aligned around one narrow goal\n- Design and backend started from the same map\n\n## Risk\n\n- Several interfaces were still provisional",
        },
        metrics: { done: 4, total: 24, blocked: 3 },
      },
      {
        observedOn: -24,
        starlight: 34,
        whisper: "The second pass felt more certain than the first.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Core release flow reached staging\n- Release notes began to hold together\n\n## In Progress\n\n- Team is still closing tricky edge cases",
        },
        metrics: { done: 10, total: 24, blocked: 3 },
      },
      {
        observedOn: -10,
        starlight: 57,
        whisper: "The route has shape now, even with weather still nearby.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Integration sweep settled the major breaks\n- Cross-team review became calmer\n\n## Risk\n\n- One auth seam still needs a final pass",
        },
        metrics: { done: 16, total: 24, blocked: 2 },
      },
      {
        observedOn: 0,
        starlight: 73,
        whisper: "Confidence is gathering, even while the mountains still move.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Feature integration is steady\n- QA handoff feels composed\n- Support notes are almost ready\n\n## In Progress\n\n- Final task-state alignment\n\n## Risk\n\n- Token refresh edge cases still need one more pass",
        },
        metrics: { done: 19, total: 24, blocked: 1 },
      },
    ],
  },
  {
    product: "Lantern Vale",
    version: "2.0",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: 16, owner: "aurore", ack: false },
      { name: "Dev Ready", dayOffset: 48, owner: "lin", ack: false },
      { name: "Regression Ready", dayOffset: 86, owner: "mika", ack: false },
      { name: "GA Release", dayOffset: 126, owner: "sora", ack: false },
    ],
    bugSeries: [
      { dayOffset: -18, openBugCount: 1 },
      { dayOffset: -12, openBugCount: 2 },
      { dayOffset: -7, openBugCount: 1 },
      { dayOffset: -3, openBugCount: 3 },
      { dayOffset: 0, openBugCount: 2 },
    ],
    starlightMoments: [
      {
        observedOn: -20,
        starlight: 8,
        whisper: "The next lantern is only a sketch on paper.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Early intent was written down\n- Teams agreed on the broad destination\n\n## Risk\n\n- Milestone dates are still gentle estimates",
        },
        metrics: { done: 1, total: 19, blocked: 0 },
      },
      {
        observedOn: -9,
        starlight: 17,
        whisper: "A first route exists, but no one is rushing it.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Kickoff shape drafted\n- Technical questions narrowed\n\n## In Progress\n\n- Scoping the work that truly belongs in this journey",
        },
        metrics: { done: 3, total: 19, blocked: 1 },
      },
      {
        observedOn: 0,
        starlight: 29,
        whisper: "The future journey is visible now, even from far away.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- The first planning contour is stable\n- Owners can already see the long horizon\n\n## Risk\n\n- Schedule confidence is still intentionally modest",
        },
        metrics: { done: 5, total: 19, blocked: 1 },
      },
    ],
  },
  {
    product: "Rose Current",
    version: "3.4",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: -132, owner: "iris", ack: true },
      { name: "Dev Ready", dayOffset: -101, owner: "noel", ack: true },
      { name: "Regression Ready", dayOffset: -66, owner: "toma", ack: true },
      { name: "GA Release", dayOffset: -31, owner: "mina", ack: true },
    ],
    bugSeries: [
      { dayOffset: -108, openBugCount: 14 },
      { dayOffset: -86, openBugCount: 24 },
      { dayOffset: -63, openBugCount: 18 },
      { dayOffset: -48, openBugCount: 9 },
      { dayOffset: -36, openBugCount: 3 },
      { dayOffset: -29, openBugCount: 0 },
    ],
    starlightMoments: [
      {
        observedOn: -128,
        starlight: 22,
        whisper: "The current finally chose one direction.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Scope trimmed to one meaningful current\n- Team agreed on the release rhythm\n\n## Risk\n\n- Tooling support had not settled yet",
        },
        metrics: { done: 4, total: 17, blocked: 1 },
      },
      {
        observedOn: -97,
        starlight: 48,
        whisper: "The work stopped drifting and began to hold shape.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Core integration held through the first long week\n- Deployment path became repeatable\n\n## In Progress\n\n- Final editor refinements",
        },
        metrics: { done: 9, total: 17, blocked: 1 },
      },
      {
        observedOn: -62,
        starlight: 78,
        whisper: "Only small waves remained near the surface.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Regression layer quieted down\n- Review cycle shortened\n\n## Risk\n\n- A final telemetry check was still open",
        },
        metrics: { done: 14, total: 17, blocked: 1 },
      },
      {
        observedOn: -31,
        starlight: 100,
        whisper: "Arrival felt light, almost like it happened on its own.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- GA shipped without turbulence\n- Post-release monitoring stayed calm\n\n## Notes\n\nThis journey is now part of the remembered sky.",
        },
        metrics: { done: 17, total: 17, blocked: 0 },
      },
    ],
  },
  {
    product: "Rose Current",
    version: "3.8",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: -44, owner: "iris", ack: true },
      { name: "Dev Ready", dayOffset: -9, owner: "noel", ack: true },
      { name: "Regression Ready", dayOffset: 21, owner: "toma", ack: false },
      { name: "GA Release", dayOffset: 56, owner: "mina", ack: false },
    ],
    bugSeries: [
      { dayOffset: -33, openBugCount: 6 },
      { dayOffset: -22, openBugCount: 12 },
      { dayOffset: -14, openBugCount: 19 },
      { dayOffset: -8, openBugCount: 17 },
      { dayOffset: -2, openBugCount: 11 },
      { dayOffset: 0, openBugCount: 7 },
    ],
    starlightMoments: [
      {
        observedOn: -40,
        starlight: 14,
        whisper: "The water is moving again, but still quietly.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Kickoff aligned across product and infra\n- First release contour agreed\n\n## Risk\n\n- Several support paths are still being written",
        },
        metrics: { done: 3, total: 22, blocked: 2 },
      },
      {
        observedOn: -19,
        starlight: 31,
        whisper: "The current has momentum now, though not yet peace.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Core path crossed staging\n- Cross-team confidence improved\n\n## In Progress\n\n- API contracts are being tightened",
        },
        metrics: { done: 8, total: 22, blocked: 2 },
      },
      {
        observedOn: -6,
        starlight: 53,
        whisper: "The shore is visible, but the weather still matters.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Release branch is coherent\n- Most handoffs have settled\n\n## Risk\n\n- One compatibility seam remains noisy",
        },
        metrics: { done: 13, total: 22, blocked: 2 },
      },
      {
        observedOn: 0,
        starlight: 68,
        whisper: "The journey is moving forward with patient confidence.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Integration path feels dependable\n- Preview signoff is nearly there\n\n## In Progress\n\n- Final regression sweep\n\n## Risk\n\n- Remaining bugs are smaller, but still real",
        },
        metrics: { done: 16, total: 22, blocked: 1 },
      },
    ],
  },
  {
    product: "Rose Current",
    version: "4.1",
    secret: "demo",
    milestones: [
      { name: "Kickoff", dayOffset: 11, owner: "iris", ack: false },
      { name: "Dev Ready", dayOffset: 37, owner: "noel", ack: false },
      { name: "Regression Ready", dayOffset: 73, owner: "toma", ack: false },
      { name: "GA Release", dayOffset: 108, owner: "mina", ack: false },
    ],
    bugSeries: [
      { dayOffset: -15, openBugCount: 0 },
      { dayOffset: -10, openBugCount: 1 },
      { dayOffset: -6, openBugCount: 2 },
      { dayOffset: -2, openBugCount: 1 },
      { dayOffset: 0, openBugCount: 1 },
    ],
    starlightMoments: [
      {
        observedOn: -18,
        starlight: 7,
        whisper: "Only the first notes have been placed on the page.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Long-horizon planning has started\n- Early owners are already visible\n\n## Risk\n\n- Delivery shape is still intentionally open",
        },
        metrics: { done: 1, total: 20, blocked: 0 },
      },
      {
        observedOn: -8,
        starlight: 15,
        whisper: "The next current is becoming easier to imagine.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- The future release gained its first shared map\n- Work has been separated from wishful thinking\n\n## In Progress\n\n- Milestones are still being tuned",
        },
        metrics: { done: 2, total: 20, blocked: 1 },
      },
      {
        observedOn: 0,
        starlight: 24,
        whisper: "Readiness is gathering, but still close to the horizon.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Planning assumptions are becoming steadier\n- The team can already see the first departure point\n\n## Risk\n\n- Timeline confidence should stay modest for now",
        },
        metrics: { done: 4, total: 20, blocked: 1 },
      },
    ],
  },
];

const DEMO_BLUEPRINT_KICKOFF = "2025-01-15";
const DEMO_GALAXY_NAMES = [...new Set(DEMO_UNIVERSE_SCENARIOS.map((scenario) => scenario.product))];

async function seedDemo() {
  elements.seedButton.disabled = true;
  setStatus("Seeding demo sky");
  try {
    const demoReleases = state.releases.filter(
      (release) => String(release.secret || "").trim() === "demo" || DEMO_GALAXY_NAMES.includes(release.product),
    );
    const staleDemoCount = demoReleases.length;

    for (const release of demoReleases) {
      await request(`/api/releases/${release.id}`, { method: "DELETE" });
    }

    for (const scenario of DEMO_UNIVERSE_SCENARIOS) {
      await createDemoJourney(scenario);
    }

    await loadTimeline();
    const rebuiltJourneys = DEMO_UNIVERSE_SCENARIOS.length;
    const rebuiltGalaxies = new Set(DEMO_UNIVERSE_SCENARIOS.map((item) => item.product)).size;
    const resetMessage = staleDemoCount
      ? `${rebuiltJourneys} demo journeys were refreshed across ${rebuiltGalaxies} galaxies.`
      : `${rebuiltJourneys} demo journeys loaded across ${rebuiltGalaxies} galaxies.`;
    elements.importMessage.textContent = resetMessage;
    setStatus("Demo sky ready");
  } catch (error) {
    console.error(error);
    elements.importMessage.textContent = error.message;
    setStatus("Seed failed");
  } finally {
    elements.seedButton.disabled = false;
  }
}

async function createDemoJourney(scenario) {
  const kickoffDate = isoDateFromOffset(scenario.milestones[0].dayOffset);
  const formData = new FormData();
  formData.append(
    "file",
    new File(
      [buildDemoBlueprintYaml(scenario)],
      `${slugify(scenario.product)}-${String(scenario.version).replace(/\s+/g, "-")}.yaml`,
      { type: "text/yaml" },
    ),
  );
  formData.append("keep_original", "false");
  formData.append("shift_timeline", "true");
  formData.append("new_kickoff_date", kickoffDate);

  const created = await request("/api/releases/import", {
    method: "POST",
    body: formData,
  });

  const releaseId = created.id;

  for (const entry of scenario.bugSeries) {
    await request(`/api/releases/${releaseId}/bug-snapshots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        open_bug_count: entry.openBugCount,
        observed_at: isoDateTimeFromOffset(entry.dayOffset),
      }),
    });
  }

  for (const moment of scenario.starlightMoments) {
    await request(`/api/releases/${releaseId}/starlight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observed_on: isoDateFromOffset(moment.observedOn),
        starlight: moment.starlight,
        whisper: moment.whisper,
        detail: moment.detail,
        metrics: moment.metrics,
      }),
    });
  }

  await loadTimeline();
  const refreshed = state.releases.find((release) => release.id === releaseId);
  if (!refreshed?.milestones?.length) {
    return;
  }

  for (const milestoneSpec of scenario.milestones.filter((item) => item.ack)) {
    const target = refreshed.milestones.find((item) => item.name === milestoneSpec.name);
    if (!target) {
      continue;
    }
    await request(`/api/milestones/${target.id}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: scenario.secret, ack_name: milestoneSpec.owner || "qa" }),
    });
  }
}

function buildDemoBlueprintYaml(scenario) {
  const kickoffOffset = scenario.milestones[0]?.dayOffset || 0;
  const anchor = new Date(`${DEMO_BLUEPRINT_KICKOFF}T12:00:00`);
  const lines = [
    `product: ${yamlScalar(scenario.product)}`,
    `version: ${yamlScalar(String(scenario.version))}`,
    `secret: ${yamlScalar(scenario.secret)}`,
    "milestones:",
  ];

  scenario.milestones.forEach((milestone) => {
    const relativeOffset = milestone.dayOffset - kickoffOffset;
    const expected = new Date(anchor);
    expected.setDate(expected.getDate() + relativeOffset);
    lines.push(`  - name: ${yamlScalar(milestone.name)}`);
    lines.push(`    expected: ${formatLocalDate(expected)}`);
    lines.push(`    owner: ${yamlScalar(milestone.owner)}`);
  });

  return `${lines.join("\n")}\n`;
}

function yamlScalar(value) {
  const text = String(value ?? "");
  return JSON.stringify(text);
}

function isoDateFromOffset(dayOffset) {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);
  return formatLocalDate(base);
}

function isoDateTimeFromOffset(dayOffset) {
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return base.toISOString();
}

async function submitJourneyCreate(event) {
  event.preventDefault();
  if (!state.journeyDraft) {
    return;
  }
  if (state.journeyDraft.mode === "edit") {
    await submitJourneyEdit();
    return;
  }

  const product = state.journeyDraft.product.trim();
  const version = state.journeyDraft.version.trim();
  const secret = state.journeyDraft.secret.trim();

  if (!product || !version || !secret) {
    elements.journeyMessage.textContent = "Fill product, version, and the journey key.";
    return;
  }

  const customMilestones = state.journeyDraft.milestones.filter((item) => item.type === "custom");
  const incompleteCustom = customMilestones.find((item) => !item.name.trim() || !item.owner.trim());
  if (incompleteCustom) {
    elements.journeyMessage.textContent = "Each added milestone needs a name and owner.";
    state.journeyDraft.activeMilestoneId = incompleteCustom.id;
    renderJourneyDraft();
    return;
  }

  setStatus("Creating journey");
  try {
    const created = await request("/api/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, version, secret }),
    });

    const kickoff = state.journeyDraft.milestones.find((item) => item.type === "kickoff");
    const gaRelease = state.journeyDraft.milestones.find((item) => item.type === "ga");
    const kickoffRecord = created.milestones.find((item) => item.name === "Kickoff");
    const gaRecord = created.milestones.find((item) => item.name === "GA Release");

    if (kickoff && kickoffRecord) {
      await request(`/api/milestones/${kickoffRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: kickoff.name,
          expected: formatCalendarDate(kickoff.expected),
          owner: kickoff.owner || "pm",
          email: kickoff.email?.trim() || null,
          note: kickoff.note?.trim() ? { content: kickoff.note.trim() } : null,
        }),
      });
    }

    if (gaRelease && gaRecord) {
      await request(`/api/milestones/${gaRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gaRelease.name,
          expected: formatCalendarDate(gaRelease.expected),
          owner: gaRelease.owner || "manager",
          email: gaRelease.email?.trim() || null,
          note: gaRelease.note?.trim() ? { content: gaRelease.note.trim() } : null,
        }),
      });
    }

    for (const milestone of customMilestones) {
      await request(`/api/releases/${created.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: milestone.name.trim(),
          expected: formatCalendarDate(milestone.expected),
          owner: milestone.owner.trim(),
          email: milestone.email?.trim() || null,
          note: milestone.note?.trim() ? { content: milestone.note.trim() } : null,
        }),
      });
    }

    await loadTimeline();
    closeJourneyDialog();
    setStatus("Journey created");
  } catch (error) {
    console.error(error);
    elements.journeyMessage.textContent = error.message;
    setStatus("Create failed");
  }
}

async function submitJourneyEdit() {
  if (!state.journeyDraft) {
    return;
  }
  const release = state.releases.find((item) => item.id === state.journeyDraft.releaseId);
  if (!release) {
    elements.journeyMessage.textContent = "Journey could not be found.";
    return;
  }
  if (state.journeyDraft.secret.trim() !== String(state.journeyDraft.expectedSecret || "").trim()) {
    elements.journeyMessage.textContent = "Enter the correct journey key to save changes.";
    return;
  }

  setStatus("Saving journey");
  try {
    const orderedDraftMilestones = [...state.journeyDraft.milestones].sort(
      (left, right) => new Date(left.expected).getTime() - new Date(right.expected).getTime(),
    );
    const releaseMilestoneIds = new Set(release.milestones.map((item) => item.id));
    const draftSourceIds = new Set(orderedDraftMilestones.map((item) => item.sourceId).filter(Boolean));

    for (const target of release.milestones) {
      if (!draftSourceIds.has(target.id)) {
        await request(`/api/milestones/${target.id}`, { method: "DELETE" });
      }
    }

    for (const draftMilestone of orderedDraftMilestones) {
      const payload = {
        name: draftMilestone.name.trim(),
        expected: formatCalendarDate(draftMilestone.expected),
        owner: draftMilestone.owner?.trim() || "",
        email: draftMilestone.email?.trim() || null,
        note: draftMilestone.note?.trim() ? { content: draftMilestone.note.trim() } : null,
      };
      if (draftMilestone.sourceId && releaseMilestoneIds.has(draftMilestone.sourceId)) {
        await request(`/api/milestones/${draftMilestone.sourceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        continue;
      }

      await request(`/api/releases/${release.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    await loadTimeline();
    closeJourneyDialog();
    setStatus("Journey saved");
  } catch (error) {
    console.error(error);
    elements.journeyMessage.textContent = error.message;
    setStatus("Journey could not be saved");
  }
}

async function submitImport(event) {
  event.preventDefault();
  const file = elements.importFile.files?.[0];
  const keepOriginal = elements.importKeepOriginal.checked;
  const shiftTimeline = elements.importShiftTimeline.checked;
  const kickoffDate = elements.importKickoffDate.value;

  if (!file) {
    elements.importMessage.textContent = "Choose a YAML blueprint.";
    return;
  }

  if (shiftTimeline && !kickoffDate) {
    elements.importMessage.textContent = "Choose the new kickoff date for the shifted timeline.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("keep_original", String(keepOriginal));
  formData.append("shift_timeline", String(shiftTimeline));
  if (shiftTimeline) {
    formData.append("new_kickoff_date", kickoffDate);
  }

  setStatus("Preparing journey");
  try {
    const blueprint = await request("/api/releases/import/preview", {
      method: "POST",
      body: formData,
    });
    const draft = createJourneyDraftFromBlueprint(blueprint);
    elements.importForm.reset();
    syncImportMode();
    closeImportDialog();
    openJourneyDialogFromDraft(draft);
    elements.journeyMessage.textContent = `${blueprint.product} ${blueprint.version} is ready to begin.`;
    setStatus("Journey prepared");
  } catch (error) {
    console.error(error);
    elements.importMessage.textContent = error.message;
    setStatus("Journey could not be prepared");
  }
}

function validateAckForm() {
  const milestone = getSelectedAckMilestone();
  const milestoneId = milestone?.id;
  const secret = elements.ackSecret.value.trim();
  const ackName = String(milestone?.owner || "").trim();
  setAckFieldState(elements.ackSecret);
  if (!milestoneId || !secret || !ackName) {
    if (!secret) {
      setAckFieldState(elements.ackSecret, "required");
    }
    elements.ackMessage.textContent = !secret
      ? "Enter the journey key to leave the mark."
      : !ackName
        ? "Set a keeper for this milestone before acknowledging it."
        : "No milestone selected.";
    resetAckConfirmationState();
    return null;
  }
  return { milestone, milestoneId, secret, ackName };
}

function armAckConfirmation() {
  const validation = validateAckForm();
  if (!validation) {
    return false;
  }
  if (!state.ackSubmitPendingConfirmation) {
    state.ackSubmitPendingConfirmation = true;
    state.ackSubmitConfirmationArmedAt = Date.now();
    elements.ackSubmitButton.disabled = true;
    syncAckSubmitButton();
    elements.ackMessage.textContent = "Press again to confirm this acknowledgement.";
    state.ackSubmitConfirmUnlockTimer = window.setTimeout(() => {
      state.ackSubmitConfirmUnlockTimer = null;
      if (!state.ackSubmitPendingConfirmation) {
        return;
      }
      elements.ackSubmitButton.disabled = false;
    }, 700);
    return false;
  }
  if (Date.now() - state.ackSubmitConfirmationArmedAt < 450) {
    elements.ackMessage.textContent = "Press once more to confirm.";
    return false;
  }
  return true;
}

async function submitAck(event) {
  event?.preventDefault?.();
  const validation = validateAckForm();
  if (!validation) {
    return;
  }
  const { milestoneId, secret, ackName } = validation;
  const release = getSelectedAckRelease();
  const note = elements.ackNote.value.trim();
  try {
    const ack = await request(`/api/milestones/${milestoneId}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        ack_name: ackName,
        note: note ? { content: note } : null,
      }),
    });
    elements.ackMessage.textContent = "Acknowledgement confirmed.";
    await loadTimeline();
    if (release) {
      state.ackContext = { releaseId: release.id, milestoneId };
    }
    const refreshed = getSelectedAckMilestone();
    elements.ackName.value = refreshed?.owner || ackName;
    elements.ackKeeperDisplay.textContent = refreshed?.owner || ackName || "No keeper set";
    elements.ackNote.value = "";
    syncAckFormState();
    setStatus("Acknowledged");
    closeAckDialog();
  } catch (error) {
    console.error(error);
    state.ackSubmitPendingConfirmation = false;
    state.ackSubmitConfirmationArmedAt = 0;
    syncAckSubmitButton();
    const message = error.message === "Invalid journey key."
      ? "The journey key did not match."
      : error.message;
    if (message === "The journey key did not match.") {
      setAckFieldState(elements.ackSecret, "mismatch");
    }
    elements.ackMessage.textContent = message;
    setStatus("Acknowledgement could not be recorded");
  }
}

function handleAckSubmitButtonClick() {
  if (!armAckConfirmation()) {
    return;
  }
  submitAck();
}

function normalizeObservationMetricsInput(doneRaw, totalRaw, blockedRaw) {
  if (!doneRaw && !totalRaw && !blockedRaw) {
    return null;
  }
  return {
    done: Number(doneRaw || 0),
    total: Number(totalRaw || 0),
    blocked: Number(blockedRaw || 0),
  };
}

function areMetricsEqual(left, right) {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.done === right.done && left.total === right.total && left.blocked === right.blocked;
}

async function submitObservation(event) {
  event.preventDefault();
  const context = state.observationContext;
  const release = getObservationRelease();
  if (!context || !release) {
    elements.observationMessage.textContent = "Open a journey observation first.";
    return;
  }

  const starlight = Number(elements.observationStarlight.value);
  const today = formatLocalDate(new Date());
  const observedOn = today;
  const whisper = elements.observationWhisper.value.trim();
  const detailContent = elements.observationDetail.value;
  const stormsRaw = elements.observationStorms.value.trim();
  const doneRaw = elements.observationDone.value.trim();
  const totalRaw = elements.observationTotal.value.trim();
  const blockedRaw = elements.observationBlocked.value.trim();
  const metrics = normalizeObservationMetricsInput(doneRaw, totalRaw, blockedRaw);
  const initialMetrics = normalizeStarlightMetrics(context.current?.metrics);
  const observationChanged = (
    starlight !== (context.current?.starlight ?? 0) ||
    observedOn !== (context.current?.observed_on || context.fields.observedOn) ||
    whisper !== (context.current?.whisper || "") ||
    detailContent !== (context.current?.detail?.content || "") ||
    !areMetricsEqual(metrics, initialMetrics)
  );

  if (observationChanged) {
    if (!Number.isFinite(starlight) || starlight < 0 || starlight > 100) {
      elements.observationMessage.textContent = "Starlight must stay between 0 and 100.";
      return;
    }
    if (!whisper) {
      elements.observationMessage.textContent = "Today’s Reading is required.";
      return;
    }
  }

  if (context.initialStorms !== null && stormsRaw === "") {
    elements.observationMessage.textContent = "Current Storms can stay blank only while they are still unknown.";
    return;
  }

  const storms = stormsRaw === "" ? null : Number(stormsRaw);
  if (storms !== null && (!Number.isFinite(storms) || storms < 0)) {
    elements.observationMessage.textContent = "Current Storms must be zero or higher.";
    return;
  }
  const stormsChanged = storms !== context.initialStorms;

  if (!observationChanged && !stormsChanged) {
    elements.observationMessage.textContent = "Nothing changed yet.";
    return;
  }

  setStatus("Recording observation");
  elements.observationSaveButton.disabled = true;
  try {
    const results = await Promise.allSettled([
      observationChanged
        ? request(`/api/releases/${release.id}/observation`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            starlight,
            whisper,
            detail: {
              type: "markdown",
              content: detailContent,
            },
            metrics,
            observed_on: observedOn,
          }),
        })
        : Promise.resolve(null),
      stormsChanged && storms !== null
        ? request(`/api/releases/${release.id}/bug-snapshots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            open_bug_count: storms,
          }),
        })
        : Promise.resolve(null),
    ]);

    const [observationResult, stormsResult] = results;
    const messages = [];
    const failures = [];
    let didSave = false;

    if (observationChanged) {
      if (observationResult.status === "fulfilled") {
        didSave = true;
        state.observationByRelease[release.id] = normalizeObservationWorkspace(observationResult.value, release);
        messages.push("Starlight updated.");
      } else {
        failures.push(`Starlight could not be updated: ${observationResult.reason.message}`);
      }
    }

    if (stormsChanged && storms !== null) {
      if (stormsResult.status === "fulfilled") {
        didSave = true;
        messages.push("Storms updated.");
      } else {
        failures.push(`Storms could not be updated: ${stormsResult.reason.message}`);
      }
    }

    if (didSave) {
      await loadTimeline();
      const refreshedRelease = getReleaseById(release.id);
      if (refreshedRelease) {
        state.observationContext = buildObservationContext(
          refreshedRelease,
          state.observationByRelease[release.id] || buildObservationWorkspaceFromRelease(refreshedRelease),
        );
        renderObservationWorkspace();
      }
    }

    if (didSave && !failures.length) {
      elements.observationMessage.textContent = "";
      closeObservationDialog();
      setStatus("Observation recorded");
      return;
    }

    elements.observationMessage.textContent = [...messages, ...failures].join(" ");
    if (failures.length && !didSave) {
      setStatus("Observation could not be recorded");
    } else {
      setStatus(failures.length ? "Observation partially recorded" : "Observation recorded");
    }
  } catch (error) {
    console.error(error);
    elements.observationMessage.textContent = error.message;
    setStatus("Observation could not be recorded");
  } finally {
    elements.observationSaveButton.disabled = false;
  }
}

function updateBoardSummary() {
  const releaseCount = state.releases.length;
  const milestoneCount = state.releases.reduce((sum, release) => sum + release.milestones.length, 0);
  const pendingCount = state.releases.reduce(
    (sum, release) => sum + release.milestones.filter((item) => !item.acked_at).length,
    0,
  );
  const { endedReleases, upcomingReleases } = getBoardReleaseGroups(state.releases);
  const foldedNotes = [];
  if (endedReleases.length && !state.nowToggleExpanded.top) {
    foldedNotes.push(`${endedReleases.length} ended folded above`);
  }
  if (upcomingReleases.length && !state.nowToggleExpanded.bottom) {
    foldedNotes.push(`${upcomingReleases.length} not started folded below`);
  }
  const collapsedNote = foldedNotes.length ? ` • ${foldedNotes.join(" • ")}` : "";
  const prefix = state.pageScope.mode === "galaxy"
    ? `${state.pageScope.label || formatGalaxyTitle(state.pageScope.galaxySlug)} galaxy • `
    : "";
  elements.boardSummary.textContent = `${prefix}${releaseCount} journeys • ${milestoneCount} milestones • ${pendingCount} pending${collapsedNote}`;
}

function getBoardReleaseGroups(releases) {
  const sorted = getSortedReleasesForBoard(releases);
  const endedReleases = [];
  const activeReleases = [];
  const upcomingReleases = [];

  sorted.forEach((release) => {
    if (isReleaseEndedBeyondFoldWindow(release)) {
      endedReleases.push(release);
    } else if (isReleaseFutureKickoffBeyondFoldWindow(release)) {
      upcomingReleases.push(release);
    } else {
      activeReleases.push(release);
    }
  });

  return { endedReleases, activeReleases, upcomingReleases };
}

function getSortedReleasesForBoard(releases) {
  if (state.perspective === "destination") {
    return [...releases].sort((left, right) => {
      const leftTime = getReleaseDestinationTime(left);
      const rightTime = getReleaseDestinationTime(right);
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return `${left.product} ${left.version}`.localeCompare(`${right.product} ${right.version}`);
    });
  }

  return [...releases].sort((left, right) => {
    const leftTime = getReleaseSortTime(left);
    const rightTime = getReleaseSortTime(right);
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return `${left.product} ${left.version}`.localeCompare(`${right.product} ${right.version}`);
  });
}

function getOrderedMilestones(release) {
  return [...release.milestones].sort((left, right) => (
    dateishTime(left.expected) - dateishTime(right.expected)
  ));
}

function getReleaseSortTime(release) {
  const milestones = getOrderedMilestones(release);
  const actionable = milestones.find((item) => !item.acked_at) || milestones.at(-1);
  return actionable ? dateishTime(actionable.expected) : Number.MAX_SAFE_INTEGER;
}

function getReleaseDestinationTime(release) {
  const milestones = getOrderedMilestones(release);
  const finalMilestone = milestones.at(-1);
  return finalMilestone ? dateishTime(finalMilestone.expected) : Number.MIN_SAFE_INTEGER;
}

function getReleaseFinalMilestone(release) {
  const milestones = getOrderedMilestones(release);
  return milestones.at(-1) || null;
}

function getReleaseKickoffTime(release) {
  const milestones = getOrderedMilestones(release);
  return milestones[0] ? dateishTime(milestones[0].expected) : Number.NaN;
}

function todayNoonTime() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.getTime();
}

function daysBetween(leftTime, rightTime) {
  return Math.floor((leftTime - rightTime) / (24 * 60 * 60 * 1000));
}

function isReleaseEndedBeyondFoldWindow(release) {
  const finalMilestone = getReleaseFinalMilestone(release);
  if (!finalMilestone?.acked_at) {
    return false;
  }

  const daysSinceEnd = daysBetween(todayNoonTime(), dateishTime(finalMilestone.expected));
  return daysSinceEnd > state.journeyFoldDays;
}

function isReleaseFutureKickoffBeyondFoldWindow(release) {
  const kickoffTime = getReleaseKickoffTime(release);
  if (!Number.isFinite(kickoffTime)) {
    return false;
  }

  const daysUntilKickoff = daysBetween(kickoffTime, todayNoonTime());
  return daysUntilKickoff > state.journeyFoldDays;
}

function buildTimelineScale(releases, nowRatio = BOARD_NOW_RATIO) {
  const oneDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayTime = today.getTime();
  const totalDays = state.horizonMonths * 30;
  const pastDays = totalDays * nowRatio;
  const futureDays = totalDays - pastDays;
  const startDate = new Date(todayTime - (pastDays * oneDay));
  const endDate = new Date(todayTime + (futureDays * oneDay));
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const range = Math.max(endTime - startTime, oneDay);

  return {
    startTime,
    endTime,
    range,
    totalDays,
    nowRatio,
    todayTime,
    todayPercent: nowRatio * 100,
  };
}

function syncSegmentedSelector(container, value, dataAttribute) {
  if (!container) {
    return;
  }

  const options = [...container.querySelectorAll(".segment-option")];
  const activeIndex = options.findIndex((option) => option.dataset[dataAttribute] === value);
  container.style.setProperty("--active-index", String(Math.max(activeIndex, 0)));
  options.forEach((option, index) => {
    const isActive = index === activeIndex;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });
}

function applyBoardControls() {
  state.timeline = buildTimelineScale(state.releases);
  syncBoardControls();
  renderPreservingViewport();
}

function syncBoardControls() {
  syncSegmentedSelector(elements.horizonSelector, String(state.horizonMonths), "horizonMonths");
  syncSegmentedSelector(elements.perspectiveSelector, state.perspective, "perspective");
}

function selectHorizon(months) {
  if (!months || months === state.horizonMonths) {
    return;
  }
  state.horizonMonths = months;
  applyBoardControls();
}

function selectPerspective(perspective) {
  if (!perspective || perspective === state.perspective) {
    return;
  }
  state.perspective = perspective;
  applyBoardControls();
}

function formatShortDate(value) {
  const date = parseDateish(value);
  if (state.dateFormat === "iso") {
    return formatCalendarDate(date);
  }
  if (state.dateFormat === "day-first") {
    return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function parseDateish(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function dateishTime(value) {
  return parseDateish(value).getTime();
}

function formatCalendarDate(value) {
  const date = parseDateish(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLocalDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const date = parseDateish(value);
  if (state.dateFormat === "iso") {
    return formatCalendarDate(date);
  }
  if (state.dateFormat === "day-first") {
    return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  const date = parseDateish(value);
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatDate(date)}, ${time}`;
}

function getDateFormatPreference() {
  try {
    const saved = window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
    if (Object.hasOwn(DATE_FORMAT_OPTIONS, saved)) {
      return saved;
    }
  } catch (error) {
    console.warn("Date format preference could not be read.", error);
  }
  return "storybook";
}

function setDateFormatPreference(format) {
  if (!Object.hasOwn(DATE_FORMAT_OPTIONS, format)) {
    return;
  }
  state.dateFormat = format;
  try {
    window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, format);
  } catch (error) {
    console.warn("Date format preference could not be saved.", error);
  }
}

function syncEngineDateFormat() {
  if (!elements.engineDateFormatLabel) {
    return;
  }
  elements.engineDateFormatLabel.textContent = DATE_FORMAT_OPTIONS[state.dateFormat].label;
  elements.engineDateFormatMenu?.querySelectorAll("[data-format]").forEach((item) => {
    const isSelected = item.dataset.format === state.dateFormat;
    item.classList.toggle("is-selected", isSelected);
    item.setAttribute("aria-current", isSelected ? "true" : "false");
  });
}

function setEngineDateFormatMenuOpen(isOpen) {
  elements.engineDateFormatMenu?.classList.toggle("hidden", !isOpen);
  elements.engineDateFormatButton?.setAttribute("aria-expanded", String(isOpen));
}

function applyDateFormatPreference(format) {
  setDateFormatPreference(format);
  syncEngineDateFormat();
  render(false);
  if (state.journeyDraft) {
    renderJourneyDraft();
    renderJourneyPopover();
  }
  if (elements.ackDialog.open) {
    syncAckFormState();
  }
  if (elements.observationDialog.open) {
    renderObservationWorkspace();
  }
}

function slugify(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
}

function syncImportMode() {
  const shouldShift = elements.importShiftTimeline.checked;
  elements.importKickoffLabel.classList.toggle("hidden", !shouldShift);
  elements.importKickoffDate.disabled = !shouldShift;
  if (!shouldShift) {
    elements.importKickoffDate.value = "";
  }
}

function syncImportFileSummary() {
  if (!elements.importFileSummary) {
    return;
  }
  const file = elements.importFile?.files?.[0];
  elements.importFileSummary.textContent = file ? file.name : "No page chosen yet";
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

elements.seedButton.addEventListener("click", seedDemo);
elements.newReleaseButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleJourneyActionMenu();
});
elements.newJourneyOption.addEventListener("click", () => {
  setJourneyActionMenuOpen(false);
  openJourneyDialog();
});
elements.importJourneyOption.addEventListener("click", () => {
  setJourneyActionMenuOpen(false);
  openImportDialog();
});
elements.emptyNewReleaseButton.addEventListener("click", () => openJourneyDialog());
elements.closeJourneyDialogButton.addEventListener("click", closeJourneyDialog);
elements.closeImportDialogButton.addEventListener("click", closeImportDialog);
elements.journeyForm.addEventListener("submit", submitJourneyCreate);
elements.journeyAddMilestone.addEventListener("click", addJourneyMilestone);
elements.journeyMilestonePopover.addEventListener("submit", (event) => event.preventDefault());
elements.journeyMilestoneMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  if (elements.journeyMilestoneMenu.disabled) {
    return;
  }
  elements.journeyMilestoneMenuPanel.classList.toggle("hidden");
});
elements.journeyMilestoneDelete.addEventListener("click", deleteJourneyMilestone);
elements.journeyProduct.addEventListener("input", () => {
  if (!state.journeyDraft) {
    return;
  }
  state.journeyDraft.product = elements.journeyProduct.value;
});
elements.journeyVersion.addEventListener("input", () => {
  if (!state.journeyDraft) {
    return;
  }
  state.journeyDraft.version = elements.journeyVersion.value;
});
elements.journeySecret.addEventListener("input", () => {
  if (!state.journeyDraft) {
    return;
  }
  state.journeyDraft.secret = elements.journeySecret.value;
});
elements.journeyMilestoneName.addEventListener("input", () => updateJourneyActiveMilestone("name", elements.journeyMilestoneName.value));
elements.journeyMilestoneOwner.addEventListener("input", () => updateJourneyActiveMilestone("owner", elements.journeyMilestoneOwner.value));
elements.journeyMilestoneNote.addEventListener("input", () => updateJourneyActiveMilestone("note", elements.journeyMilestoneNote.value));
elements.journeyMilestoneEmail.addEventListener("input", () => updateJourneyActiveMilestone("email", elements.journeyMilestoneEmail.value));
elements.closeAckDialogButton.addEventListener("click", closeAckDialog);
elements.closeObservationDialogButton.addEventListener("click", closeObservationDialog);
elements.ackKeeperChangeButton?.addEventListener("click", () => {
  const release = getSelectedAckRelease();
  const milestone = getSelectedAckMilestone();
  closeAckDialog();
  openJourneyDialogForMilestone(release, milestone?.id, "keeper");
});
elements.engineButton.addEventListener("click", openEngineDialog);
elements.closeEngineDialogButton.addEventListener("click", closeEngineDialog);
elements.engineDateFormatButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = elements.engineDateFormatMenu?.classList.contains("hidden");
  setEngineDateFormatMenuOpen(Boolean(isOpen));
});
elements.engineDateFormatMenu?.querySelectorAll("[data-format]").forEach((item) => {
  item.addEventListener("click", (event) => {
    event.stopPropagation();
    applyDateFormatPreference(item.dataset.format);
    setEngineDateFormatMenuOpen(false);
  });
});
elements.engineSmtpTestForm.addEventListener("submit", submitEngineSmtpTest);
elements.importForm.addEventListener("submit", submitImport);
elements.observationForm.addEventListener("submit", submitObservation);
elements.observationDetailPreviewToggle?.addEventListener("click", () => {
  state.observationDetailPreview = !state.observationDetailPreview;
  syncObservationDetailPreview();
});
elements.ackSecret.addEventListener("input", () => {
  if (elements.ackMessage.textContent) {
    elements.ackMessage.textContent = "";
  }
  setAckFieldState(elements.ackSecret);
  resetAckConfirmationState();
});
elements.ackNote.addEventListener("input", () => {
  if (elements.ackMessage.textContent) {
    elements.ackMessage.textContent = "";
  }
  resetAckConfirmationState();
});
[
  elements.observationStarlight,
  elements.observationStorms,
  elements.observationWhisper,
  elements.observationDetail,
  elements.observationDone,
  elements.observationTotal,
  elements.observationBlocked,
].forEach((field) => {
  field?.addEventListener("input", () => {
    if (elements.observationMessage.textContent) {
      elements.observationMessage.textContent = "";
    }
    if (field === elements.observationDetail && state.observationDetailPreview) {
      renderObservationDetailPreview();
    }
  });
});
elements.observationStarlight.addEventListener("input", () => {
  syncObservationStarlightReadout(elements.observationStarlight.value);
});
elements.observationStorms.addEventListener("input", () => {
  syncObservationStormSummary(elements.observationStorms.value);
});
elements.importKeepOriginal.addEventListener("change", syncImportMode);
elements.importShiftTimeline.addEventListener("change", syncImportMode);
elements.importFile?.addEventListener("change", syncImportFileSummary);
elements.horizonSelector?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-horizon-months]");
  if (!option) {
    return;
  }
  selectHorizon(Number(option.dataset.horizonMonths));
});
elements.nowToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => toggleNowControl(toggle.dataset.nowToggle));
});
elements.perspectiveSelector?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-perspective]");
  if (!option) {
    return;
  }
  selectPerspective(option.dataset.perspective);
});
elements.importDialog.addEventListener("click", (event) => {
  if (event.target === elements.importDialog) {
    closeImportDialog();
  }
});
elements.importDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeImportDialog();
});
elements.ackDialog.addEventListener("click", (event) => {
  if (event.target === elements.ackDialog) {
    closeAckDialog();
  }
});
elements.observationDialog.addEventListener("click", (event) => {
  if (event.target === elements.observationDialog) {
    closeObservationDialog();
  }
});
elements.observationDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeObservationDialog();
});
elements.engineDialog.addEventListener("click", (event) => {
  if (event.target === elements.engineDialog) {
    closeEngineDialog();
  }
});
elements.engineDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeEngineDialog();
});
elements.journeyDialog.addEventListener("click", (event) => {
  if (event.target === elements.journeyDialog) {
    closeJourneyDialog();
  }
});
elements.journeyDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeJourneyDialog();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".page-note-shell")) {
    setJourneyActionMenuOpen(false);
  }
  if (!event.target.closest(".release-menu-shell")) {
    closeReleaseMenu();
  }
  if (!event.target.closest(".engine-date-format-field")) {
    setEngineDateFormatMenuOpen(false);
  }
  if (state.journeyDraft?.activeMilestoneId) {
    const clickedInsideJourneyEditor = event.target.closest("#journey-milestone-popover, .journey-milestone-hit, #journey-add-milestone");
    if (!clickedInsideJourneyEditor) {
      elements.journeyMilestoneMenuPanel.classList.add("hidden");
      closeJourneyMilestoneEditor();
    }
  }
  if (
    event.target.closest(
      "button, input, select, textarea, a, dialog, .release-menu, .release-menu-shell, .milestone-marker, .drag-overlay",
    )
  ) {
    return;
  }
  if (elements.importDialog.open || elements.ackDialog.open) {
    return;
  }
  const currentScrollX = window.scrollX;
  const currentScrollY = window.scrollY;
  toggleAllReleaseDates();
  setTimeout(() => {
    window.scrollTo(currentScrollX, currentScrollY);
  }, 0);
});
document.addEventListener("pointermove", (event) => {
  if (state.journeyDraft?.selectionAnchor) {
    updateJourneySelection(event.clientX, event.clientY);
  }
  if (state.journeyDraft?.dragMilestoneId) {
    updateJourneyDrag(event.clientX);
  }
  if (state.drag) {
    updateMilestoneDrag(event.clientX);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.observationDialog.open) {
    closeObservationDialog();
    return;
  }
  if (event.key === "Escape" && elements.journeyDialog.open) {
    if (state.journeyDraft?.activeMilestoneId) {
      elements.journeyMilestoneMenuPanel.classList.add("hidden");
      closeJourneyMilestoneEditor();
      return;
    }
    closeJourneyDialog();
  }
});
document.addEventListener("pointerup", () => {
  if (state.journeyDraft?.selectionAnchor) {
    finishJourneySelection();
  }
  if (state.journeyDraft?.dragMilestoneId || state.journeyDraft?.dragCandidateMilestoneId) {
    finishJourneyDrag();
  }
  if (state.drag) {
    finishMilestoneDrag();
  }
});
window.addEventListener("resize", () => {
  if (state.releases.length) {
    state.timeline = buildTimelineScale(state.releases);
    render();
  }
});
window.addEventListener("scroll", positionStoryGuides, { passive: true });
const visualViewportRef = window.visualViewport;
const handleVisualViewportChange = () => positionStoryGuides();
if (visualViewportRef) {
  visualViewportRef.addEventListener("resize", handleVisualViewportChange, { passive: true });
  visualViewportRef.addEventListener("scroll", handleVisualViewportChange, { passive: true });
  window.addEventListener("beforeunload", () => {
    visualViewportRef.removeEventListener("resize", handleVisualViewportChange);
    visualViewportRef.removeEventListener("scroll", handleVisualViewportChange);
  }, { once: true });
}
async function init() {
  await loadAppConfig();
  syncBoardControls();
  await loadTimeline();
}

syncNowControls();
syncImportMode();
syncImportFileSummary();
syncEngineDateFormat();
ensureAckActionsBound();
init();
