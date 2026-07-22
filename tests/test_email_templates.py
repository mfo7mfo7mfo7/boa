"""Tests for Boa email template rendering."""

from __future__ import annotations

from datetime import date

from boa.domain import MilestoneRecord, ReleaseBlueprint, ReleaseRecord
from boa.email_templates import render_ack_request_email, render_reminder_email


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
