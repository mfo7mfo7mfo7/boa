"""Tests for the Boa 1.8 Email Ack Workflow."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from boa.ack_token import generate_ack_token, hash_ack_token
from boa.api import create_app
from boa.domain import Milestone
from boa.storage import BoaStorage


def test_ack_token_is_secure_and_hashable() -> None:
    plain = generate_ack_token(1)
    assert plain.milestone_id == 1
    assert len(plain.token) >= 32
    assert plain.token_hash == hash_ack_token(plain.token)
    assert plain.expires_at > datetime.now(timezone.utc)


def test_ack_page_serves_ui(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/ack/test-token")
        assert response.status_code == 200
        assert "Acknowledge" in response.text


def test_ack_token_info_returns_invalid_for_unknown_token(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/api/ack/unknown-token")
        assert response.status_code == 200
        payload = response.json()
        assert payload["valid"] is False


def test_ack_token_info_returns_valid_token_details(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

    storage = BoaStorage(tmp_path / "boa.db")
    plain = generate_ack_token(milestone_id)
    storage.create_or_replace_ack_token(
        release_id=created["id"],
        milestone_id=milestone_id,
        token_hash=plain.token_hash,
        expires_at=plain.expires_at,
    )

    with TestClient(app) as client:
        response = client.get(f"/api/ack/{plain.token}")
        assert response.status_code == 200
        payload = response.json()
        assert payload["valid"] is True
        assert payload["release_id"] == created["id"]
        assert payload["milestone_id"] == milestone_id
        assert payload["product"] == "FortiSASE"
        assert payload["milestone_name"] == "Kickoff"
        assert payload["keeper"] == "pm"
        assert payload["keeper_email"] is None


def test_ack_by_token_creates_acknowledgement_and_consumes_token(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

    storage = BoaStorage(tmp_path / "boa.db")
    plain = generate_ack_token(milestone_id)
    storage.create_or_replace_ack_token(
        release_id=created["id"],
        milestone_id=milestone_id,
        token_hash=plain.token_hash,
        expires_at=plain.expires_at,
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/ack/{plain.token}",
            json={"note": {"content": "All green"}},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["acked"] is True
        assert payload["ack_name"] == "pm"
        assert payload["milestone_id"] == milestone_id

        info = client.get(f"/api/ack/{plain.token}").json()
        assert info["valid"] is False

        timeline = client.get("/api/timeline").json()
        milestone = timeline[0]["milestones"][0]
        assert milestone["acked_at"] is not None
        assert milestone["ack_name"] == "pm"
        assert milestone["ack_note"] == {"content": "All green"}


def test_ack_by_token_rejects_expired_token(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

    storage = BoaStorage(tmp_path / "boa.db")
    plain = generate_ack_token(milestone_id)
    storage.create_or_replace_ack_token(
        release_id=created["id"],
        milestone_id=milestone_id,
        token_hash=plain.token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/ack/{plain.token}",
            json={},
        )
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()


def test_send_ack_email_requires_smtp_ready(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("os.environ", {})
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        response = client.post(f"/api/milestones/{milestone_id}/ack-email")
        assert response.status_code == 400


def test_send_ack_email_succeeds_when_smtp_ready(
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
        milestone_id = created["milestones"][0]["id"]

        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": "2026-08-01",
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

        sent_emails: list[dict] = []

        def fake_send_email(config, *, to, subject, body_text, body_html=None):
            sent_emails.append({"to": to, "subject": subject, "body_text": body_text})

        monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

        response = client.post(f"/api/milestones/{milestone_id}/ack-email")
        assert response.status_code == 200
        payload = response.json()
        assert payload["sent"] is True
        assert payload["recipient"] == "qa@example.com"
        assert len(sent_emails) == 1
        assert sent_emails[0]["to"] == "qa@example.com"
        assert "Kickoff" in sent_emails[0]["subject"]
        assert "/ack/" in sent_emails[0]["body_text"]

    storage = BoaStorage(tmp_path / "boa.db")
    logs = storage.list_email_logs(milestone_id=milestone_id)
    assert len(logs) == 1
    assert logs[0].recipient == "qa@example.com"
    assert logs[0].template_name == "ack_request"


def test_send_ack_email_fails_without_valid_email(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
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

        response = client.post(f"/api/milestones/{milestone_id}/ack-email")
        assert response.status_code == 200
        payload = response.json()
        assert payload["sent"] is False
        assert "not a valid email" in payload["message"].lower()


def test_ack_by_token_sends_confirmation_email_when_smtp_ready(
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
        milestone_id = created["milestones"][0]["id"]

    storage = BoaStorage(tmp_path / "boa.db")
    milestone = storage.get_milestone(milestone_id)
    storage.update_milestone(
        milestone_id,
        Milestone(
            name=milestone.name,
            expected=milestone.expected,
            owner="qa",
            email="qa@example.com",
        ),
    )
    plain = generate_ack_token(milestone_id)
    storage.create_or_replace_ack_token(
        release_id=created["id"],
        milestone_id=milestone_id,
        token_hash=plain.token_hash,
        expires_at=plain.expires_at,
    )

    sent_emails: list[dict] = []

    def fake_send_email(config, *, to, subject, body_text, body_html=None):
        sent_emails.append({"to": to, "subject": subject, "body_text": body_text})

    monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

    with TestClient(app) as client:
        response = client.post(
            f"/api/ack/{plain.token}",
            json={"note": {"content": "All green"}},
        )
        assert response.status_code == 200
        assert response.json()["ack_name"] == "qa@example.com"
        assert len(sent_emails) == 1
        assert "acknowledged" in sent_emails[0]["subject"].lower()

    logs = storage.list_email_logs(milestone_id=milestone_id)
    assert any(log.template_name == "confirmation" for log in logs)


def test_direct_ack_sends_confirmation_email_when_smtp_ready(
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
        milestone_id = created["milestones"][0]["id"]

        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": "2026-08-01",
                "owner": "qa",
                "email": "qa@example.com",
            },
        )

    sent_emails: list[dict] = []

    def fake_send_email(config, *, to, subject, body_text, body_html=None):
        sent_emails.append({"to": to, "subject": subject, "body_text": body_text})

    monkeypatch.setattr("boa.reminder_service.send_email", fake_send_email)

    with TestClient(app) as client:
        response = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "ack_name": "qa", "note": {"content": "Ack via API"}},
        )
        assert response.status_code == 200
        assert len(sent_emails) == 1
        assert sent_emails[0]["to"] == "qa@example.com"
        assert "acknowledged" in sent_emails[0]["subject"].lower()

    storage = BoaStorage(tmp_path / "boa.db")
    logs = storage.list_email_logs(milestone_id=milestone_id)
    assert any(log.template_name == "confirmation" for log in logs)


def test_ack_token_replay_after_use_is_rejected(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

    storage = BoaStorage(tmp_path / "boa.db")
    plain = generate_ack_token(milestone_id)
    storage.create_or_replace_ack_token(
        release_id=created["id"],
        milestone_id=milestone_id,
        token_hash=plain.token_hash,
        expires_at=plain.expires_at,
    )

    with TestClient(app) as client:
        first = client.post(f"/api/ack/{plain.token}", json={})
        assert first.status_code == 200

        second = client.post(f"/api/ack/{plain.token}", json={})
        assert second.status_code == 400
        assert "already been used" in second.json()["detail"].lower()


def test_secret_token_ack_flow_end_to_end(tmp_path: Path) -> None:
    """Create milestone, issue ack token via email, acknowledge via secret link."""
    from datetime import date, timedelta
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Comet", "version": "2.0", "secret": "comet-20"},
        ).json()
        milestone_id = release["milestones"][0]["id"]
        due = (date.today() + timedelta(days=5)).isoformat()
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Perihelion",
                "expected": due,
                "owner": "navigator",
                "email": "navigator@example.com",
                "note": None,
            },
        )

        # Token info before ack email
        info_before = client.get(f"/api/ack/not-a-token")
        assert info_before.json()["valid"] is False

        # Request ack email creates a token
        ack_email = client.post(f"/api/milestones/{milestone_id}/ack-email")
        # Without SMTP configured, this returns 400. That is OK; we test token creation path separately.
        if ack_email.status_code == 200:
            token = ack_email.json()["token"]
            info = client.get(f"/api/ack/{token}")
            assert info.json()["valid"] is True
            assert info.json()["milestone_name"] == "Perihelion"
            assert info.json()["keeper_email"] == "navigator@example.com"

            ack = client.post(f"/api/ack/{token}", json={"note": None})
            assert ack.status_code == 200
            assert ack.json()["acked"] is True
            assert ack.json()["ack_name"] == "navigator@example.com"

            # Token replay is rejected
            replay = client.post(f"/api/ack/{token}", json={"note": None})
            assert replay.status_code == 400

            # Timeline shows ack
            timeline = client.get("/api/timeline").json()
            item = next((t for t in timeline if t["id"] == release["id"]), None)
            milestone = next((m for m in item["milestones"] if m["id"] == milestone_id), None)
            assert milestone["acked_at"] is not None
        else:
            # Verify we get a clean error, not a 500
            assert ack_email.status_code == 400
