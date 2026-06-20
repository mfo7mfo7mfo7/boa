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
const BUG_WAVE_MANUAL_FIXTURES = {
  normalConvergence: [10, 30, 80, 50, 20],
  newPeakToday: [10, 30, 80, 90],
  lowRiskRelease: [0, 1, 2, 1, 0],
  noBugs: [0, 0, 0],
  flatHighRisk: [50, 50, 50, 50],
};

const state = {
  releases: [],
  timeline: null,
  pageScope: getPageScope(),
  journeyFoldDays: 15,
  horizonMonths: 3,
  perspective: "due-soon",
  journeyDraft: null,
  activeMenuReleaseId: null,
  expandedReleaseIds: new Set(),
  ackContext: null,
  editReleaseId: null,
  reminderReleaseId: null,
  pluginReleaseId: null,
  reminderByRelease: {},
  reminderSupport: "unknown",
  pluginCatalog: [],
  pluginCatalogSupport: "unknown",
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
  journeyForm: document.querySelector("#journey-form"),
  journeyProduct: document.querySelector("#journey-product"),
  journeyVersion: document.querySelector("#journey-version"),
  journeySecret: document.querySelector("#journey-secret"),
  journeyCreateButton: document.querySelector("#journey-create-button"),
  journeyMessage: document.querySelector("#journey-message"),
  journeyTimeline: document.querySelector("#journey-timeline"),
  journeyAddMilestone: document.querySelector("#journey-add-milestone"),
  journeyMilestonePopover: document.querySelector("#journey-milestone-popover"),
  journeyMilestoneName: document.querySelector("#journey-milestone-name"),
  journeyMilestoneOwner: document.querySelector("#journey-milestone-owner"),
  journeyMilestoneMenu: document.querySelector("#journey-milestone-menu"),
  journeyMilestoneMenuPanel: document.querySelector("#journey-milestone-menu-panel"),
  journeyMilestoneDelete: document.querySelector("#journey-milestone-delete"),
  horizonSelector: document.querySelector("#horizon-selector"),
  perspectiveSelector: document.querySelector("#perspective-selector"),
  seedButton: document.querySelector("#seed-button"),
  dialogSeedButton: document.querySelector("#dialog-seed-button"),
  newReleaseButton: document.querySelector("#new-release-button"),
  boardScope: document.querySelector("#board-scope"),
  journeyActionMenu: document.querySelector("#journey-action-menu"),
  newJourneyOption: document.querySelector("#new-journey-option"),
  importJourneyOption: document.querySelector("#import-journey-option"),
  emptyNewReleaseButton: document.querySelector("#empty-new-release-button"),
  statusPill: document.querySelector("#status-pill"),
  createForm: document.querySelector("#create-form"),
  createProduct: document.querySelector("#create-product"),
  createVersion: document.querySelector("#create-version"),
  createSecret: document.querySelector("#create-secret"),
  createMessage: document.querySelector("#create-message"),
  importForm: document.querySelector("#import-form"),
  importFile: document.querySelector("#import-file"),
  importKeepOriginal: document.querySelector("#import-keep-original"),
  importShiftTimeline: document.querySelector("#import-shift-timeline"),
  importKickoffLabel: document.querySelector("#import-kickoff-label"),
  importKickoffDate: document.querySelector("#import-kickoff-date"),
  importMessage: document.querySelector("#import-message"),
  ackDialog: document.querySelector("#ack-dialog"),
  closeAckDialogButton: document.querySelector("#close-ack-dialog-button"),
  ackForm: document.querySelector("#ack-form"),
  ackReleaseName: document.querySelector("#ack-release-name"),
  ackMilestoneName: document.querySelector("#ack-milestone-name"),
  ackDate: document.querySelector("#ack-date"),
  ackSecret: document.querySelector("#ack-secret"),
  ackNote: document.querySelector("#ack-note"),
  ackHint: document.querySelector("#ack-hint"),
  ackSubmitButton: document.querySelector("#ack-submit-button"),
  ackMessage: document.querySelector("#ack-message"),
  editForm: document.querySelector("#edit-form"),
  editRelease: document.querySelector("#edit-release"),
  editProduct: document.querySelector("#edit-product"),
  editVersion: document.querySelector("#edit-version"),
  editSecret: document.querySelector("#edit-secret"),
  editReleaseSaveButton: document.querySelector("#edit-release-save-button"),
  editMilestoneList: document.querySelector("#edit-milestone-list"),
  editNewName: document.querySelector("#edit-new-name"),
  editNewDate: document.querySelector("#edit-new-date"),
  editNewOwner: document.querySelector("#edit-new-owner"),
  editMessage: document.querySelector("#edit-message"),
  reminderRelease: document.querySelector("#reminder-release"),
  reminderRunButton: document.querySelector("#reminder-run-button"),
  reminderStatusPill: document.querySelector("#reminder-status-pill"),
  reminderSummary: document.querySelector("#reminder-summary"),
  reminderList: document.querySelector("#reminder-list"),
  reminderMessage: document.querySelector("#reminder-message"),
  pluginForm: document.querySelector("#plugin-form"),
  pluginRelease: document.querySelector("#plugin-release"),
  pluginRunner: document.querySelector("#plugin-runner"),
  pluginStatusPill: document.querySelector("#plugin-status-pill"),
  pluginDetails: document.querySelector("#plugin-details"),
  pluginFile: document.querySelector("#plugin-file"),
  pluginPayload: document.querySelector("#plugin-payload"),
  pluginMessage: document.querySelector("#plugin-message"),
  releaseTemplate: document.querySelector("#release-template"),
  composerDialog: document.querySelector("#composer-dialog"),
  closeDialogButton: document.querySelector("#close-dialog-button"),
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
  setStatus("Loading");
  try {
    const query = state.pageScope.mode === "galaxy"
      ? `?galaxy=${encodeURIComponent(state.pageScope.galaxySlug)}`
      : "";
    const timelinePayload = await request(`/api/timeline${query}`);
    state.releases = timelinePayload.map(normalizeTimelineRelease);
    if (state.pageScope.mode === "galaxy" && state.releases.length) {
      state.pageScope.label = state.releases[0].product;
    }
    state.timeline = buildTimelineScale(state.releases);
    render();
    await refreshOptionalSurfaces(state.editReleaseId || state.releases[0]?.id);
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

    fragment.querySelector(".release-product").textContent = release.product;
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
    drawRelease(
      svg,
      { ...release, milestones: orderedMilestones },
      state.timeline,
      palette,
      { detailCard },
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
  renderEditForm();
  renderReminderReleaseOptions();
  renderPluginReleaseOptions();
}

function renderReleaseStarlight(fragment, release) {
  const panel = fragment.querySelector(".starlight-summary");
  const starlight = release.starlight || null;
  if (!panel || !starlight) {
    panel?.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  fragment.querySelector(".starlight-whisper").textContent = starlight.whisper;
  const metricBits = summarizeStarlightMetrics(starlight.metrics);
  panel.title = metricBits ? `${starlight.whisper} • ${metricBits}` : starlight.whisper;
}

function describeStarlightState(value) {
  if (value >= 100) {
    return "Departure";
  }
  if (value >= 81) {
    return "Ready";
  }
  if (value >= 61) {
    return "Advancing";
  }
  if (value >= 41) {
    return "Preparing";
  }
  if (value >= 21) {
    return "Building";
  }
  return "Gathering";
}

function getPageScope() {
  const pathname = window.location.pathname.replace(/\/+$/g, "") || "/";
  if (pathname === "/") {
    return {
      mode: "universe",
      galaxySlug: null,
      label: "All releases",
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
    label: "All releases",
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
    elements.emptyEyebrow.textContent = "No release yet";
    elements.emptyTitle.textContent = "The sky is waiting for its first journey.";
    elements.emptyBody.textContent = "When the first release arrives, Boa will begin tracing its horizon.";
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
    : "No releases map to this galaxy yet. Return to the full universe to keep traveling.";
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
    milestones: Array.isArray(release.milestones) ? release.milestones.map((milestone) => ({ ...milestone })) : [],
    bug_snapshots: Array.isArray(release.bug_snapshots) ? release.bug_snapshots.map((snapshot) => ({ ...snapshot })) : [],
    starlight: normalizeStarlightStatus(release.starlight),
    starlight_trail: Array.isArray(release.starlight_trail)
      ? release.starlight_trail.map(normalizeStarlightEvent)
      : [],
  };
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

function renderEditForm(selectedReleaseId) {
  const currentReleaseId = selectedReleaseId ? String(selectedReleaseId) : (
    state.editReleaseId ? String(state.editReleaseId) : elements.editRelease.value
  );
  elements.editRelease.innerHTML = "";

  state.releases.forEach((release) => {
    const option = document.createElement("option");
    option.value = String(release.id);
    option.textContent = `${release.product} ${release.version}`;
    elements.editRelease.appendChild(option);
  });

  if (!state.releases.length) {
    state.editReleaseId = null;
    elements.editMilestoneList.innerHTML = `<p class="summary-line">Bring in a release to shape its milestones here.</p>`;
    return;
  }

  if (currentReleaseId && state.releases.some((release) => String(release.id) === currentReleaseId)) {
    elements.editRelease.value = currentReleaseId;
  } else {
    elements.editRelease.value = String(state.releases[0].id);
  }

  state.editReleaseId = Number(elements.editRelease.value);
  const release = getSelectedEditRelease();
  if (release) {
    elements.editProduct.value = release.product;
    elements.editVersion.value = release.version;
    elements.editSecret.value = release.secret || "";
  }
  renderMilestoneEditors();
}

function renderReminderReleaseOptions(selectedReleaseId) {
  const currentReleaseId = selectedReleaseId ? String(selectedReleaseId) : (
    state.reminderReleaseId ? String(state.reminderReleaseId) : elements.reminderRelease.value
  );
  elements.reminderRelease.innerHTML = "";

  state.releases.forEach((release) => {
    const option = document.createElement("option");
    option.value = String(release.id);
    option.textContent = `${release.product} ${release.version}`;
    elements.reminderRelease.appendChild(option);
  });

  if (!state.releases.length) {
    state.reminderReleaseId = null;
    renderReminderPanel();
    return;
  }

  if (currentReleaseId && state.releases.some((release) => String(release.id) === currentReleaseId)) {
    elements.reminderRelease.value = currentReleaseId;
  } else {
    elements.reminderRelease.value = String(state.releases[0].id);
  }

  state.reminderReleaseId = Number(elements.reminderRelease.value);
  renderReminderPanel();
}

function renderPluginReleaseOptions(selectedReleaseId) {
  const currentReleaseId = selectedReleaseId ? String(selectedReleaseId) : (
    state.pluginReleaseId ? String(state.pluginReleaseId) : elements.pluginRelease.value
  );
  elements.pluginRelease.innerHTML = "";

  state.releases.forEach((release) => {
    const option = document.createElement("option");
    option.value = String(release.id);
    option.textContent = `${release.product} ${release.version}`;
    elements.pluginRelease.appendChild(option);
  });

  if (!state.releases.length) {
    state.pluginReleaseId = null;
    renderPluginPanel();
    return;
  }

  if (currentReleaseId && state.releases.some((release) => String(release.id) === currentReleaseId)) {
    elements.pluginRelease.value = currentReleaseId;
  } else {
    elements.pluginRelease.value = String(state.releases[0].id);
  }

  state.pluginReleaseId = Number(elements.pluginRelease.value);
  renderPluginPanel();
}

function renderMilestoneEditors() {
  const release = getSelectedEditRelease();
  elements.editMilestoneList.innerHTML = "";

  if (!release) {
    elements.editMilestoneList.innerHTML = `<p class="summary-line">No release selected.</p>`;
    return;
  }

  release.milestones.forEach((milestone) => {
    const card = document.createElement("section");
    card.className = "milestone-editor";
    card.innerHTML = `
      <div class="milestone-editor-grid">
        <label>
          Name
          <input type="text" data-field="name" value="${escapeHtml(milestone.name)}">
        </label>
        <label>
          Expected
          <input type="date" data-field="expected" value="${milestone.expected}">
        </label>
        <label>
          Owner
          <input type="text" data-field="owner" value="${escapeHtml(milestone.owner)}">
        </label>
      </div>
      <div class="milestone-editor-actions">
        <span class="milestone-state">${milestone.acked_at ? `Acknowledged ${formatDateTime(milestone.acked_at)}` : "Pending acknowledgment"}</span>
        <div>
          <button class="ghost-button" type="button" data-action="save">Save</button>
          <button class="text-button" type="button" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="save"]').addEventListener("click", () => saveMilestone(milestone.id, card));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteMilestone(milestone.id, milestone.name));
    elements.editMilestoneList.appendChild(card);
  });
}

function renderReminderPanel() {
  const releaseId = state.reminderReleaseId;
  const reminderState = releaseId ? state.reminderByRelease[releaseId] : null;

  if (!state.releases.length) {
    elements.reminderStatusPill.textContent = "Waiting";
    elements.reminderSummary.textContent = "Bring in a release to inspect reminder state.";
    elements.reminderList.innerHTML = "";
    elements.reminderMessage.textContent = "";
    return;
  }

  if (!reminderState) {
    elements.reminderStatusPill.textContent = state.reminderSupport === "missing" ? "Unavailable" : "Checking";
    elements.reminderSummary.textContent = state.reminderSupport === "missing"
      ? "This backend has not exposed reminder state endpoints yet."
      : "Looking up reminder state for the selected release.";
    elements.reminderList.innerHTML = "";
    return;
  }

  elements.reminderStatusPill.textContent = reminderState.label;
  elements.reminderSummary.textContent = reminderState.summary;
  elements.reminderList.innerHTML = "";
  elements.reminderMessage.textContent = reminderState.message || "";

  reminderState.items.forEach((item) => {
    const row = document.createElement("section");
    row.className = "signal-item";
    row.innerHTML = `
      <div class="signal-topline">
        <strong class="signal-name">${escapeHtml(item.name)}</strong>
        <span class="signal-badge ${item.badgeClass}">${escapeHtml(item.badge)}</span>
      </div>
      <p class="signal-meta">${escapeHtml(item.meta)}</p>
    `;
    elements.reminderList.appendChild(row);
  });
}

function renderPluginPanel() {
  renderPluginRunnerOptions();

  if (!state.releases.length) {
    elements.pluginStatusPill.textContent = "Waiting";
    elements.pluginDetails.textContent = "Bring in a release to try a bug snapshot import plugin.";
    elements.pluginMessage.textContent = "";
    return;
  }

  if (state.pluginCatalogSupport === "missing") {
    elements.pluginStatusPill.textContent = "Unavailable";
    elements.pluginDetails.textContent = "This backend has not exposed a bug snapshot plugin contract yet.";
    return;
  }

  if (state.pluginCatalogSupport === "error") {
    elements.pluginStatusPill.textContent = "Error";
    elements.pluginDetails.textContent = "Plugin discovery hit a network or API error.";
    return;
  }

  if (state.pluginCatalogSupport === "loading") {
    elements.pluginStatusPill.textContent = "Checking";
    elements.pluginDetails.textContent = "Looking for plugin runners that can ingest bug snapshots.";
    return;
  }

  const plugin = getSelectedPlugin();
  elements.pluginStatusPill.textContent = plugin ? "Ready" : "No runner";

  if (!plugin) {
    elements.pluginDetails.textContent = "No bug snapshot plugin was published by this backend.";
    return;
  }

  elements.pluginDetails.innerHTML = `
    <div class="plugin-detail-line">
      <strong>${escapeHtml(plugin.name)}</strong>
      <span class="signal-badge">${escapeHtml(plugin.contractLabel)}</span>
    </div>
    <p class="plugin-detail-copy">${escapeHtml(plugin.description)}
${plugin.endpoint ? `\nEndpoint ${plugin.endpoint}` : ""}
${"\nPayload { open_bug_count, signal_type? }"}</p>
  `;
}

function syncAckFormState() {
  const milestone = getSelectedAckMilestone();
  const release = getSelectedAckRelease();
  if (!milestone) {
    elements.ackNote.value = "";
    elements.ackReleaseName.textContent = "No release selected";
    elements.ackMilestoneName.textContent = "";
    elements.ackDate.value = formatLocalDate(new Date());
    elements.ackSubmitButton.textContent = "Acknowledge";
    elements.ackHint.textContent = "Choose a milestone to acknowledge or update its note.";
    return;
  }

  elements.ackReleaseName.textContent = release ? `${release.product} ${release.version}` : "";
  elements.ackMilestoneName.textContent = milestone.name;
  elements.ackNote.value = milestone.ack_note || "";
  elements.ackDate.value = milestone.acked_at ? formatCalendarDate(milestone.acked_at) : formatLocalDate(new Date());
  if (milestone.acked_at) {
    elements.ackSubmitButton.textContent = "Save note";
    elements.ackHint.textContent = `Acknowledged ${formatDateTime(milestone.acked_at)}. Secret is still required to edit the note.`;
  } else {
    elements.ackSubmitButton.textContent = "Acknowledge";
    elements.ackHint.textContent = "Today will be recorded once the release secret is verified.";
  }
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
    const expectedTime = dateishTime(milestone.expected);
    const ackTime = milestone.acked_at ? dateishTime(milestone.acked_at) : null;
    const isLateAck = typeof ackTime === "number" && ackTime > expectedTime;
    const isActionablePending = !milestone.acked_at && milestone.id === actionablePendingId;
    const shouldRenderAckMarker = milestone.acked_at || isActionablePending;
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
      formatCalendarDate(milestone.expected),
    ]));
    milestoneGroup.appendChild(expectedIcon);
    milestoneGroup.appendChild(labelTextNode(milestone.name, x, baselineY - 22, "rgba(47, 55, 70, 0.88)", 12, "middle", "marker-label milestone-name milestone-expected-label"));
    milestoneGroup.appendChild(labelTextNode(formatCalendarDate(milestone.expected), x + 12, baselineY - 9, "var(--muted)", 10, "start", "marker-date date-text milestone-date milestone-expected"));

    const lowerAnchor = {
      y: baselineY + 15,
      fill: markerColor,
      label: milestone.acked_at ? formatCalendarDate(milestone.acked_at) : "Pending",
      tooltip: [milestone.acked_at ? formatCalendarDate(milestone.acked_at) : "Pending"],
      className: milestone.acked_at
        ? (isLateAck ? "overdue-marker" : "ack-marker")
        : "pending-marker",
    };

    if (shouldRenderAckMarker) {
      const lowerIcon = svgNode("polygon", {
        points: `${x},${lowerAnchor.y - 12} ${x - 7},${lowerAnchor.y} ${x + 7},${lowerAnchor.y}`,
        fill: lowerAnchor.fill,
        class: lowerAnchor.className,
        cursor: isActionablePending ? "pointer" : "default",
      });
      lowerIcon.appendChild(svgTitle(lowerAnchor.tooltip));
      if (isActionablePending) {
        lowerIcon.addEventListener("click", () => openAckDialog(release.id, milestone.id));
      }
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
    marker.setAttribute("aria-label", `Starlight ${event.starlight} on ${formatCalendarDate(event.date)}`);

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
  detailCard.querySelector(".starlight-detail-date").textContent = formatCalendarDate(event.date);
  detailCard.querySelector(".starlight-detail-whisper").textContent = event.whisper;
  renderStarlightMarkdown(body, event.detail?.content || "");

  if (event.metrics) {
    detailCard.querySelector(".starlight-detail-done").textContent = String(event.metrics.done);
    detailCard.querySelector(".starlight-detail-total").textContent = String(event.metrics.total);
    detailCard.querySelector(".starlight-detail-blocked").textContent = String(event.metrics.blocked);
    stats.classList.remove("hidden");
  } else {
    stats.classList.add("hidden");
  }

  const box = svg.viewBox.baseVal;
  const xPercent = (point.x / box.width) * 100;
  const yPercent = (point.y / box.height) * 100;
  detailCard.style.left = `${Math.min(Math.max(xPercent + 2, 8), 72)}%`;
  detailCard.style.top = `${Math.min(Math.max(yPercent - 18, 4), 58)}%`;
  detailCard.dataset.hovering = detailCard.dataset.hovering || "false";
  detailCard.classList.remove("hidden");
  detailCard.classList.remove("is-revealed");
  window.clearTimeout(detailCard._hideTimer);
  window.clearTimeout(detailCard._fadeTimer);
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

function renderStarlightMarkdown(container, markdown) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const blocks = safeMarkdownToBlocks(markdown);
  if (!blocks.length) {
    const paragraph = document.createElement("p");
    paragraph.textContent = markdown || "No night log recorded.";
    container.appendChild(paragraph);
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
      const list = document.createElement("ul");
      block.items.forEach((item) => {
        const li = document.createElement("li");
        appendInlineMarkdown(li, item);
        list.appendChild(li);
      });
      container.appendChild(list);
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
    blocks.push({ type: "list", items: list.slice() });
    list = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
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
    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      list.push(listMatch[1].trim());
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
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
    label.textContent = formatCalendarDate(projectedDate);
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

function createJourneyMilestone(name, expected, owner = "", type = "custom") {
  return {
    id: `journey-${Math.random().toString(36).slice(2, 10)}`,
    name,
    expected,
    owner,
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
      createJourneyMilestone("Kickoff", kickoff, "pm", "kickoff"),
      createJourneyMilestone("GA Release", ga, "manager", "ga"),
    ],
    activeMilestoneId: null,
    selectedMilestoneIds: [],
    dragMilestoneId: null,
    dragCandidateMilestoneId: null,
    dragStartX: null,
    dragMoved: false,
    dragGroupSnapshot: null,
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
      milestone.name === "Kickoff" ? "kickoff" : milestone.name === "GA Release" ? "ga" : "custom",
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
      milestone.name === "Kickoff"
        ? "kickoff"
        : milestone.name === "GA Release" || index === milestones.length - 1 ? "ga" : "custom",
    ));
  draft.activeMilestoneId = null;
  return draft;
}

function openJourneyDialog(release = null) {
  state.journeyDraft = release ? createJourneyDraftFromRelease(release) : createInitialJourneyDraft();
  showJourneyDialog();
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
  elements.journeyKicker.textContent = isEditMode ? "Edit Journey" : "Begin a Journey";
  elements.journeyTitle.textContent = "Blueprint Editor";
  elements.journeyProduct.value = state.journeyDraft.product;
  elements.journeyVersion.value = state.journeyDraft.version;
  elements.journeySecret.value = state.journeyDraft.secret;
  elements.journeyProduct.disabled = isEditMode;
  elements.journeyVersion.disabled = isEditMode;
  elements.journeySecret.placeholder = isEditMode ? "Enter release secret to save" : "boa-264";
  elements.journeyCreateButton.textContent = isEditMode ? "Save" : "Done";
  elements.journeyAddMilestone.classList.toggle("hidden", isEditMode);
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
  elements.journeyMilestonePopover.classList.toggle("hidden", !active || isDragging);
  if (!active) {
    elements.journeyMilestonePopover.style.left = "50%";
    elements.journeyMilestonePopover.style.transform = "translateX(-50%)";
    elements.journeyMilestoneMenuPanel.classList.add("hidden");
    return;
  }
  const isEditMode = state.journeyDraft?.mode === "edit";
  elements.journeyMilestoneName.value = active.name;
  elements.journeyMilestoneOwner.value = active.owner;
  elements.journeyMilestoneName.disabled = isEditMode;
  elements.journeyMilestoneMenu.disabled = isEditMode || active.type !== "custom";
  if (isEditMode || active.type !== "custom") {
    elements.journeyMilestoneMenuPanel.classList.add("hidden");
  }

  if (anchorRatio !== null) {
    const shell = elements.journeyTimeline?.closest(".journey-canvas-shell");
    const shellWidth = shell?.clientWidth || 0;
    const popoverWidth = elements.journeyMilestonePopover.offsetWidth || 220;
    if (shellWidth) {
      const rawLeft = anchorRatio * shellWidth;
      const clampedLeft = Math.min(
        Math.max(rawLeft, (popoverWidth / 2) + 8),
        shellWidth - (popoverWidth / 2) - 8,
      );
      elements.journeyMilestonePopover.style.left = `${clampedLeft}px`;
      elements.journeyMilestonePopover.style.transform = "translateX(-50%)";
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

function getJourneyMilestoneSelectionBounds(milestone, x, nameY, dateY, baselineY) {
  const top = Math.min(nameY - 14, dateY - 9, baselineY - 38);
  const bottom = baselineY + 16;
  return {
    left: x - 54,
    right: x + 74,
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
    minDeltaDays = -3650;
  }
  if (!Number.isFinite(maxDeltaDays)) {
    maxDeltaDays = 3650;
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
    class: "timeline-spine",
  }));

  const orderedMilestones = [...state.journeyDraft.milestones]
    .sort((left, right) => dateishTime(left.expected) - dateishTime(right.expected));
  let activeMilestoneRatio = null;
  const selectionBounds = [];

  const labelLevels = [];
  orderedMilestones.forEach((milestone, index) => {
    const x = xForDate(milestone.expected);
    let level = 0;
    if (index > 0) {
      const prev = labelLevels[index - 1];
      if (Math.abs(x - prev.x) < 90) {
        level = (prev.level + 1) % 3;
      }
    }
    labelLevels.push({ id: milestone.id, x, level });
  });

  orderedMilestones.forEach((milestone) => {
    const x = xForDate(milestone.expected);
    if (state.journeyDraft.activeMilestoneId === milestone.id) {
      activeMilestoneRatio = x / width;
    }
    const level = labelLevels.find((item) => item.id === milestone.id)?.level ?? 0;
    const verticalOffset = level * 16;
    const arrowTipY = baselineY;
    const arrowTopY = baselineY - 15;
    const nameY = arrowTopY - 10 + verticalOffset;
    const dateY = arrowTopY + 1 + verticalOffset;
    const isSelected = isJourneyMilestoneSelected(milestone.id);
    const isDraggable = state.journeyDraft.mode === "edit"
      ? true
      : milestone.type !== "custom" ? milestone.type === "kickoff" || milestone.type === "ga" : true;
    const marker = svgNode("g", { class: `journey-marker ${isSelected ? "is-selected" : ""}` });
    if (isSelected) {
      marker.appendChild(svgNode("rect", {
        x: String(x - 32),
        y: String(nameY - 24),
        width: "64",
        height: "54",
        rx: "18",
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
    }));
    marker.appendChild(labelTextNode(milestone.name, x, nameY, "rgba(47, 55, 70, 0.88)", 12, "middle", "marker-label milestone-name"));
    marker.appendChild(labelTextNode(formatCalendarDate(milestone.expected), x + 12, dateY, "var(--muted)", 10, "start", "marker-date date-text"));
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
      ...getJourneyMilestoneSelectionBounds(milestone, x, nameY, dateY, baselineY),
    });
  });

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
  const milestone = createJourneyMilestone("New Milestone", nextDate, "", "custom");
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
  if (!state.journeyDraft.dragMoved && Math.abs(clientX - state.journeyDraft.dragStartX) < 6) {
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
  const scale = getJourneyTimelineScale();
  const point = getJourneySvgPoint(clientX, 0);
  const clamped = Math.min(Math.max(point.x, 90), 1120 - 110);
  const ratio = (clamped - 90) / Math.max(1120 - 90 - 110, 1);
  const rawTime = scale.startTime + (ratio * scale.range);
  const oneDay = 24 * 60 * 60 * 1000;
  const snappedTime = Math.round(rawTime / oneDay) * oneDay;
  const rawDeltaDays = Math.round((snappedTime - snapshot.anchorTime) / oneDay);
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
  if (!state.journeyDraft.selectionMoved && rect.width < 6 && rect.height < 6) {
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

function openComposer(releaseId) {
  elements.composerDialog.classList.remove("import-only");
  syncComposerHeading("Studio", "Release rituals");
  renderEditForm(releaseId);
  renderReminderReleaseOptions(releaseId);
  renderPluginReleaseOptions(releaseId);
  if (elements.composerDialog.open) {
    refreshOptionalSurfaces(releaseId);
    return;
  }
  elements.composerDialog.showModal();
  refreshOptionalSurfaces(releaseId);
}

function openComposerForImport() {
  elements.composerDialog.classList.add("import-only");
  syncComposerHeading("YAML", "Bring a Journey");
  if (!elements.composerDialog.open) {
    elements.composerDialog.showModal();
  }
  setTimeout(() => {
    elements.importFile.focus();
  }, 0);
}

function syncComposerHeading(kicker, title) {
  const kickerNode = elements.composerDialog.querySelector(".dialog-kicker");
  const titleNode = elements.composerDialog.querySelector(".dialog-head h2");
  if (kickerNode) {
    kickerNode.textContent = kicker;
  }
  if (titleNode) {
    titleNode.textContent = title;
  }
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
  syncAckFormState();
  if (elements.ackDialog.open) {
    elements.ackSecret.focus();
    return;
  }
  elements.ackDialog.showModal();
  elements.ackSecret.focus();
}

function closeComposer() {
  if (elements.composerDialog.open) {
    elements.composerDialog.close();
  }
  elements.composerDialog.classList.remove("import-only");
  syncComposerHeading("Studio", "Release rituals");
}

function closeAckDialog() {
  if (elements.ackDialog.open) {
    elements.ackDialog.close();
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
  return elements.composerDialog.open && state.editReleaseId === releaseId;
}

function getSelectedReminderRelease() {
  return state.releases.find((item) => String(item.id) === elements.reminderRelease.value) || state.releases[0] || null;
}

function getSelectedPluginRelease() {
  return state.releases.find((item) => String(item.id) === elements.pluginRelease.value) || state.releases[0] || null;
}

function getSelectedPlugin() {
  return state.pluginCatalog.find((item) => item.id === elements.pluginRunner.value) || state.pluginCatalog[0] || null;
}

function renderPluginRunnerOptions() {
  const currentPluginId = elements.pluginRunner.value;
  elements.pluginRunner.innerHTML = "";

  state.pluginCatalog.forEach((plugin) => {
    const option = document.createElement("option");
    option.value = plugin.id;
    option.textContent = plugin.name;
    elements.pluginRunner.appendChild(option);
  });

  if (!state.pluginCatalog.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No bug snapshot runner";
    elements.pluginRunner.appendChild(option);
    return;
  }

  if (currentPluginId && state.pluginCatalog.some((plugin) => plugin.id === currentPluginId)) {
    elements.pluginRunner.value = currentPluginId;
  } else {
    elements.pluginRunner.value = state.pluginCatalog[0].id;
  }
}

async function refreshOptionalSurfaces(selectedReleaseId) {
  const releaseId = selectedReleaseId || state.editReleaseId || state.releases[0]?.id;
  if (!releaseId) {
    renderReminderPanel();
    renderPluginPanel();
    return;
  }

  await Promise.all([
    loadReminderState(releaseId),
    loadPluginCatalog(),
  ]);
  renderReminderReleaseOptions(releaseId);
  renderPluginReleaseOptions(releaseId);
}

async function loadReminderState(releaseId) {
  if (!releaseId) {
    return;
  }

  state.reminderSupport = "loading";
  renderReminderPanel();

  const release = state.releases.find((item) => item.id === releaseId);
  if (!release) {
    return;
  }

  const releaseCandidates = [
    `/api/releases/${releaseId}/notifications`,
    `/api/releases/${releaseId}/reminders`,
    `/api/releases/${releaseId}/notification-state`,
    `/api/releases/${releaseId}/reminder-state`,
  ];

  for (const path of releaseCandidates) {
    const response = await requestOptional(path);
    if (response.ok) {
      state.reminderSupport = "ready";
      state.reminderByRelease[releaseId] = normalizeReminderState(response.payload, release);
      return;
    }
    if (response.status && response.status !== 404) {
      state.reminderSupport = "error";
      state.reminderByRelease[releaseId] = {
        label: "Error",
        summary: "The reminder API responded, but not in a usable way.",
        items: [],
        message: extractOptionalError(response),
      };
      return;
    }
  }

  const milestoneItems = [];
  for (const milestone of release.milestones) {
    const milestoneCandidates = [
      `/api/milestones/${milestone.id}/notifications`,
      `/api/milestones/${milestone.id}/reminders`,
      `/api/milestones/${milestone.id}/notification-state`,
      `/api/milestones/${milestone.id}/reminder-state`,
    ];

    let found = false;
    for (const path of milestoneCandidates) {
      const response = await requestOptional(path);
      if (response.ok) {
        found = true;
        milestoneItems.push(...normalizeReminderItemsFromPayload(response.payload, milestone));
        break;
      }
      if (response.status && response.status !== 404) {
        state.reminderSupport = "error";
        state.reminderByRelease[releaseId] = {
          label: "Error",
          summary: "The reminder API responded, but not in a usable way.",
          items: [],
          message: extractOptionalError(response),
        };
        return;
      }
    }

    if (!found) {
      continue;
    }
  }

  if (milestoneItems.length) {
    state.reminderSupport = "ready";
    state.reminderByRelease[releaseId] = buildReminderStateFromItems(release, milestoneItems);
    return;
  }

  state.reminderSupport = "missing";
  state.reminderByRelease[releaseId] = {
    label: "Unavailable",
    summary: "This backend has not exposed reminder state endpoints yet.",
    items: release.milestones.map((milestone) => ({
      name: milestone.name,
      badge: milestone.acked_at ? "acknowledged" : "pending",
      badgeClass: milestone.acked_at ? "signal-badge-clear" : "signal-badge-pending",
      meta: milestone.acked_at
        ? `Milestone acknowledged ${formatDateTime(milestone.acked_at)}. Reminder state is not published here yet.`
        : `Milestone expected ${formatDate(milestone.expected)}. Reminder state is not published here yet.`,
      sortWeight: milestone.acked_at ? 2 : 1,
    })),
    message: "",
  };
}

async function runReminderEngine() {
  const releaseId = state.reminderReleaseId || state.releases[0]?.id;
  if (!releaseId) {
    elements.reminderMessage.textContent = "Bring in a release first.";
    return;
  }

  setStatus("Running reminders");
  elements.reminderRunButton.disabled = true;
  try {
    await request("/api/notifications/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ as_of: formatLocalDate(new Date()) }),
    });
    await loadReminderState(releaseId);
    renderReminderPanel();
    elements.reminderMessage.textContent = "Reminder engine refreshed.";
    setStatus("Reminders ready");
  } catch (error) {
    console.error(error);
    elements.reminderMessage.textContent = error.message;
    setStatus("Reminder refresh failed");
  } finally {
    elements.reminderRunButton.disabled = false;
  }
}

async function loadPluginCatalog() {
  if (state.pluginCatalogSupport === "ready" || state.pluginCatalogSupport === "missing") {
    return;
  }

  state.pluginCatalogSupport = "loading";
  renderPluginPanel();

  const candidates = [
    "/api/plugins",
    "/api/plugin-runners",
    "/api/plugins/bug-snapshots",
    "/api/plugins/bug-snapshot",
  ];

  for (const path of candidates) {
    const response = await requestOptional(path);
    if (response.ok) {
      state.pluginCatalog = normalizePluginCatalog(response.payload);
      state.pluginCatalogSupport = state.pluginCatalog.length ? "ready" : "missing";
      return;
    }
    if (response.status && response.status !== 404) {
      state.pluginCatalogSupport = "error";
      elements.pluginMessage.textContent = extractOptionalError(response);
      return;
    }
  }

  state.pluginCatalog = [];
  state.pluginCatalogSupport = "missing";
}

function normalizeReminderState(payload, release) {
  const items = normalizeReminderItemsFromPayload(payload, null);
  if (items.length) {
    return buildReminderStateFromItems(release, items);
  }

  const currentCount = numberish(payload?.current_count ?? payload?.current ?? payload?.active_count);
  const pendingCount = numberish(payload?.pending_count ?? payload?.pending ?? payload?.queued_count);
  return {
    label: pendingCount > 0 ? "Pending" : "Current",
    summary: `${release.product} ${release.version} has ${pendingCount} pending reminder${pendingCount === 1 ? "" : "s"} and ${currentCount} current.`,
    items: [],
    message: "",
  };
}

function normalizeReminderItemsFromPayload(payload, milestoneFallback) {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload?.milestones || payload?.reminders || payload?.notifications || payload?.items || (
      payload && typeof payload === "object" && (
        "state" in payload ||
        "status" in payload ||
        "pending_count" in payload ||
        "next_due_at" in payload ||
        "pending_types" in payload
      )
        ? [payload]
        : []
    );

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((entry, index) => normalizeReminderItem(entry, milestoneFallback, index)).filter(Boolean);
}

function normalizeReminderItem(entry, milestoneFallback, index) {
  const notificationHistory = Array.isArray(entry?.notifications) ? entry.notifications : [];
  const pendingTypes = Array.isArray(entry?.pending_types) ? entry.pending_types : Array.isArray(entry?.pendingTypes) ? entry.pendingTypes : [];
  const pendingCount = numberish(
    entry?.pending_count ?? entry?.pendingCount ?? entry?.queued_count ?? entry?.queuedCount ?? pendingTypes.length,
  );
  const currentCount = numberish(entry?.current_count ?? entry?.currentCount ?? entry?.current ?? entry?.active_count ?? entry?.activeCount ?? notificationHistory.length);
  const status = String(entry?.state || entry?.status || entry?.type || "").toLowerCase();
  const nextDueAt = entry?.next_due_at || entry?.nextDueAt || entry?.scheduled_for || entry?.scheduledFor;
  const lastSentAt = entry?.last_sent_at || entry?.lastSentAt || entry?.sent_at || entry?.sentAt || notificationHistory.at(-1)?.sent_at || notificationHistory.at(-1)?.sentAt;
  const expected = entry?.expected || milestoneFallback?.expected;
  const name = entry?.milestone_name || entry?.name || entry?.title || milestoneFallback?.name || `Reminder ${index + 1}`;
  const ackedAt = entry?.acked_at || entry?.ackedAt || milestoneFallback?.acked_at || milestoneFallback?.ackedAt;

  let badge = "current";
  let badgeClass = "signal-badge-current";

  if (pendingCount > 0 || status.includes("pending") || status.includes("queue")) {
    badge = pendingCount > 0 ? `${pendingCount} pending` : "pending";
    badgeClass = "signal-badge-pending";
  } else if (ackedAt || status.includes("clear") || status.includes("sent") || status.includes("complete")) {
    badge = "current";
    badgeClass = "signal-badge-clear";
  } else if (currentCount > 0) {
    badge = `${currentCount} current`;
  }

  const parts = [];
  if (pendingTypes.length) {
    parts.push(`due ${pendingTypes.join(", ")}`);
  }
  if (lastSentAt) {
    parts.push(`last sent ${formatDateTime(lastSentAt)}`);
  }
  if (nextDueAt) {
    parts.push(`next due ${formatDateTime(nextDueAt)}`);
  }
  if (expected) {
    parts.push(`milestone expected ${formatDate(expected)}`);
  }
  if (ackedAt) {
    parts.push(`acknowledged ${formatDateTime(ackedAt)}`);
  }

  return {
    name,
    badge,
    badgeClass,
    meta: parts.join(" • ") || "No reminder details published.",
    sortWeight: pendingCount > 0 ? 0 : currentCount > 0 ? 1 : 2,
  };
}

function buildReminderStateFromItems(release, items) {
  const sortedItems = [...items].sort((left, right) => (
    left.sortWeight - right.sortWeight || left.name.localeCompare(right.name)
  ));
  const pendingCount = sortedItems.filter((item) => item.badgeClass === "signal-badge-pending").length;
  const currentCount = sortedItems.filter((item) => item.badgeClass !== "signal-badge-pending").length;

  return {
    label: pendingCount > 0 ? "Pending" : "Current",
    summary: `${release.product} ${release.version} shows ${pendingCount} pending reminder${pendingCount === 1 ? "" : "s"} across ${sortedItems.length} milestone signal${sortedItems.length === 1 ? "" : "s"}.`,
    items: sortedItems,
    message: "",
  };
}

function normalizePluginCatalog(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload?.plugins || payload?.runners || payload?.items || (
      payload && typeof payload === "object" && (payload.id || payload.name)
        ? [payload]
        : []
    );

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item, index) => {
      const kind = String(item?.kind || item?.type || item?.category || "").toLowerCase();
      const accepts = String(item?.accepts || item?.input_kind || item?.inputKind || "").toLowerCase();
      const id = String(item?.id || item?.name || `plugin-${index + 1}`);
      const supportsSnapshots = (
        kind.includes("bug") ||
        kind.includes("snapshot") ||
        accepts.includes("bug") ||
        accepts.includes("snapshot") ||
        id.includes("bug") ||
        id.includes("snapshot")
      );

      if (!supportsSnapshots) {
        return null;
      }

      return {
        id,
        name: String(item?.label || item?.name || id),
        description: String(item?.description || item?.summary || "Plugin-backed bug snapshot ingestion."),
        contractLabel: String(item?.contract || item?.version || accepts || "plugin contract"),
        endpoint: item?.endpoint || item?.run_endpoint || item?.runEndpoint || item?.import_endpoint || item?.importEndpoint || "",
      };
    })
    .filter(Boolean);
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
  if (action === "edit") {
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
  setStatus("Exporting");
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
    elements.editMessage.textContent = `${release.product} ${release.version} exported.`;
    setStatus("Exported");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Export failed");
  }
}

async function deleteRelease(release) {
  const secret = window.prompt(`Type the secret to remove ${release.product} ${release.version}.`);
  if (secret === null) {
    return;
  }
  if (secret.trim() !== String(release.secret || "").trim()) {
    elements.editMessage.textContent = "Secret did not match. Release was not removed.";
    setStatus("Delete cancelled");
    return;
  }
  const confirmed = window.confirm(`Are you sure you want to remove this release?\n\n${release.product} ${release.version}\n\nThis removes its milestones and bug history.`);
  if (!confirmed) {
    return;
  }

  setStatus("Deleting");
  try {
    await request(`/api/releases/${release.id}`, { method: "DELETE" });
    elements.editMessage.textContent = `${release.product} ${release.version} deleted.`;
    await loadTimeline();
    setStatus("Deleted");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Delete failed");
  }
}

async function seedDemo() {
  elements.seedButton.disabled = true;
  elements.dialogSeedButton.disabled = true;
  setStatus("Seeding");
  try {
    const scenarios = [
      {
        product: "FortiSASE",
        version: "26.8",
        secret: "boa-268",
        milestones: [
          { name: "Kickoff", dayOffset: -42, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -10, owner: "alice", ack: true },
          { name: "Regression Ready", dayOffset: 18, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 48, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -30, openBugCount: 9 },
          { dayOffset: -22, openBugCount: 22 },
          { dayOffset: -13, openBugCount: 28 },
          { dayOffset: -5, openBugCount: 17 },
          { dayOffset: -2, openBugCount: 11 },
          { dayOffset: 0, openBugCount: 8 },
        ],
      },
      {
        product: "FortiAnalyzer",
        version: "8.0",
        secret: "boa-800",
        milestones: [
          { name: "Kickoff", dayOffset: -54, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -21, owner: "alice", ack: true },
          { name: "Regression Ready", dayOffset: 11, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 41, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -48, openBugCount: 5 },
          { dayOffset: -34, openBugCount: 13 },
          { dayOffset: -19, openBugCount: 19 },
          { dayOffset: -11, openBugCount: 14 },
          { dayOffset: -4, openBugCount: 10 },
          { dayOffset: 0, openBugCount: 7 },
        ],
      },
      {
        product: "FortiExtender",
        version: "7.6",
        secret: "boa-076",
        milestones: [
          { name: "Kickoff", dayOffset: -76, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -24, owner: "alice", ack: false },
          { name: "Regression Ready", dayOffset: 32, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 81, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -60, openBugCount: 6 },
          { dayOffset: -42, openBugCount: 12 },
          { dayOffset: -27, openBugCount: 18 },
          { dayOffset: -8, openBugCount: 14 },
          { dayOffset: -3, openBugCount: 20 },
          { dayOffset: 0, openBugCount: 13 },
        ],
      },
      {
        product: "FortiManager",
        version: "7.4",
        secret: "boa-740",
        milestones: [
          { name: "Kickoff", dayOffset: -68, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -36, owner: "alice", ack: true },
          { name: "Regression Ready", dayOffset: 6, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 29, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -59, openBugCount: 8 },
          { dayOffset: -45, openBugCount: 18 },
          { dayOffset: -31, openBugCount: 24 },
          { dayOffset: -15, openBugCount: 16 },
          { dayOffset: -6, openBugCount: 12 },
          { dayOffset: 0, openBugCount: 9 },
        ],
      },
      {
        product: "FortiMail",
        version: "25.1",
        secret: "boa-251",
        milestones: [
          { name: "Kickoff", dayOffset: -39, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -8, owner: "alice", ack: false },
          { name: "Regression Ready", dayOffset: 24, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 52, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -34, openBugCount: 7 },
          { dayOffset: -26, openBugCount: 11 },
          { dayOffset: -18, openBugCount: 15 },
          { dayOffset: -9, openBugCount: 21 },
          { dayOffset: -3, openBugCount: 16 },
          { dayOffset: 0, openBugCount: 14 },
        ],
      },
      {
        product: "FortiClient",
        version: "8.2",
        secret: "boa-820",
        milestones: [
          { name: "Kickoff", dayOffset: -58, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -29, owner: "alice", ack: true },
          { name: "Regression Ready", dayOffset: 14, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 36, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -52, openBugCount: 4 },
          { dayOffset: -38, openBugCount: 10 },
          { dayOffset: -25, openBugCount: 17 },
          { dayOffset: -13, openBugCount: 12 },
          { dayOffset: -5, openBugCount: 9 },
          { dayOffset: 0, openBugCount: 6 },
        ],
      },
      {
        product: "FortiMonitor",
        version: "3.9",
        secret: "boa-390",
        milestones: [
          { name: "Kickoff", dayOffset: -47, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -16, owner: "alice", ack: false },
          { name: "Regression Ready", dayOffset: 17, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 44, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -42, openBugCount: 9 },
          { dayOffset: -33, openBugCount: 14 },
          { dayOffset: -24, openBugCount: 22 },
          { dayOffset: -12, openBugCount: 19 },
          { dayOffset: -4, openBugCount: 12 },
          { dayOffset: 0, openBugCount: 8 },
        ],
      },
      {
        product: "FortiRecorder",
        version: "2.5",
        secret: "boa-250",
        milestones: [
          { name: "Kickoff", dayOffset: -72, owner: "pm", ack: true },
          { name: "Dev Ready", dayOffset: -44, owner: "alice", ack: true },
          { name: "Regression Ready", dayOffset: -7, owner: "bob", ack: false },
          { name: "GA Release", dayOffset: 18, owner: "manager", ack: false },
        ],
        bugSeries: [
          { dayOffset: -66, openBugCount: 11 },
          { dayOffset: -56, openBugCount: 19 },
          { dayOffset: -41, openBugCount: 27 },
          { dayOffset: -22, openBugCount: 23 },
          { dayOffset: -9, openBugCount: 15 },
          { dayOffset: 0, openBugCount: 10 },
        ],
      },
    ];

    const scenario = scenarios[state.releases.length % scenarios.length];
    const product = scenario.product;
    const version = scenario.version;
    const secret = scenario.secret;
    const created = await request("/api/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, version, secret }),
    });

    const releaseId = created.id;
    const [kickoff, gaRelease] = created.milestones;
    const [kickoffSpec, devReadySpec, regressionSpec, gaSpec] = scenario.milestones;

    await request(`/api/milestones/${kickoff.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: kickoffSpec.name,
        expected: isoDateFromOffset(kickoffSpec.dayOffset),
        owner: kickoffSpec.owner,
      }),
    });
    await request(`/api/milestones/${gaRelease.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gaSpec.name,
        expected: isoDateFromOffset(gaSpec.dayOffset),
        owner: gaSpec.owner,
      }),
    });
    await request(`/api/releases/${releaseId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: devReadySpec.name,
        expected: isoDateFromOffset(devReadySpec.dayOffset),
        owner: devReadySpec.owner,
      }),
    });
    await request(`/api/releases/${releaseId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: regressionSpec.name,
        expected: isoDateFromOffset(regressionSpec.dayOffset),
        owner: regressionSpec.owner,
      }),
    });

    for (const entry of scenario.bugSeries) {
      await request(`/api/releases/${releaseId}/bug-snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          open_bug_count: entry.openBugCount,
        }),
      });
    }

    const starlightMoments = [
      {
        observedOn: isoDateFromOffset(Math.min(kickoffSpec.dayOffset, -34)),
        starlight: 20,
        whisper: "Kickoff completed.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Journey kickoff aligned\n- Scope framed with engineering and PM\n\n## Risk\n\nOpen dependencies are still being mapped.",
        },
        metrics: { done: 4, total: 18, blocked: 1 },
      },
      {
        observedOn: isoDateFromOffset(Math.min(devReadySpec.dayOffset, -18)),
        starlight: 35,
        whisper: "Core implementation completed.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Security API completed\n- RBAC flow connected\n- Core implementation settled\n\n## In Progress\n\n- Integration polish",
        },
        metrics: { done: 11, total: 18, blocked: 2 },
      },
      {
        observedOn: isoDateFromOffset(Math.min(regressionSpec.dayOffset - 7, -3)),
        starlight: 52,
        whisper: "Regression path stabilized.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Regression path stabilized\n- Cross-team test rhythm re-established\n\n## Risk\n\nAwaiting one backend review before confidence can rise further.",
        },
        metrics: { done: 14, total: 18, blocked: 2 },
      },
      {
        observedOn: isoDateFromOffset(0),
        starlight: 78,
        whisper: "Feature integration completed.",
        detail: {
          type: "markdown",
          content: "## Completed\n\n- Feature integration completed\n- Release notes draft is ready\n- QA handoff is steady\n\n## In Progress\n\n- Final compatibility sweep\n\n## Risk\n\nA small auth edge case still needs confirmation.",
        },
        metrics: { done: 16, total: 18, blocked: 1 },
      },
    ];
    for (const moment of starlightMoments) {
      await request(`/api/releases/${releaseId}/starlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observed_on: moment.observedOn,
          starlight: moment.starlight,
          whisper: moment.whisper,
          detail: moment.detail,
          metrics: moment.metrics,
        }),
      });
    }

    await loadTimeline();
    const refreshed = state.releases.find((release) => release.id === releaseId);
    if (refreshed?.milestones?.length) {
      for (const milestoneSpec of scenario.milestones.filter((item) => item.ack)) {
        const target = refreshed.milestones.find((item) => item.name === milestoneSpec.name);
        if (!target) {
          continue;
        }
        await request(`/api/milestones/${target.id}/ack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        });
      }
    }
    await loadTimeline();
    elements.createMessage.textContent = `${product} ${version} demo loaded.`;
    setStatus("Demo ready");
    openComposer(releaseId);
  } catch (error) {
    console.error(error);
    elements.ackMessage.textContent = error.message;
    setStatus("Seed failed");
  } finally {
    elements.seedButton.disabled = false;
    elements.dialogSeedButton.disabled = false;
  }
}

function isoDateFromOffset(dayOffset) {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);
  return formatLocalDate(base);
}

async function submitCreate(event) {
  event.preventDefault();
  const product = elements.createProduct.value.trim();
  const version = elements.createVersion.value.trim();
  const secret = elements.createSecret.value.trim();
  if (!product || !version || !secret) {
    elements.createMessage.textContent = "Fill product, version, and secret.";
    return;
  }

  try {
    const created = await request("/api/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, version, secret }),
    });
    elements.createMessage.textContent = `${product} ${version} created.`;
    elements.createForm.reset();
    await loadTimeline();
    openComposer(created.id);
    setStatus("Release created");
  } catch (error) {
    console.error(error);
    elements.createMessage.textContent = error.message;
    setStatus("Create failed");
  }
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
    elements.journeyMessage.textContent = "Fill product, version, and secret.";
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
    elements.journeyMessage.textContent = "Release could not be found.";
    return;
  }
  if (state.journeyDraft.secret.trim() !== String(state.journeyDraft.expectedSecret || "").trim()) {
    elements.journeyMessage.textContent = "Enter the correct secret to save changes.";
    return;
  }

  setStatus("Saving journey");
  try {
    const orderedDraftMilestones = [...state.journeyDraft.milestones]
      .sort((left, right) => new Date(left.expected).getTime() - new Date(right.expected).getTime());
    const orderedReleaseMilestones = [...release.milestones]
      .sort((left, right) => new Date(left.expected).getTime() - new Date(right.expected).getTime());

    for (let index = 0; index < orderedReleaseMilestones.length; index += 1) {
      const target = orderedReleaseMilestones[index];
      const draftMilestone = orderedDraftMilestones[index];
      if (!draftMilestone) {
        continue;
      }
      await request(`/api/milestones/${target.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: target.name,
          expected: formatCalendarDate(draftMilestone.expected),
          owner: draftMilestone.owner?.trim() || target.owner || "",
        }),
      });
    }

    await loadTimeline();
    closeJourneyDialog();
    setStatus("Journey saved");
  } catch (error) {
    console.error(error);
    elements.journeyMessage.textContent = error.message;
    setStatus("Save failed");
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
    closeComposer();
    openJourneyDialogFromDraft(draft);
    elements.journeyMessage.textContent = `${blueprint.product} ${blueprint.version} is ready to begin.`;
    setStatus("Journey prepared");
  } catch (error) {
    console.error(error);
    elements.importMessage.textContent = error.message;
    setStatus("Prepare failed");
  }
}

async function submitAck(event) {
  event.preventDefault();
  const milestone = getSelectedAckMilestone();
  const release = getSelectedAckRelease();
  const milestoneId = milestone?.id;
  const secret = elements.ackSecret.value.trim();
  const note = elements.ackNote.value.trim();
  if (!milestoneId || !secret) {
    elements.ackMessage.textContent = !secret ? "Secret is required." : "No milestone selected.";
    return;
  }

  try {
    const ack = await request(`/api/milestones/${milestoneId}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, note }),
    });
    elements.ackMessage.textContent = milestone?.acked_at
      ? "Acknowledgement note updated."
      : "Milestone acknowledged.";
    await loadTimeline();
    if (release) {
      state.ackContext = { releaseId: release.id, milestoneId };
    }
    const refreshed = getSelectedAckMilestone();
    elements.ackNote.value = refreshed?.ack_note || ack.note || "";
    syncAckFormState();
    setStatus("Acknowledged");
  } catch (error) {
    console.error(error);
    elements.ackMessage.textContent = error.message;
    setStatus("Ack failed");
  }
}

async function saveReleaseBasics() {
  const release = getSelectedEditRelease();
  const product = elements.editProduct.value.trim();
  const version = elements.editVersion.value.trim();
  const secret = elements.editSecret.value.trim();

  if (!release) {
    elements.editMessage.textContent = "Choose a release first.";
    return;
  }

  if (!product || !version || !secret) {
    elements.editMessage.textContent = "Release basics need product, version, and secret.";
    return;
  }

  setStatus("Saving release");
  try {
    await request(`/api/releases/${release.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, version, secret }),
    });
    elements.editMessage.textContent = `${product} ${version} updated.`;
    await loadTimeline();
    renderEditForm(release.id);
    setStatus("Release saved");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Save failed");
  }
}

async function saveMilestone(milestoneId, container) {
  const name = container.querySelector('[data-field="name"]').value.trim();
  const expected = container.querySelector('[data-field="expected"]').value;
  const owner = container.querySelector('[data-field="owner"]').value.trim();

  if (!name || !expected || !owner) {
    elements.editMessage.textContent = "Each milestone needs name, date, and owner.";
    return;
  }

  setStatus("Saving");
  try {
    await request(`/api/milestones/${milestoneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, expected, owner }),
    });
    elements.editMessage.textContent = `${name} updated.`;
    await loadTimeline();
    renderEditForm(state.editReleaseId);
    setStatus("Saved");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Save failed");
  }
}

async function submitPluginImport(event) {
  event.preventDefault();
  const release = getSelectedPluginRelease();
  const plugin = getSelectedPlugin();
  const file = elements.pluginFile.files?.[0];
  const payload = elements.pluginPayload.value.trim();

  if (!release) {
    elements.pluginMessage.textContent = "Choose a release first.";
    return;
  }

  if (!plugin) {
    elements.pluginMessage.textContent = "No bug snapshot runner is available.";
    return;
  }

  if (!file && !payload) {
    elements.pluginMessage.textContent = "Provide either a file or a manual payload.";
    return;
  }

  let submissions;
  try {
    submissions = await parsePluginSubmissions({ file, payload });
  } catch (error) {
    elements.pluginMessage.textContent = error.message;
    return;
  }

  const endpoint = plugin.endpoint || `/api/plugins/${encodeURIComponent(plugin.id)}/releases/${release.id}/bug-snapshots`;

  setStatus("Running plugin");
  for (const submission of submissions) {
    const response = await requestOptional(endpoint.replace("{release_id}", String(release.id)), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });

    if (response.ok) {
      continue;
    }
    if (response.status) {
      elements.pluginMessage.textContent = extractOptionalError(response);
      setStatus("Plugin failed");
      return;
    }
  }

  elements.pluginMessage.textContent = `${plugin.name} imported ${submissions.length} bug snapshot${submissions.length === 1 ? "" : "s"} for ${release.product} ${release.version}.`;
  elements.pluginPayload.value = "";
  elements.pluginFile.value = "";
  await loadTimeline();
  setStatus("Plugin complete");
}

async function parsePluginSubmissions({ file, payload }) {
  if (payload) {
    return normalizePluginSubmissions(JSON.parse(payload));
  }

  const text = await file.text();
  if (file.name.endsWith(".csv")) {
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rows.length < 2) {
      throw new Error("CSV import needs a header and at least one row.");
    }
    const headers = rows[0].split(",").map((item) => item.trim().toLowerCase());
    const countIndex = headers.findIndex((item) => item === "open_bug_count" || item === "openbugs" || item === "open_bugs");
    const signalTypeIndex = headers.findIndex((item) => item === "signal_type" || item === "type");
    if (countIndex === -1) {
      throw new Error("CSV import needs an open_bug_count column.");
    }
    return normalizePluginSubmissions(rows.slice(1).map((row) => {
      const columns = row.split(",").map((item) => item.trim());
      return {
        open_bug_count: Number(columns[countIndex]),
        signal_type: signalTypeIndex === -1 ? undefined : columns[signalTypeIndex],
      };
    }));
  }

  return normalizePluginSubmissions(JSON.parse(text));
}

function normalizePluginSubmissions(payload) {
  const rawEntries = Array.isArray(payload) ? payload : [payload];
  const submissions = rawEntries.map((entry) => ({
    open_bug_count: Number(entry?.open_bug_count ?? entry?.openBugCount),
    signal_type: String(entry?.signal_type ?? entry?.signalType ?? "total").trim() || "total",
  })).filter((entry) => Number.isFinite(entry.open_bug_count) && entry.open_bug_count >= 0);

  if (!submissions.length) {
    throw new Error("Plugin payload must contain open_bug_count.");
  }

  return submissions;
}

async function deleteMilestone(milestoneId, milestoneName) {
  const confirmed = window.confirm(`Delete milestone "${milestoneName}"?`);
  if (!confirmed) {
    return;
  }

  setStatus("Deleting milestone");
  try {
    await request(`/api/milestones/${milestoneId}`, { method: "DELETE" });
    elements.editMessage.textContent = `${milestoneName} deleted.`;
    await loadTimeline();
    renderEditForm(state.editReleaseId);
    setStatus("Milestone deleted");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Delete failed");
  }
}

async function submitEdit(event) {
  event.preventDefault();
  const release = getSelectedEditRelease();
  const name = elements.editNewName.value.trim();
  const expected = elements.editNewDate.value;
  const owner = elements.editNewOwner.value.trim();

  if (!release) {
    elements.editMessage.textContent = "Choose a release first.";
    return;
  }

  if (!name || !expected || !owner) {
    elements.editMessage.textContent = "New milestones need name, date, and owner.";
    return;
  }

  setStatus("Adding milestone");
  try {
    await request(`/api/releases/${release.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, expected, owner }),
    });
    elements.editMessage.textContent = `${name} added to ${release.product} ${release.version}.`;
    elements.editNewName.value = "";
    elements.editNewDate.value = "";
    elements.editNewOwner.value = "";
    await loadTimeline();
    renderEditForm(release.id);
    setStatus("Milestone added");
  } catch (error) {
    console.error(error);
    elements.editMessage.textContent = error.message;
    setStatus("Add failed");
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
  elements.boardSummary.textContent = `${prefix}${releaseCount} releases • ${milestoneCount} milestones • ${pendingCount} pending${collapsedNote}`;
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
  return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

elements.seedButton.addEventListener("click", seedDemo);
elements.dialogSeedButton.addEventListener("click", seedDemo);
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
  openComposerForImport();
});
elements.emptyNewReleaseButton.addEventListener("click", () => openJourneyDialog());
elements.closeJourneyDialogButton.addEventListener("click", closeJourneyDialog);
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
elements.closeDialogButton.addEventListener("click", closeComposer);
elements.closeAckDialogButton.addEventListener("click", closeAckDialog);
elements.createForm.addEventListener("submit", submitCreate);
elements.importForm.addEventListener("submit", submitImport);
elements.ackForm.addEventListener("submit", submitAck);
elements.ackSecret.addEventListener("input", () => {
  if (elements.ackMessage.textContent) {
    elements.ackMessage.textContent = "";
  }
});
elements.editForm.addEventListener("submit", submitEdit);
elements.editReleaseSaveButton.addEventListener("click", saveReleaseBasics);
elements.editRelease.addEventListener("change", () => {
  state.editReleaseId = Number(elements.editRelease.value);
  renderEditForm(state.editReleaseId);
  refreshOptionalSurfaces(state.editReleaseId);
});
elements.reminderRelease.addEventListener("change", () => {
  state.reminderReleaseId = Number(elements.reminderRelease.value);
  loadReminderState(state.reminderReleaseId).then(() => renderReminderPanel());
});
elements.reminderRunButton.addEventListener("click", runReminderEngine);
elements.pluginForm.addEventListener("submit", submitPluginImport);
elements.pluginRelease.addEventListener("change", () => {
  state.pluginReleaseId = Number(elements.pluginRelease.value);
  renderPluginPanel();
});
elements.pluginRunner.addEventListener("change", renderPluginPanel);
elements.importKeepOriginal.addEventListener("change", syncImportMode);
elements.importShiftTimeline.addEventListener("change", syncImportMode);
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
elements.composerDialog.addEventListener("click", (event) => {
  if (event.target === elements.composerDialog) {
    closeComposer();
  }
});
elements.ackDialog.addEventListener("click", (event) => {
  if (event.target === elements.ackDialog) {
    closeAckDialog();
  }
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
  if (elements.composerDialog.open || elements.ackDialog.open) {
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
window.BOA_DEBUG = {
  BUG_WAVE_MANUAL_FIXTURES,
  STARLIGHT_VISUAL_CONFIG,
  starlightToY,
  getBugRisk,
  computePeakRisk,
  getBugWaveEffectiveMaxRatio,
  normalizeBugWaveHeight,
  smoothRiskSeries,
  buildBugWaveMetrics,
  inspectBugWaveSeries,
  inspectBugWaveFixtures,
};

async function init() {
  await loadAppConfig();
  syncBoardControls();
  await loadTimeline();
}

syncNowControls();
syncImportMode();
init();
