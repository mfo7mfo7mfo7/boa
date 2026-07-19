from __future__ import annotations

import socket
import threading
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import pytest
import uvicorn
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
        pytest.fail("Timed out waiting for Boa test server to．")

    yield base_url
    server.should_exit = True
    thread.join(timeout=5)

@pytest.fixture()
def page(boa_url: str):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True, viewport={"width": 1366, "height": 900})
        page = context.new_page()
        page.goto(boa_url)
        expect(page.locator("#status-pill")).to_contain_text("Waiting")
        yield page
        context.close()
        browser.close()

def begin_new_journey(page: Page, *, product: str, version: str, secret: str) -> None:
    page.locator("#new-release-button").click()
    expect(page.locator("#journey-action-menu")).to_be_visible()
    page.locator("#new-journey-option").click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-kicker")).to_contain_text("Begin a Journey")
    page.locator("#journey-product").fill(product)
    page.locator("#journey-version").fill(version)
    page.locator("#journey-secret").fill(secret)

def test_acknowledge_milestone_with_wrong_secret(page: Page) -> None:
    # 1. Create a journey with a known secret
    secret = "correct-secret"
    begin_new_journey(page, product="TestProduct", version="1.0", secret=secret)
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()
    expect(page.locator(".release-row")).to_have_count(1)

    # 2. Wait for the timeline to load and find a milestone
    # We'll use the first milestone (Kickoff) which is added by default
    page.wait_for_selector(".pending-marker")
    page.locator(".pending-marker").first.click()

    # 3. Verify the Ack dialog is open
    expect(page.locator("#ack-dialog")).to_be_visible()
    expect(page.locator("#ack-milestone-name")).to_contain_text("Kickoff")

    # 4. Try to acknowledge with the WRONG secret
    page.locator("#ack-secret").fill("wrong-secret")
    page.locator("#ack-submit-button").click()
    expect(page.locator("#ack-message")).to_contain_text("Press again to confirm")
    page.wait_for_timeout(750)
    page.locator("#ack-submit-button").click()

    # 5. Verify that the error message is displayed in the UI
    expect(page.locator("#ack-message")).to_contain_text("The journey key did not match.")

    # 6. Check that the dialog is still open (it shouldn't close on failure)
    expect(page.locator("#ack-dialog")).to_be_visible()

def test_tend_journey_requires_the_current_journey_key(page: Page) -> None:
    # 1. Create a journey with a known key
    journey_key = "correct-journey-key"
    begin_new_journey(page, product="TestProduct", version="1.0", secret=journey_key)
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()

    # 2. Open the Edit Release dialog
    page.locator(".release-menu-button").first.click()
    page.locator('.release-menu-item[data-action="settings"]').click()
    expect(page.locator("#journey-dialog")).to_be_visible()
    expect(page.locator("#journey-kicker")).to_contain_text("Tend Journey")

    # 3. A wrong key cannot save changes
    page.locator("#journey-secret").fill("wrong-journey-key")
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-message")).to_contain_text("Enter the correct journey key to save changes.")
    expect(page.locator("#journey-dialog")).to_be_visible()

    # 4. The current key permits the edit flow to save
    page.locator("#journey-secret").fill(journey_key)
    page.locator("#journey-create-button").click()
    expect(page.locator("#journey-dialog")).not_to_be_visible()
