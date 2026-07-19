from __future__ import annotations

import socket
import threading
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import pytest
import uvicorn

pytest.importorskip("playwright.sync_api")
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page, expect, sync_playwright

from boa.api import create_app
from boa.storage import BoaStorage


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@pytest.fixture()
def boa_url(tmp_path: Path) -> str:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    port = _free_port()
    server = uvicorn.Server(
        uvicorn.Config(
            app=app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
        )
    )
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{port}"

    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"{base_url}/api/health", timeout=0.25) as response:
                if response.status == 200:
                    break
        except OSError:
            time.sleep(0.05)
    else:
        server.should_exit = True
        thread.join(timeout=5)
        pytest.fail("Timed out waiting for Boa test server to start.")

    try:
        yield base_url
    finally:
        server.should_exit = True
        thread.join(timeout=5)


@pytest.fixture()
def page(boa_url: str):
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(accept_downloads=True, viewport={"width": 1366, "height": 900})
            page = context.new_page()
            page.goto(boa_url)
            expect(page.locator("#status-pill")).to_contain_text("Waiting")
            yield page
            context.close()
            browser.close()
    except PlaywrightError as exc:
        if "Executable doesn't exist" in str(exc) or "looks like Playwright was just installed" in str(exc):
            pytest.skip("Playwright browser runtime is missing. Run: uv run playwright install chromium")
        raise


def begin_new_journey(page: Page, *, product: str, version: str, secret: str) -> None:
    page.locator("#new-release-button").click()
    expect(page.locator("#journey-action-menu")).to_be_visible()
    page.locator("#new-journey-option").click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-kicker")).to_contain_text("Begin a Journey")
    page.locator("#journey-product").fill(product)
    page.locator("#journey-version").fill(version)
    page.locator("#journey-secret").fill(secret)


def create_release_via_api(page: Page, *, product: str, version: str, secret: str = "secret") -> dict:
    return page.evaluate(
        """async ([product, version, secret]) => {
            const response = await fetch('/api/releases', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product, version, secret }),
            });
            if (!response.ok) throw new Error(await response.text());
            return response.json();
        }""",
        [product, version, secret],
    )


def update_milestone_via_api(page: Page, milestone: dict, *, expected: date, owner: str | None = None) -> None:
    page.evaluate(
        """async ([milestone, expected, owner]) => {
            const response = await fetch(`/api/milestones/${milestone.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: milestone.name,
                expected,
                owner: owner || milestone.owner,
              }),
            });
            if (!response.ok) throw new Error(await response.text());
        }""",
        [milestone, expected.isoformat(), owner],
    )


def ack_milestone_via_api(page: Page, milestone_id: int, *, secret: str = "secret", ack_name: str = "qa") -> None:
    page.evaluate(
        """async ([milestoneId, secret, ackName]) => {
            const response = await fetch(`/api/milestones/${milestoneId}/ack`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ secret, ack_name: ackName }),
            });
            if (!response.ok) throw new Error(await response.text());
        }""",
        [milestone_id, secret, ack_name],
    )


def acknowledge_from_dialog(page: Page, *, secret: str, note: str | None = None) -> None:
    page.locator("#ack-secret").fill(secret)
    if note is not None:
        page.locator("#ack-note").fill(note)
    page.locator("#ack-submit-button").click()
    expect(page.locator("#ack-message")).to_contain_text("Press again to confirm")
    expect(page.locator("#ack-submit-button")).to_contain_text("Confirmed?")
    page.wait_for_timeout(750)
    page.locator("#ack-submit-button").click()


def release_row(page: Page, text: str):
    return page.locator(".release-row").filter(has_text=text)


def test_landing_timeline_begin_menu_create_duplicate_and_now_controls(page: Page) -> None:
    expect(page.locator(".brand-name")).to_have_text("BOA")
    expect(page.locator(".brand-tagline")).to_contain_text("reveal the shape of a journey")
    expect(page.locator("#timeline-board")).to_be_attached()
    expect(page.locator("#empty-state")).to_be_visible()

    begin_new_journey(page, product="FortiSASE", version="26.4-e2e", secret="boa-e2e")
    page.locator("#journey-add-milestone").click()
    expect(page.locator("#journey-milestone-popover")).to_be_visible()
    page.locator("#journey-milestone-name").fill("Regression Ready")
    page.locator("#journey-milestone-owner").fill("qa@example.com")
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()
    expect(page.locator(".release-row")).to_have_count(1)
    expect(page.locator(".release-product")).to_contain_text("FortiSASE")
    expect(page.locator(".release-version")).to_contain_text("26.4-e2e")
    expect(page.locator(".milestone-marker")).to_have_count(3)

    begin_new_journey(page, product="FortiSASE", version="26.4-e2e", secret="boa-e2e")
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-message")).to_contain_text("FortiSASE 26.4-e2e already exists.")
    page.locator("#close-journey-dialog-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()

    top_toggle = page.locator('[data-now-toggle="top"]')
    bottom_toggle = page.locator('[data-now-toggle="bottom"]')
    expect(top_toggle).to_be_visible()
    expect(bottom_toggle).to_be_visible()
    top_toggle.click()
    expect(top_toggle).to_have_attribute("aria-expanded", "true")
    bottom_toggle.click()
    expect(bottom_toggle).to_have_attribute("aria-expanded", "true")


def test_yaml_import_preview_opens_begin_dialog_and_creates_journey(page: Page, tmp_path: Path) -> None:
    blueprint = tmp_path / "journey.yaml"
    blueprint.write_text(
        """
product: FortiGate
version: 7.6-e2e
secret: fg-e2e
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
  - name: Beta
    expected: 2026-02-01
    owner: qa
  - name: GA Release
    expected: 2026-03-30
    owner: manager
""".strip(),
        encoding="utf-8",
    )

    page.locator("#new-release-button").click()
    page.locator("#import-journey-option").click()
    expect(page.locator("#import-dialog")).to_be_visible()
    page.locator("#import-file").set_input_files(str(blueprint))
    page.locator("button[form='import-form']").click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-message")).to_contain_text("FortiGate 7.6-e2e is ready to begin.")
    expect(page.locator("#journey-product")).to_have_value("FortiGate")
    expect(page.locator("#journey-version")).to_have_value("7.6-e2e")
    expect(page.locator("#journey-secret")).to_have_value("fg-e2e")
    expect(page.locator("#journey-timeline .journey-marker")).to_have_count(3)

    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()
    expect(page.locator(".release-row")).to_have_count(1)
    expect(page.locator(".release-product")).to_contain_text("FortiGate")


def test_ack_edit_and_move_milestone_surfaces(page: Page) -> None:
    begin_new_journey(page, product="FortiClient", version="8.0-e2e", secret="fc-e2e")
    page.locator("#journey-create-button").click()
    expect(page.locator(".release-row")).to_have_count(1)

    page.locator(".pending-marker").first.click()
    expect(page.locator("#ack-dialog")).to_be_visible()
    expect(page.locator("#ack-milestone-name")).to_contain_text("Kickoff")
    acknowledge_from_dialog(page, secret="fc-e2e", note="QA saw the kickoff checkpoint.")
    expect(page.locator("#ack-dialog")).not_to_be_visible()
    expect(page.locator(".ack-marker")).to_have_count(1)

    page.locator(".release-menu-button").click()
    page.locator('.release-menu-item[data-action="settings"]').click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-kicker")).to_contain_text("Tend Journey")
    page.locator("#journey-secret").fill("fc-e2e")
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()

    release_id = page.evaluate("fetch('/api/timeline').then((r) => r.json()).then((items) => items[0].id)")
    assert release_id

    before = page.evaluate(
        "() => fetch('/api/timeline').then((r) => r.json()).then((items) => items[0].milestones[0].expected)"
    )
    page.locator(".release-menu-button").click()
    page.locator('.release-menu-item[data-action="settings"]').click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    hit = page.locator("#journey-timeline .journey-milestone-hit").first
    box = hit.bounding_box()
    assert box is not None
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] / 2 + 90, box["y"] + box["height"] / 2)
    page.mouse.up()
    page.locator("#journey-secret").fill("fc-e2e")
    page.locator("#journey-create-button").click()
    expect(page.locator("#status-pill")).to_contain_text("Journey saved")
    after = page.evaluate(
        "() => fetch('/api/timeline').then((r) => r.json()).then((items) => items[0].milestones[0].expected)"
    )
    assert after != before


def test_plugin_manual_payload_and_bug_wave_filters(page: Page) -> None:
    begin_new_journey(page, product="FortiAnalyzer", version="7.8-e2e", secret="faz-e2e")
    page.locator("#journey-create-button").click()
    expect(page.locator(".release-row")).to_have_count(1)
    release_id = page.evaluate("fetch('/api/timeline').then((r) => r.json()).then((items) => items[0].id)")

    page.evaluate(
        """async (releaseId) => {
            const payloads = [
              { open_bug_count: 15 },
              { open_bug_count: 100000 },
              { open_bug_count: 12, signal_type: "security" },
            ];
            for (const payload of payloads) {
              const response = await fetch(`/api/releases/${releaseId}/bug-snapshots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!response.ok) throw new Error(await response.text());
            }
        }""",
        release_id,
    )

    snapshots = page.evaluate(f"fetch('/api/releases/{release_id}/bug-snapshots').then((r) => r.json())")
    assert [snapshot["signal_type"] for snapshot in snapshots] == ["total", "total", "security"]
    assert [snapshot["quality"] for snapshot in snapshots] == ["normal", "suspicious", "normal"]
    assert all("date" not in snapshot for snapshot in snapshots)

    page.reload()
    expect(page.locator(".wave-source")).to_have_count(1)
    expect(page.locator(".wave-source title")).to_contain_text("15 open bugs")


def test_download_delete_fold_hover_and_ack_date_states(page: Page) -> None:
    today = date.today()

    ended = create_release_via_api(page, product="EndedFold", version="1.0")
    update_milestone_via_api(page, ended["milestones"][0], expected=today - timedelta(days=50))
    update_milestone_via_api(page, ended["milestones"][1], expected=today - timedelta(days=35))
    ack_milestone_via_api(page, ended["milestones"][1]["id"])

    upcoming = create_release_via_api(page, product="FutureFold", version="1.0")
    update_milestone_via_api(page, upcoming["milestones"][0], expected=today + timedelta(days=35))
    update_milestone_via_api(page, upcoming["milestones"][1], expected=today + timedelta(days=70))

    state_release = create_release_via_api(page, product="AckState", version="1.0", secret="state-secret")
    update_milestone_via_api(page, state_release["milestones"][0], expected=today + timedelta(days=5))
    update_milestone_via_api(page, state_release["milestones"][1], expected=today + timedelta(days=25))
    ack_milestone_via_api(page, state_release["milestones"][0]["id"], secret="state-secret")

    removable = create_release_via_api(page, product="DeleteMe", version="1.0", secret="remove-secret")
    page.reload()
    expect(release_row(page, "AckState")).to_be_visible()

    page.locator(".legend-trigger").hover()
    expect(page.locator(".timeline-legend")).to_be_visible()
    expect(page.locator(".timeline-legend")).to_contain_text("Expected")

    expect(release_row(page, "EndedFold")).to_have_count(0)
    expect(release_row(page, "FutureFold")).to_have_count(0)
    top_toggle = page.locator('[data-now-toggle="top"]')
    bottom_toggle = page.locator('[data-now-toggle="bottom"]')
    top_toggle.click()
    expect(top_toggle).to_have_attribute("aria-expanded", "true")
    expect(top_toggle.locator("span")).to_have_text("-")
    expect(release_row(page, "EndedFold")).to_be_visible()
    top_toggle.click()
    expect(top_toggle).to_have_attribute("aria-expanded", "false")
    expect(top_toggle.locator("span")).to_have_text("+")
    expect(release_row(page, "EndedFold")).to_have_count(0)

    bottom_toggle.click()
    expect(bottom_toggle).to_have_attribute("aria-expanded", "true")
    expect(bottom_toggle.locator("span")).to_have_text("-")
    expect(release_row(page, "FutureFold")).to_be_visible()
    bottom_toggle.click()
    expect(bottom_toggle).to_have_attribute("aria-expanded", "false")
    expect(bottom_toggle.locator("span")).to_have_text("+")
    expect(release_row(page, "FutureFold")).to_have_count(0)

    state_row = release_row(page, "AckState")
    expect(state_row.locator(".ack-marker")).to_have_count(1)
    expect(state_row.locator(".overdue-marker")).to_have_count(0)

    state_row.locator(".release-menu-button").click()
    state_row.locator('.release-menu-item[data-action="settings"]').click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-product")).to_have_value("AckState")
    expect(page.locator("#journey-version")).to_have_value("1.0")
    expect(page.locator("#journey-product")).to_be_disabled()
    expect(page.locator("#journey-version")).to_be_disabled()
    page.locator("#journey-secret").fill("state-secret")
    page.locator("#journey-create-button").click()
    expect(page.locator("#status-pill")).to_contain_text("Journey saved")
    update_milestone_via_api(page, state_release["milestones"][0], expected=today - timedelta(days=2))
    page.reload()
    edited_row = release_row(page, "AckState")
    expect(edited_row.locator(".overdue-marker")).to_have_count(1)

    update_milestone_via_api(page, state_release["milestones"][0], expected=today + timedelta(days=10))
    page.reload()
    edited_row = release_row(page, "AckState")
    expect(edited_row.locator(".ack-marker")).to_have_count(1)
    expect(edited_row.locator(".overdue-marker")).to_have_count(0)

    delete_row = release_row(page, "DeleteMe")
    delete_row.locator(".release-menu-button").click()
    with page.expect_download() as download_info:
        delete_row.locator('.release-menu-item[data-action="export"]').click()
    download = download_info.value
    assert download.suggested_filename == "deleteme-1-0.yaml"

    dialogs = iter(["remove-secret", True])

    def handle_dialog(dialog):
        response = next(dialogs)
        if response is True:
            dialog.accept()
        else:
            dialog.accept(response)

    page.on("dialog", handle_dialog)
    delete_row.locator(".release-menu-button").click()
    delete_row.locator('.release-menu-item[data-action="delete"]').click()
    page.wait_for_function("document.querySelector('#status-pill')?.textContent !== 'Deleting'")
    if page.locator("#status-pill").text_content() == "Delete failed":
        pytest.fail(page.locator("#edit-message").text_content())
    expect(page.locator("#status-pill")).to_contain_text("Journey removed")
    expect(release_row(page, "DeleteMe")).to_have_count(0)
    releases = page.evaluate("fetch('/api/timeline').then((response) => response.json())")
    assert all(release["id"] != removable["id"] for release in releases)


def test_engine_room_shows_email_delivery_disabled(page: Page) -> None:
    """The Engine Room exposes email delivery status without leaking credentials."""
    page.locator("#engine-button").click()
    expect(page.locator("#engine-dialog")).to_be_visible()
    expect(page.locator("#engine-smtp-title")).to_contain_text("Email delivery")
    expect(page.locator("#engine-smtp-status")).to_contain_text("Disabled")
    expect(page.locator("#engine-smtp-message")).to_contain_text("not enabled")
    expect(page.locator("#engine-smtp-host")).to_contain_text("Not set")
    expect(page.locator("#engine-smtp-from")).to_contain_text("Boa")
    expect(page.locator("#engine-smtp-security")).to_contain_text("STARTTLS")
    expect(page.locator("#engine-smtp-send-button")).to_be_disabled()

    page.locator("#close-engine-dialog-button").click()
    expect(page.locator("#engine-dialog")).not_to_be_visible()
