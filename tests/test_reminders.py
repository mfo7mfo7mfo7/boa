"""Tests for the Boa 1.8 Reminder Engine with email delivery."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from boa.api import create_app
from boa.domain import Milestone, ReleaseBlueprint
from boa.storage import BoaStorage


def test_send_due_reminder_emails_generates_notifications_and_sends_emails(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
        "BOA_BASE_URL": "http://localhost:8000",
    }
    monkeypatch.setattr("os.environ", env)

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        release_id = created["id"]
        milestone_id = created["milestones"][0]["id"]

        tomorrow = date.today() + timedelta(days=1)
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": tomorrow.isoformat(),
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

        sent_emails: list[dict] = []

        def fake_send_email(config, *, to, subject, body_text, body_html=None):
            sent_emails.append({"to": to, "subject": subject})

        monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

        response = client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["sent"] >= 1
        assert payload["failed"] == 0
        assert len(sent_emails) == payload["sent"]

    storage = BoaStorage(tmp_path / "boa.db")
    notifications = storage.list_notifications(milestone_id=milestone_id)
    assert len(notifications) >= 1
    assert any(n.type == "daily" for n in notifications)

    emails = storage.list_email_logs(milestone_id=milestone_id)
    assert len(emails) == len(sent_emails)
    assert emails[0].recipient == "qa@example.com"
    assert emails[0].template_name == "reminder"


def test_send_due_reminder_emails_stops_after_acknowledgement(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        tomorrow = date.today() + timedelta(days=1)
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": tomorrow.isoformat(),
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

        client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262", "ack_name": "qa"})

        sent_emails: list[dict] = []

        def fake_send_email(config, *, to, subject, body_text, body_html=None):
            sent_emails.append({"to": to, "subject": subject})

        monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

        response = client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["sent"] == 0
        assert len(sent_emails) == 0


def test_send_due_reminder_emails_avoids_duplicates(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        tomorrow = date.today() + timedelta(days=1)
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": tomorrow.isoformat(),
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

        sent_emails: list[dict] = []

        def fake_send_email(config, *, to, subject, body_text, body_html=None):
            sent_emails.append({"to": to, "subject": subject})

        monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

        response1 = client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )
        assert response1.status_code == 200
        first_sent = response1.json()["sent"]
        assert first_sent >= 1

        response2 = client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )
        assert response2.status_code == 200
        second_sent = response2.json()["sent"]
        assert second_sent == 0
        assert len(sent_emails) == first_sent


def test_send_due_reminder_emails_returns_failure_for_invalid_owner(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        tomorrow = date.today() + timedelta(days=1)
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": tomorrow.isoformat(),
                "owner": "qa",
            },
        )

        response = client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["failed"] >= 1


def test_reminder_state_includes_email_logs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        tomorrow = date.today() + timedelta(days=1)
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": tomorrow.isoformat(),
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

        def fake_send_email(config, *, to, subject, body_text, body_html=None):
            pass

        monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

        client.post(
            "/api/notifications/send",
            json={"as_of": tomorrow.isoformat()},
        )

        response = client.get(f"/api/releases/{created['id']}/notifications", params={"as_of": tomorrow.isoformat()})
        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 2
        kickoff_state = next(item for item in payload if item["milestone_name"] == "Kickoff")
        assert len(kickoff_state["emails"]) == 1
        assert kickoff_state["emails"][0]["recipient"] == "qa@example.com"


def test_reminder_t_minus_days_uses_default_and_parses_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from boa.reminder_config import reminder_t_minus_days

    monkeypatch.setattr("os.environ", {})
    assert reminder_t_minus_days() == ((7, "t-7"), (3, "t-3"), (1, "t-1"))

    monkeypatch.setattr("os.environ", {"BOA_REMINDER_DAYS_BEFORE": "14, 7, 1"})
    assert reminder_t_minus_days() == ((14, "t-14"), (7, "t-7"), (1, "t-1"))

    monkeypatch.setattr("os.environ", {"BOA_REMINDER_DAYS_BEFORE": "not-a-number, 5, 3"})
    assert reminder_t_minus_days() == ((5, "t-5"), (3, "t-3"))

    monkeypatch.setattr("os.environ", {"BOA_REMINDER_DAYS_BEFORE": "0, -1, abc"})
    assert reminder_t_minus_days() == ((7, "t-7"), (3, "t-3"), (1, "t-1"))


def test_scheduled_reminder_cycle_sends_emails_when_smtp_ready(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
        "BOA_BASE_URL": "http://localhost:8000",
    }
    monkeypatch.setattr("os.environ", env)

    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="FortiSASE",
            version="26.2",
            secret="boa-262",
            milestones=(
                Milestone(
                    name="Kickoff",
                    expected=date.today() + timedelta(days=1),
                    owner="qa",
                    email="qa@example.com",
                ),
            ),
        )
    )

    sent_emails: list[dict] = []

    def fake_send_email(config, *, to, subject, body_text, body_html=None):
        sent_emails.append({"to": to, "subject": subject})

    monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

    from boa.api import _run_scheduled_reminder_cycle

    _run_scheduled_reminder_cycle(storage)

    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == "qa@example.com"

    milestone_id = storage.list_milestones(release.id)[0].id
    notifications = storage.list_notifications(milestone_id=milestone_id)
    assert len(notifications) == 1

    emails = storage.list_email_logs(milestone_id=milestone_id)
    assert len(emails) == 1
    assert emails[0].template_name == "reminder"
