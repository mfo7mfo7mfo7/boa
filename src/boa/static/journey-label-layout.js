(function initJourneyLabelLayout(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.BoaJourneyLabelLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function buildJourneyLabelLayoutApi() {
  const DEFAULT_CONFIG = {
    maxLanes: 7,
    laneHeight: 24,
    titleDateGap: 13,
    collisionPadding: 2,
    boundaryPadding: 8,
    topSafeMargin: 24,
    candidateOffsets: [0, -12, 12, -24, 24, -40, 40, -60, 60, -84, 84, -120, 120, -156, 156, -192, 192, -240, 240],
    repairCandidateOffsets: [0, -12, 12, -24, 24, -40, 40, -60, 60, -84, 84, -120, 120, -156, 156, -192, 192, -240, 240],
    laneWeight: 96,
    horizontalWeight: 1.4,
    anchorChangePenalty: 18,
    edgeWeight: 0.45,
    stabilityWeight: 0.28,
    previousPlacementBenefit: 300,
    maxRepairPasses: 1,
    clusterTightGap: 2,
    clusterBeamWidth: 192,
    denseClusterBeamWidth: 1536,
    maxDisplacementWeight: 0.58,
    compoundDisplacementWeight: 0.16,
    spacingConsistencyWeight: 0.08,
    clusterExpansionWeight: 0.32,
    pairExpansionWeight: 0.7,
    maxVisualOffset: Number.POSITIVE_INFINITY,
  };

  const ANCHOR_ORDER = ["middle", "start", "end"];

  function mergeJourneyLabelConfig(config = {}) {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      candidateOffsets: config.candidateOffsets || DEFAULT_CONFIG.candidateOffsets,
      repairCandidateOffsets: config.repairCandidateOffsets || DEFAULT_CONFIG.repairCandidateOffsets,
    };
  }

  function inflateJourneyRect(rect, padding = 0) {
    return {
      left: rect.left - padding,
      right: rect.right + padding,
      top: rect.top - padding,
      bottom: rect.bottom + padding,
    };
  }

  function intersectsJourneyRect(left, right) {
    return !(
      left.right <= right.left ||
      left.left >= right.right ||
      left.bottom <= right.top ||
      left.top >= right.bottom
    );
  }

  function getJourneyAnchorRank(anchor) {
    const index = ANCHOR_ORDER.indexOf(anchor);
    return index === -1 ? ANCHOR_ORDER.length : index;
  }

  function buildJourneyCandidateBox(label, labelX, titleY, dateY, anchor, config) {
    const titleWidth = Math.max(label.titleWidth || label.combinedWidth || 0, 1);
    const dateWidth = Math.max(label.dateWidth || 0, 1);
    const width = Math.max(label.combinedWidth || 0, titleWidth, dateWidth);
    const titleHeight = Math.max(label.titleHeight || 14, 1);
    const dateHeight = Math.max(label.dateHeight || 12, 1);
    let left;
    let right;
    if (anchor === "start") {
      left = labelX;
      right = labelX + width;
    } else if (anchor === "end") {
      left = labelX - width;
      right = labelX;
    } else {
      left = labelX - (width / 2);
      right = labelX + (width / 2);
    }
    return {
      left,
      right,
      top: Math.min(titleY - (titleHeight / 2), dateY - (dateHeight / 2)),
      bottom: Math.max(titleY + (titleHeight / 2), dateY + (dateHeight / 2)),
      padding: config.collisionPadding,
    };
  }

  function buildJourneyLabelCandidates(label, inputConfig = {}, options = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const offsets = options.repair ? config.repairCandidateOffsets : config.candidateOffsets;
    const candidates = [];
    const previous = label.previousPlacement;

    if (previous && previous.status !== "unresolved") {
      const bbox = buildJourneyCandidateBox(label, previous.labelX, previous.titleY, previous.dateY, previous.anchor, config);
      candidates.push({
        milestoneId: label.milestoneId,
        markerX: label.markerX,
        labelX: previous.labelX,
        titleY: previous.titleY,
        dateY: previous.dateY,
        lane: previous.lane,
        anchor: previous.anchor,
        horizontalOffset: previous.horizontalOffset ?? previous.labelX - label.markerX,
        bbox,
        isPrevious: true,
      });
    }

    for (let lane = 0; lane < config.maxLanes; lane += 1) {
      const titleY = label.markerY - 37 - (lane * config.laneHeight);
      const dateY = titleY + config.titleDateGap;
      for (const offset of offsets) {
        for (const anchor of ANCHOR_ORDER) {
          const labelX = label.markerX + offset;
          const bbox = buildJourneyCandidateBox(label, labelX, titleY, dateY, anchor, config);
          candidates.push({
            milestoneId: label.milestoneId,
            markerX: label.markerX,
            labelX,
            titleY,
            dateY,
            lane,
            anchor,
            horizontalOffset: offset,
            bbox,
            isPrevious: false,
          });
        }
      }
    }

    return candidates;
  }

  function isJourneyCandidateHardInvalid(candidate, occupied, bounds, reservedRegions, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const padded = inflateJourneyRect(candidate.bbox, config.collisionPadding);
    if (Math.abs(getJourneyVisualOffset(candidate)) > config.maxVisualOffset) {
      return true;
    }
    if (
      padded.left < bounds.left + config.boundaryPadding ||
      padded.right > bounds.right - config.boundaryPadding ||
      padded.top < bounds.top + config.topSafeMargin ||
      padded.bottom > bounds.bottom - config.boundaryPadding
    ) {
      return true;
    }
    if (typeof bounds.maxLabelBottom === "number" && padded.bottom > bounds.maxLabelBottom) {
      return true;
    }
    return [...occupied, ...reservedRegions].some((region) => (
      intersectsJourneyRect(padded, inflateJourneyRect(region, region.padding || 0))
    ));
  }

  function scoreJourneyLabelCandidate(candidate, label, bounds, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const horizontalDistance = Math.abs(getJourneyVisualOffset(candidate));
    const previous = label.previousPlacement;
    const previousVisualCenter = previous
      ? ((previous.bbox?.left ?? previous.labelX) + (previous.bbox?.right ?? previous.labelX)) / 2
      : null;
    const candidateVisualCenter = getJourneyVisualCenter(candidate);
    const previousDistance = previous
      ? Math.abs(candidateVisualCenter - previousVisualCenter) + (Math.abs(candidate.lane - previous.lane) * config.laneHeight)
      : 0;
    const anchorPenalty = previous && previous.anchor && previous.anchor !== candidate.anchor
      ? config.anchorChangePenalty
      : candidate.anchor === "middle" ? 0 : config.anchorChangePenalty / 3;
    const edgeDistance = Math.min(candidate.bbox.left - bounds.left, bounds.right - candidate.bbox.right);
    const edgePenalty = edgeDistance < 40 ? (40 - edgeDistance) * config.edgeWeight : 0;
    const stabilityBenefit = candidate.isPrevious ? config.previousPlacementBenefit : 0;
    return (
      (candidate.lane * config.laneWeight) +
      (horizontalDistance * config.horizontalWeight) +
      anchorPenalty +
      edgePenalty +
      (previousDistance * config.stabilityWeight) -
      stabilityBenefit
    );
  }

  function compareJourneyCandidates(left, right) {
    if (left.cost !== right.cost) {
      return left.cost - right.cost;
    }
    if (left.lane !== right.lane) {
      return left.lane - right.lane;
    }
    if (Math.abs(left.horizontalOffset) !== Math.abs(right.horizontalOffset)) {
      return Math.abs(left.horizontalOffset) - Math.abs(right.horizontalOffset);
    }
    if (getJourneyAnchorRank(left.anchor) !== getJourneyAnchorRank(right.anchor)) {
      return getJourneyAnchorRank(left.anchor) - getJourneyAnchorRank(right.anchor);
    }
    return String(left.milestoneId).localeCompare(String(right.milestoneId));
  }

  function sortJourneyLabelsForPlacement(labels) {
    return [...labels].sort((left, right) => {
      const leftDragged = left.isActiveDrag || left.isSelectedDrag ? 0 : 1;
      const rightDragged = right.isActiveDrag || right.isSelectedDrag ? 0 : 1;
      if (leftDragged !== rightDragged) {
        return leftDragged - rightDragged;
      }
      if ((left.priority || 0) !== (right.priority || 0)) {
        return (right.priority || 0) - (left.priority || 0);
      }
      if (left.markerX !== right.markerX) {
        return left.markerX - right.markerX;
      }
      return String(left.milestoneId).localeCompare(String(right.milestoneId));
    });
  }

  function getJourneyConnector(candidate) {
    const attachmentX = Math.min(Math.max(candidate.markerX, candidate.bbox.left), candidate.bbox.right);
    return {
      x1: candidate.markerX,
      y1: candidate.bbox.bottom + 36,
      x2: attachmentX,
      y2: candidate.bbox.bottom,
    };
  }

  function getJourneyVisualCenter(candidate) {
    return (candidate.bbox.left + candidate.bbox.right) / 2;
  }

  function getJourneyVisualOffset(candidate) {
    return getJourneyVisualCenter(candidate) - candidate.markerX;
  }

  function journeyOrientation(a, b, c) {
    return ((b.y - a.y) * (c.x - b.x)) - ((b.x - a.x) * (c.y - b.y));
  }

  function journeySegmentsIntersect(first, second) {
    const a = { x: first.x1, y: first.y1 };
    const b = { x: first.x2, y: first.y2 };
    const c = { x: second.x1, y: second.y1 };
    const d = { x: second.x2, y: second.y2 };
    const o1 = journeyOrientation(a, b, c);
    const o2 = journeyOrientation(a, b, d);
    const o3 = journeyOrientation(c, d, a);
    const o4 = journeyOrientation(c, d, b);
    return (o1 * o2 < 0) && (o3 * o4 < 0);
  }

  function hasJourneySemanticConflict(candidate, previousPlacements, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const connector = getJourneyConnector(candidate);
    return previousPlacements.some((previous) => {
      if (candidate.markerX > previous.markerX && candidate.labelX < previous.labelX - 0.01) {
        return true;
      }
      if (candidate.markerX < previous.markerX && candidate.labelX > previous.labelX + 0.01) {
        return true;
      }
      if (journeySegmentsIntersect(connector, getJourneyConnector(previous))) {
        return true;
      }
      return false;
    });
  }

  function getJourneyIdealCandidate(label, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const titleY = label.markerY - 37;
    const dateY = titleY + config.titleDateGap;
    return {
      milestoneId: label.milestoneId,
      markerX: label.markerX,
      labelX: label.markerX,
      titleY,
      dateY,
      lane: 0,
      anchor: "middle",
      horizontalOffset: 0,
      bbox: buildJourneyCandidateBox(label, label.markerX, titleY, dateY, "middle", config),
      status: "ideal",
    };
  }

  function buildJourneyLabelClusters(labels, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const sorted = [...labels].sort((left, right) => left.markerX - right.markerX || String(left.milestoneId).localeCompare(String(right.milestoneId)));
    const clusters = [];
    let current = [];
    let currentRight = Number.NEGATIVE_INFINITY;
    sorted.forEach((label) => {
      const ideal = getJourneyIdealCandidate(label, config);
      const padded = inflateJourneyRect(ideal.bbox, config.clusterTightGap);
      if (!current.length || padded.left <= currentRight) {
        current.push(label);
        currentRight = Math.max(currentRight, padded.right);
        return;
      }
      clusters.push(current);
      current = [label];
      currentRight = padded.right;
    });
    if (current.length) {
      clusters.push(current);
    }
    return clusters;
  }

  function computeJourneyClusterCost(placements, baseCost, inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    if (!placements.length) {
      return baseCost;
    }
    const offsets = placements.map((placement) => getJourneyVisualOffset(placement));
    const maxDisplacement = Math.max(...offsets.map((offset) => Math.abs(offset)));
    const compoundDisplacement = placements.reduce((total, placement) => (
      total + (Math.abs(getJourneyVisualOffset(placement)) * (placement.lane + 1))
    ), 0);
    const sorted = [...placements].sort((left, right) => left.markerX - right.markerX || String(left.milestoneId).localeCompare(String(right.milestoneId)));
    const gaps = [];
    for (let index = 1; index < sorted.length; index += 1) {
      gaps.push(sorted[index].labelX - sorted[index - 1].labelX);
    }
    const meanGap = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.abs(gap - meanGap), 0);
    const midpoint = (placements.length - 1) / 2;
    const meanWidth = sorted.reduce((total, placement) => total + (placement.bbox.right - placement.bbox.left), 0) / sorted.length;
    const expansionTarget = sorted.length > 1
      ? Math.min(sorted.length > 2 ? 132 : 72, meanWidth * (sorted.length > 2 ? 0.68 : 0.5))
      : 0;
    const expansionPenalty = sorted.reduce((total, placement, index) => {
      const direction = index - midpoint;
      const offset = getJourneyVisualOffset(placement);
      const desiredOffset = midpoint > 0 ? (direction / midpoint) * expansionTarget : 0;
      if (direction < 0 && offset > 0) {
        return total + Math.abs(offset) + Math.abs(offset - desiredOffset);
      }
      if (direction > 0 && offset < 0) {
        return total + Math.abs(offset) + Math.abs(offset - desiredOffset);
      }
      return total + Math.abs(offset - desiredOffset);
    }, 0);
    return (
      baseCost +
      (maxDisplacement * config.maxDisplacementWeight) +
      (compoundDisplacement * config.compoundDisplacementWeight) +
      (gapVariance * config.spacingConsistencyWeight) +
      (expansionPenalty * (sorted.length === 2 ? config.pairExpansionWeight : config.clusterExpansionWeight))
    );
  }

  function solveJourneyLabelCluster(labels, bounds, reservedRegions, previousPlacements, inputConfig = {}, options = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const labelsForPlacement = sortJourneyLabelsForPlacement(labels).map((label) => ({
      ...label,
      previousPlacement: label.previousPlacement || previousPlacements?.[label.milestoneId] || null,
    })).sort((left, right) => left.markerX - right.markerX || String(left.milestoneId).localeCompare(String(right.milestoneId)));
    const metrics = {
      candidateCount: 0,
      collisionChecks: 0,
      placedCount: 0,
      unresolvedCount: 0,
    };
    const beamWidth = labelsForPlacement.length >= 7
      ? Math.max(config.clusterBeamWidth, config.denseClusterBeamWidth)
      : config.clusterBeamWidth;
    let beams = [{ placements: [], cost: 0 }];

    labelsForPlacement.forEach((label) => {
      const candidates = buildJourneyLabelCandidates(label, config, options)
        .map((candidate) => ({
          ...candidate,
          cost: scoreJourneyLabelCandidate(candidate, label, bounds, config),
          status: candidate.isPrevious ? "stable" : "ok",
        }))
        .sort(compareJourneyCandidates);
      metrics.candidateCount += candidates.length;
      const nextBeams = [];
      beams.forEach((beam) => {
        const occupiedRegions = beam.placements.map((placement) => ({
          ...inflateJourneyRect(placement.bbox, config.collisionPadding),
          ownerId: placement.milestoneId,
          kind: "label",
        }));
        candidates.forEach((candidate) => {
          metrics.collisionChecks += beam.placements.length + reservedRegions.length;
          if (isJourneyCandidateHardInvalid(candidate, occupiedRegions, bounds, reservedRegions, config)) {
            return;
          }
          if (hasJourneySemanticConflict(candidate, beam.placements, config)) {
            return;
          }
          const placements = [...beam.placements, candidate];
          nextBeams.push({
            placements,
            cost: computeJourneyClusterCost(placements, beam.cost + candidate.cost, config),
          });
        });
      });
      nextBeams.sort((left, right) => left.cost - right.cost);
      beams = nextBeams.slice(0, beamWidth);
    });

    const chosen = beams[0];
    if (chosen?.placements.length === labelsForPlacement.length) {
      return {
        placements: chosen.placements,
        unresolvedCollisions: [],
        metrics: {
          ...metrics,
          placedCount: chosen.placements.length,
        },
      };
    }

    const placements = labelsForPlacement.map((label) => {
      const fallback = getJourneyIdealCandidate(label, config);
      return {
        ...fallback,
        status: "unresolved",
        cost: Number.POSITIVE_INFINITY,
      };
    });
    return {
      placements,
      unresolvedCollisions: labelsForPlacement.map((label) => ({ milestoneId: label.milestoneId, reason: "no-valid-cluster-candidate" })),
      metrics: {
        ...metrics,
        unresolvedCount: labelsForPlacement.length,
      },
    };
  }

  function placeJourneyLabels(labels, bounds, reservedRegions, previousPlacements, inputConfig = {}, options = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const placements = [];
    const unresolvedCollisions = [];
    const metrics = {
      candidateCount: 0,
      collisionChecks: 0,
      placedCount: 0,
      unresolvedCount: 0,
      clusterCount: 0,
    };
    const occupied = [];
    const clusters = buildJourneyLabelClusters(labels, config);
    metrics.clusterCount = clusters.length;

    clusters.forEach((cluster) => {
      const result = solveJourneyLabelCluster(
        cluster,
        bounds,
        [...reservedRegions, ...occupied],
        previousPlacements,
        config,
        options,
      );
      placements.push(...result.placements);
      unresolvedCollisions.push(...result.unresolvedCollisions);
      Object.entries(result.metrics).forEach(([key, value]) => {
        metrics[key] = (metrics[key] || 0) + value;
      });
      result.placements.forEach((placement) => {
        occupied.push({
          ...inflateJourneyRect(placement.bbox, config.collisionPadding),
          ownerId: placement.milestoneId,
          kind: "label",
        });
      });
    });

    return { placements, unresolvedCollisions, metrics };
  }

  function verifyJourneyLabelLayout(placements, reservedRegions = [], inputConfig = {}) {
    const config = mergeJourneyLabelConfig(inputConfig);
    const collisions = [];
    for (let index = 0; index < placements.length; index += 1) {
      const left = placements[index];
      const leftRect = inflateJourneyRect(left.bbox, config.collisionPadding);
      reservedRegions.forEach((region) => {
        if (intersectsJourneyRect(leftRect, inflateJourneyRect(region, region.padding || 0))) {
          collisions.push({
            milestoneIds: [left.milestoneId],
            kind: "reserved",
            regionKind: region.kind,
          });
        }
      });
      for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
        const right = placements[otherIndex];
        if (intersectsJourneyRect(leftRect, inflateJourneyRect(right.bbox, config.collisionPadding))) {
          collisions.push({
            milestoneIds: [left.milestoneId, right.milestoneId],
            kind: "label",
          });
        }
      }
    }
    const chronological = [...placements].sort((left, right) => left.markerX - right.markerX || String(left.milestoneId).localeCompare(String(right.milestoneId)));
    for (let index = 1; index < chronological.length; index += 1) {
      const previous = chronological[index - 1];
      const current = chronological[index];
      if (current.labelX < previous.labelX - 0.01) {
        collisions.push({
          milestoneIds: [previous.milestoneId, current.milestoneId],
          kind: "chronological-order",
        });
      }
    }
    for (let index = 0; index < placements.length; index += 1) {
      const left = placements[index];
      const leftConnector = getJourneyConnector(left);
      for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
        const right = placements[otherIndex];
        const rightConnector = getJourneyConnector(right);
        if (journeySegmentsIntersect(leftConnector, rightConnector)) {
          collisions.push({
            milestoneIds: [left.milestoneId, right.milestoneId],
            kind: "connector-crossing",
          });
        }
      }
    }
    return {
      ok: collisions.length === 0,
      collisions,
    };
  }

  function solveJourneyLabelLayout(input = {}) {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const config = mergeJourneyLabelConfig(input.config);
    const labels = input.labels || [];
    const bounds = input.bounds || { left: 0, right: 1120, top: 0, bottom: 260, maxLabelBottom: 145 };
    const reservedRegions = input.reservedRegions || [];
    const previousPlacements = input.previousPlacements || {};
    const first = placeJourneyLabels(labels, bounds, reservedRegions, previousPlacements, config);
    let placements = first.placements;
    let unresolvedCollisions = [...first.unresolvedCollisions];
    let verification = verifyJourneyLabelLayout(placements, reservedRegions, config);
    let repairPasses = 0;

    while (!verification.ok && repairPasses < config.maxRepairPasses) {
      repairPasses += 1;
      const affectedIds = new Set(verification.collisions.flatMap((collision) => collision.milestoneIds));
      const frozenPlacements = placements.filter((placement) => !affectedIds.has(placement.milestoneId));
      const frozenRegions = frozenPlacements.map((placement) => ({
        ...inflateJourneyRect(placement.bbox, config.collisionPadding),
        ownerId: placement.milestoneId,
        kind: "label",
      }));
      const repairLabels = labels.filter((label) => affectedIds.has(label.milestoneId));
      const repairPrevious = Object.fromEntries(
        repairLabels.map((label) => [label.milestoneId, previousPlacements[label.milestoneId] || null]),
      );
      const repaired = placeJourneyLabels(
        repairLabels,
        bounds,
        [...reservedRegions, ...frozenRegions],
        repairPrevious,
        config,
        { repair: true },
      );
      placements = [...frozenPlacements, ...repaired.placements];
      unresolvedCollisions = [...unresolvedCollisions, ...repaired.unresolvedCollisions];
      verification = verifyJourneyLabelLayout(placements, reservedRegions, config);
    }

    const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const status = unresolvedCollisions.length
      ? "unresolved"
      : verification.ok ? "ok" : "constrained";
    return {
      placements: placements.sort((left, right) => left.markerX - right.markerX || String(left.milestoneId).localeCompare(String(right.milestoneId))),
      unresolvedCollisions,
      metrics: {
        ...first.metrics,
        verificationCollisions: verification.collisions.length,
        repairPasses,
        durationMs: endedAt - startedAt,
      },
      status,
    };
  }

  return {
    DEFAULT_CONFIG,
    buildJourneyLabelCandidates,
    intersectsJourneyRect,
    scoreJourneyLabelCandidate,
    solveJourneyLabelLayout,
    verifyJourneyLabelLayout,
  };
});
