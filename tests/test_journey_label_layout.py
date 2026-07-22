import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOLVER = ROOT / "src" / "boa" / "static" / "journey-label-layout.js"


def run_solver(script: str):
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout)


def solver_script(body: str) -> str:
    return f"""
const layout = require({json.dumps(str(SOLVER))});
function label(id, markerX, width = 90, priority = 1) {{
  return {{
    milestoneId: id,
    markerX,
    markerY: 170,
    titleWidth: width,
    titleHeight: 13,
    dateWidth: 58,
    dateHeight: 11,
    combinedWidth: Math.max(width, 58),
    combinedHeight: 28,
    priority
  }};
}}
const bounds = {{ left: 90, right: 1010, top: 0, bottom: 260, maxLabelBottom: 162 }};
const reservedRegions = [
  {{ left: 82, right: 1018, top: 162, bottom: 235, padding: 0, kind: "timeline" }}
];
const config = {{
  maxLanes: 7,
  laneHeight: 24,
  collisionPadding: 2,
  boundaryPadding: 8,
  topSafeMargin: 20,
  candidateOffsets: [0, -12, 12, -24, 24, -40, 40, -60, 60, -84, 84, -120, 120, -156, 156, -192, 192, -240, 240],
  repairCandidateOffsets: [0, -12, 12, -24, 24, -40, 40, -60, 60, -84, 84, -120, 120, -156, 156, -192, 192, -240, 240],
  maxRepairPasses: 1
}};
{body}
"""


def test_one_milestone_remains_centered_and_marker_x_is_immutable():
    output = run_solver(solver_script("""
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 300)], bounds, reservedRegions, config });
const p = result.placements[0];
console.log(JSON.stringify({ status: result.status, markerX: p.markerX, labelX: p.labelX, lane: p.lane, bottom: p.bbox.bottom }));
"""))
    assert output["status"] == "ok"
    assert output["markerX"] == 300
    assert output["labelX"] == 300
    assert output["lane"] == 0
    assert output["bottom"] <= 162


def test_two_distant_milestones_remain_centered():
    output = run_solver(solver_script("""
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 250), label("b", 650)], bounds, reservedRegions, config });
console.log(JSON.stringify(result.placements.map((p) => [p.milestoneId, p.labelX, p.lane])));
"""))
    assert output == [["a", 250, 0], ["b", 650, 0]]


def test_two_colliding_labels_separate_without_moving_markers():
    output = run_solver(solver_script("""
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 420, 130), label("b", 450, 130)], bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
console.log(JSON.stringify({
  ok: verification.ok,
  placements: result.placements.map((p) => ({ id: p.milestoneId, markerX: p.markerX, labelX: p.labelX, lane: p.lane, anchor: p.anchor }))
}));
"""))
    assert output["ok"] is True
    assert {item["markerX"] for item in output["placements"]} == {420, 450}
    assert output["placements"][0]["labelX"] <= output["placements"][1]["labelX"]


def test_dense_labels_move_into_upper_lanes_and_never_below_timeline():
    output = run_solver(solver_script("""
const labels = Array.from({ length: 5 }, (_, index) => label(`m${index}`, 430 + index * 16, 112));
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
console.log(JSON.stringify({ status: result.status, placements: result.placements.map((p) => ({ lane: p.lane, bottom: p.bbox.bottom })) }));
"""))
    assert output["status"] in ["ok", "constrained"]
    assert max(item["lane"] for item in output["placements"]) > 0
    assert all(item["bottom"] <= 152 for item in output["placements"])


def test_long_labels_do_not_overlap_when_space_exists():
    output = run_solver(solver_script("""
const labels = [label("a", 420, 170), label("b", 500, 170), label("c", 580, 170)];
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
console.log(JSON.stringify({ status: result.status, ok: verification.ok }));
"""))
    assert output["ok"] is True
    assert output["status"] == "ok"


def test_left_and_right_edge_labels_remain_inside_bounds():
    output = run_solver(solver_script("""
const result = layout.solveJourneyLabelLayout({ labels: [label("left", 95, 130), label("right", 1005, 130)], bounds, reservedRegions, config });
console.log(JSON.stringify(result.placements.map((p) => ({ left: p.bbox.left, right: p.bbox.right }))));
"""))
    assert all(item["left"] >= 90 for item in output)
    assert all(item["right"] <= 1010 for item in output)


def test_top_safe_margin_and_reserved_regions_are_respected():
    output = run_solver(solver_script("""
const tightConfig = { ...config, maxLanes: 7, laneHeight: 22, topSafeMargin: 24 };
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 430, 110), label("b", 448, 110), label("c", 466, 110)], bounds, reservedRegions, config: tightConfig });
console.log(JSON.stringify(result.placements.map((p) => ({ top: p.bbox.top, bottom: p.bbox.bottom }))));
"""))
    assert all(item["top"] >= 30 for item in output)
    assert all(item["bottom"] <= 152 for item in output)


def test_layout_is_deterministic_for_stable_input():
    output = run_solver(solver_script("""
const labels = [label("a", 420, 130), label("b", 450, 130), label("c", 480, 130)];
const first = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const second = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
console.log(JSON.stringify({ first: first.placements, second: second.placements }));
"""))
    assert output["first"] == output["second"]


def test_previous_valid_placement_is_preserved_and_invalid_previous_is_rejected():
    output = run_solver(solver_script("""
const previousPlacements = {
  a: { milestoneId: "a", markerX: 420, labelX: 380, titleY: 112, dateY: 125, lane: 1, anchor: "middle", horizontalOffset: -40, status: "ok" },
  b: { milestoneId: "b", markerX: 452, labelX: 452, titleY: 170, dateY: 183, lane: 0, anchor: "middle", horizontalOffset: 0, status: "ok" }
};
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 420, 120), label("b", 452, 120)], bounds, reservedRegions, previousPlacements, config });
console.log(JSON.stringify(result.placements.map((p) => ({ id: p.milestoneId, labelX: p.labelX, titleY: p.titleY, status: p.status }))));
"""))
    stable = next(item for item in output if item["id"] == "a")
    invalid = next(item for item in output if item["id"] == "b")
    assert stable["labelX"] == 380
    assert stable["status"] == "stable"
    assert invalid["titleY"] < 152


def test_solver_terminates_and_reports_unresolved_when_space_is_impossible():
    output = run_solver(solver_script("""
const impossibleBounds = { left: 300, right: 360, top: 0, bottom: 260, maxLabelBottom: 152 };
const result = layout.solveJourneyLabelLayout({ labels: [label("a", 330, 220), label("b", 335, 220)], bounds: impossibleBounds, reservedRegions, config: { ...config, maxLanes: 1, candidateOffsets: [0], repairCandidateOffsets: [0] } });
console.log(JSON.stringify({ status: result.status, unresolved: result.unresolvedCollisions.length, count: result.placements.length }));
"""))
    assert output["status"] == "unresolved"
    assert output["unresolved"] >= 1
    assert output["count"] == 2


def test_verification_repair_is_bounded_and_reports_metrics():
    output = run_solver(solver_script("""
const labels = Array.from({ length: 8 }, (_, index) => label(`m${index}`, 480 + index * 4, 160));
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config: { ...config, maxRepairPasses: 1 } });
console.log(JSON.stringify({ repairPasses: result.metrics.repairPasses, candidateCount: result.metrics.candidateCount, collisionChecks: result.metrics.collisionChecks }));
"""))
    assert output["repairPasses"] <= 1
    assert output["candidateCount"] > 0
    assert output["collisionChecks"] > 0


def test_phase_2_1_current_failure_cluster_remains_readable():
    output = run_solver(solver_script("""
const labels = [
  label("Kickoff", 420, 70, 3),
  label("Dev Ready", 448, 90, 2),
  label("Regression Ready", 476, 120, 2)
];
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
console.log(JSON.stringify({
  status: result.status,
  ok: verification.ok,
  placements: result.placements.map((p) => ({ markerX: p.markerX, labelX: p.labelX, bottom: p.bbox.bottom }))
}));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert [item["markerX"] for item in output["placements"]] == [420, 448, 476]
    assert all(item["bottom"] <= 152 for item in output["placements"])
    assert output["placements"][0]["labelX"] <= output["placements"][1]["labelX"] <= output["placements"][2]["labelX"]


def test_board_labels_prefer_lanes_over_large_visual_drift():
    output = run_solver(solver_script("""
const labels = [
  label("Regression Ready", 518, 72, 2),
  label("Kickoff", 536, 72, 3),
  label("Dev Ready", 540, 72, 2)
];
const boardConfig = {
  ...config,
  titleDateGap: 0,
  laneHeight: 18,
  maxLanes: 5,
  collisionPadding: 0,
  candidateOffsets: [0, -8, 8, -16, 16, -28, 28, -44, 44, -64, 64],
  repairCandidateOffsets: [0, -8, 8, -16, 16, -28, 28, -44, 44, -64, 64],
  maxVisualOffset: 32,
};
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config: boardConfig });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, boardConfig);
const visualOffsets = result.placements.map((p) => Math.round(((p.bbox.left + p.bbox.right) / 2) - p.markerX));
console.log(JSON.stringify({
  status: result.status,
  ok: verification.ok,
  lanes: result.placements.map((p) => p.lane),
  visualOffsets
}));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert max(abs(item) for item in output["visualOffsets"]) <= 32
    assert max(output["lanes"]) > 0


def test_phase_2_1_four_milestones_within_one_week_share_the_cluster():
    output = run_solver(solver_script("""
const labels = [
  label("a", 430, 86),
  label("b", 438, 110),
  label("c", 448, 96),
  label("d", 458, 104)
];
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
console.log(JSON.stringify({
  status: result.status,
  ok: verification.ok,
  lanes: result.placements.map((p) => p.lane),
  labelXs: result.placements.map((p) => p.labelX)
}));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert max(output["lanes"]) > 0
    assert output["labelXs"] == sorted(output["labelXs"])


def test_phase_2_1_five_long_titles_avoid_single_sacrificial_label():
    output = run_solver(solver_script("""
const labels = [
  label("Discovery Alignment Complete", 390, 180),
  label("Implementation Window Ready", 430, 190),
  label("Partner Validation Checkpoint", 470, 210),
  label("Regression Readiness Review", 510, 205),
  label("Departure Approval Council", 550, 190)
];
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
const visualOffsets = result.placements.map((p) => Math.round(((p.bbox.left + p.bbox.right) / 2) - p.markerX));
console.log(JSON.stringify({ status: result.status, ok: verification.ok, visualOffsets }));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert max(abs(item) for item in output["visualOffsets"]) <= 260
    assert sum(1 for item in output["visualOffsets"] if abs(item) >= 40) >= 2


def test_phase_2_1_alternating_short_and_long_titles_preserve_order():
    output = run_solver(solver_script("""
const labels = [
  label("A", 390, 36),
  label("Long Middle Milestone", 420, 160),
  label("B", 450, 36),
  label("Another Long Milestone", 480, 170),
  label("C", 510, 36)
];
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
console.log(JSON.stringify({
  status: result.status,
  ok: verification.ok,
  labelXs: result.placements.map((p) => p.labelX)
}));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert output["labelXs"] == sorted(output["labelXs"])


def test_phase_2_1_dense_release_planning_timeline_expands_as_a_cluster():
    output = run_solver(solver_script("""
const names = ["Kickoff", "Design Contour", "Dev Ready", "Preview Signoff", "Regression Ready", "Launch Council", "GA Release"];
const labels = names.map((name, index) => label(name, 420 + index * 14, index % 2 ? 150 : 90));
const result = layout.solveJourneyLabelLayout({ labels, bounds, reservedRegions, config });
const verification = layout.verifyJourneyLabelLayout(result.placements, reservedRegions, config);
const visualOffsets = result.placements.map((p) => Math.round(((p.bbox.left + p.bbox.right) / 2) - p.markerX));
console.log(JSON.stringify({
  status: result.status,
  ok: verification.ok,
  visualOffsets,
  markerXs: result.placements.map((p) => p.markerX),
  labelXs: result.placements.map((p) => p.labelX),
  bottomMax: Math.max(...result.placements.map((p) => p.bbox.bottom))
}));
"""))
    assert output["status"] == "ok"
    assert output["ok"] is True
    assert output["markerXs"] == [420, 434, 448, 462, 476, 490, 504]
    assert output["labelXs"] == sorted(output["labelXs"])
    assert output["bottomMax"] <= 152
    assert max(abs(item) for item in output["visualOffsets"]) <= 260
    assert sum(1 for item in output["visualOffsets"] if abs(item) >= 40) >= 4
