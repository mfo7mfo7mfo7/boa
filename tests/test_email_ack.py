"""Tests for the Boa 1.8 Email Ack Workflow."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from boa.ack_token import generate_ack_token, hash_ack_token
from boa.api import create_app
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
            json={"ack_name": "qa", "note": {"content": "All green"}},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["acked"] is True
        assert payload["ack_name"] == "qa"
        assert payload["milestone_id"] == milestone_id

        info = client.get(f"/api/ack/{plain.token}").json()
        assert info["valid"] is False

        timeline = client.get("/api/timeline").json()
        milestone = timeline[0]["milestones"][0]
        assert milestone["acked_at"] is not None
        assert milestone["ack_name"] == "qa"
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
            json={"ack_name": "qa"},
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
