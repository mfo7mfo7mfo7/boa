"""Tests for Boa email template rendering."""

from __future__ import annotations

from datetime import date, datetime, timezone

from boa.domain import BugSnapshot, MilestoneRecord, ReleaseBlueprint, ReleaseRecord, ReleaseStarlight, StarlightDetail, StarlightMetrics, StarlightStatus
from boa.email_templates import render_ack_request_email, render_reading_post_email, render_reminder_email


def _sample_release() -> ReleaseRecord:
    return ReleaseRecord(
        id=1,
        blueprint=ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(),
        ),
    )


def _sample_milestone() -> MilestoneRecord:
    return MilestoneRecord(
        id=10,
        release_id=1,
        name="Dev Ready",
        expected=date(2026, 7, 21),
        owner="lin",
        email="lin@example.com",
    )


def test_ack_request_email_includes_subtle_fallback_link() -> None:
    _, _, body_html = render_ack_request_email(
        _sample_release(),
        _sample_milestone(),
        token="secret-token",
        base_url="https://boa.example",
    )

    ack_url = "https://boa.example/ack/secret-token"
    assert "Acknowledge" in body_html
    assert "If the green path does not open, this quiet link leads to the same place:" in body_html
    assert body_html.count(f'href="{ack_url}"') == 2
    assert f">{ack_url}</a>" in body_html


def test_reminder_email_includes_subtle_fallback_link() -> None:
    _, _, body_html = render_reminder_email(
        _sample_release(),
        _sample_milestone(),
        token="reminder-token",
        base_url="https://boa.example",
    )

    ack_url = "https://boa.example/ack/reminder-token"
    assert "Acknowledge" in body_html
    assert "If the green path does not open, this quiet link leads to the same place:" in body_html
    assert body_html.count(f'href="{ack_url}"') == 2
    assert f">{ack_url}</a>" in body_html


def test_reading_post_email_renders_page_notes_as_markdown() -> None:
    release = _sample_release()
    starlight = ReleaseStarlight(
        current=StarlightStatus(
            release_id=release.id,
            starlight=73,
            whisper="The journey is steady.",
            detail=StarlightDetail(
                type="markdown",
                content=(
                    "## NFR Detail\n\n"
                    "### Backlog Composition\n"
                    "- **Remaining NFRs:** 27 records identified in the `nfr_not_ready` list.\n"
                    "- *Readiness:* All 27 remaining records are marked as `is_ready: 0`.\n\n"
                    "### Status & Readiness Analysis\n"
                    "| Status | Count | Readiness |\n"
                    "| :--- | ---: | :--- |\n"
                    "| **Assigned** | 16 | Not Ready |\n"
                    "| **Resolved** | 11 | Not Ready |\n\n"
                    "*Observation:* 11 NFRs are marked as `resolved` but remain `not ready`.\n"
                ),
            ),
                metrics=StarlightMetrics(done=4, total=24, blocked=3),
                observed_on=date(2026, 7, 27),
                updated_at=datetime(2026, 7, 27, 18, 0, tzinfo=timezone.utc),
            ),
        trail=(),
    )
    storm = BugSnapshot(
        id=1,
        release_id=release.id,
        observed_at=datetime(2026, 7, 27, 18, 0, tzinfo=timezone.utc),
        signal_type="total",
        open_bug_count=58,
    )

    _, _, body_html = render_reading_post_email(release, starlight=starlight, storm=storm)

    assert "## NFR Detail" not in body_html
    assert "<h2>NFR Detail</h2>" in body_html
    assert "<ul>" in body_html
    assert "<table" in body_html
    assert "<strong>Remaining NFRs:</strong>" in body_html
    assert "<em>Readiness:</em>" in body_html
    assert "<code>nfr_not_ready</code>" in body_html
