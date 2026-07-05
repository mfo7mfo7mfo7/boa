"""Tests for Boa SMTP foundation (Boa 1.7)."""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from boa.api import create_app
from boa.email import SmtpConfigurationError, SmtpSendError, get_smtp_status, load_smtp_config, send_email
from boa.storage import BoaStorage


@pytest.fixture
def base_client(tmp_path: Path) -> TestClient:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    return TestClient(app)


def _set_smtp_env(
    *,
    enabled: str = "false",
    host: str | None = None,
    port: str | None = None,
    username: str | None = None,
    password: str | None = None,
    from_email: str | None = None,
    from_name: str | None = None,
    starttls: str | None = None,
    ssl: str | None = None,
    timeout: str | None = None,
    test_to: str | None = None,
) -> dict:
    """Return a clean environment dict with only the requested SMTP variables."""
    env: dict[str, str] = {}
    if enabled is not None:
        env["BOA_SMTP_ENABLED"] = enabled
    if host is not None:
        env["BOA_SMTP_HOST"] = host
    if port is not None:
        env["BOA_SMTP_PORT"] = port
    if username is not None:
        env["BOA_SMTP_USERNAME"] = username
    if password is not None:
        env["BOA_SMTP_PASSWORD"] = password
    if from_email is not None:
        env["BOA_SMTP_FROM"] = from_email
    if from_name is not None:
        env["BOA_SMTP_FROM_NAME"] = from_name
    if starttls is not None:
        env["BOA_SMTP_STARTTLS"] = starttls
    if ssl is not None:
        env["BOA_SMTP_SSL"] = ssl
    if timeout is not None:
        env["BOA_SMTP_TIMEOUT"] = timeout
    if test_to is not None:
        env["BOA_SMTP_TEST_TO"] = test_to
    return env


def test_smtp_status_disabled_by_default(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(os, "environ", {k: v for k, v in os.environ.items() if not k.startswith("BOA_SMTP_")})
    response = base_client.get("/api/system/smtp")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is False
    assert payload["configured"] is False
    assert payload["ready"] is False
    assert payload["host"] is None
    assert payload["port"] == 587
    assert payload["from"] is None
    assert payload["from_name"] == "Boa"
    assert payload["starttls"] is True
    assert payload["ssl"] is False
    assert payload["test_to"] is None
    assert payload["message"] == "SMTP is disabled."


def test_smtp_status_enabled_missing_host(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(enabled="true")
    monkeypatch.setattr(os, "environ", env)
    response = base_client.get("/api/system/smtp")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["configured"] is False
    assert payload["ready"] is False
    assert "BOA_SMTP_HOST is required" in payload["message"]


def test_smtp_status_enabled_missing_from(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(enabled="true", host="smtp.example.com")
    monkeypatch.setattr(os, "environ", env)
    response = base_client.get("/api/system/smtp")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["configured"] is False
    assert payload["ready"] is False
    assert "BOA_SMTP_FROM is required" in payload["message"]


def test_smtp_status_starttls_and_ssl_both_true(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
        ssl="true",
    )
    monkeypatch.setattr(os, "environ", env)
    response = base_client.get("/api/system/smtp")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["configured"] is True
    assert payload["ready"] is False
    assert payload["ssl"] is True
    assert "STARTTLS and SSL cannot both be enabled" in payload["message"]


def test_smtp_status_does_not_expose_password(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
        username="boa",
        password="super-secret-password",
    )
    monkeypatch.setattr(os, "environ", env)
    response = base_client.get("/api/system/smtp")
    assert response.status_code == 200
    payload = response.text
    assert "super-secret-password" not in payload
    assert "password" not in payload.lower()


def test_smtp_test_disabled_returns_400(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(enabled="false")
    monkeypatch.setattr(os, "environ", env)
    response = base_client.post("/api/system/smtp/test", json={"to": "admin@example.com"})
    assert response.status_code == 400
    assert "disabled" in response.json()["detail"].lower()


def test_smtp_test_misconfigured_returns_400(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(enabled="true", host="smtp.example.com")
    monkeypatch.setattr(os, "environ", env)
    response = base_client.post("/api/system/smtp/test", json={"to": "admin@example.com"})
    assert response.status_code == 400
    assert "BOA_SMTP_FROM is required" in response.json()["detail"]


def test_smtp_test_missing_recipient_returns_400(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
    )
    monkeypatch.setattr(os, "environ", env)
    response = base_client.post("/api/system/smtp/test", json={})
    assert response.status_code == 400
    assert "recipient" in response.json()["detail"].lower()


def test_smtp_test_sends_email_when_configured(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
    )
    monkeypatch.setattr(os, "environ", env)

    with patch("boa.email.send_email") as mock_send:
        response = base_client.post("/api/system/smtp/test", json={"to": "admin@example.com"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert "sent" in payload["message"].lower()
    mock_send.assert_called_once()
    call_kwargs = mock_send.call_args.kwargs
    assert call_kwargs["to"] == "admin@example.com"
    assert "test" in call_kwargs["subject"].lower()


def test_smtp_test_uses_configured_test_recipient(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
        test_to="default@example.com",
    )
    monkeypatch.setattr(os, "environ", env)

    with patch("boa.email.send_email") as mock_send:
        response = base_client.post("/api/system/smtp/test", json={})

    assert response.status_code == 200
    assert response.json()["ok"] is True
    mock_send.assert_called_once()
    assert mock_send.call_args.kwargs["to"] == "default@example.com"


def test_smtp_test_returns_sanitized_error_on_send_failure(base_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    env = _set_smtp_env(
        enabled="true",
        host="smtp.example.com",
        from_email="boa@example.com",
    )
    monkeypatch.setattr(os, "environ", env)

    with patch("boa.email.send_email") as mock_send:
        mock_send.side_effect = SmtpSendError("Could not reach SMTP server.")
        response = base_client.post("/api/system/smtp/test", json={"to": "admin@example.com"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is False
    assert "failed" in payload["message"].lower()
    assert "Could not reach SMTP server." in payload["error"]


def test_send_email_sanitizes_smtp_auth_error(monkeypatch: pytest.MonkeyPatch) -> None:
    from smtplib import SMTPAuthenticationError

    config = load_smtp_config(
        {
            "BOA_SMTP_ENABLED": "true",
            "BOA_SMTP_HOST": "smtp.example.com",
            "BOA_SMTP_FROM": "boa@example.com",
            "BOA_SMTP_USERNAME": "boa",
            "BOA_SMTP_PASSWORD": "secret",
        }
    )

    mock_server = MagicMock()
    mock_server.__enter__ = MagicMock(return_value=mock_server)
    mock_server.__exit__ = MagicMock(return_value=False)
    mock_server.login.side_effect = SMTPAuthenticationError(535, "Username and Password not accepted.")

    with patch("boa.email.SMTP", return_value=mock_server):
        with pytest.raises(SmtpSendError) as exc_info:
            send_email(config, to="admin@example.com", subject="Test", body_text="body")

    assert "Authentication failed" in str(exc_info.value)
    assert "secret" not in str(exc_info.value)


def test_send_email_sanitizes_error_with_password_in_message(monkeypatch: pytest.MonkeyPatch) -> None:
    config = load_smtp_config(
        {
            "BOA_SMTP_ENABLED": "true",
            "BOA_SMTP_HOST": "smtp.example.com",
            "BOA_SMTP_FROM": "boa@example.com",
        }
    )

    mock_server = MagicMock()
    mock_server.__enter__ = MagicMock(return_value=mock_server)
    mock_server.__exit__ = MagicMock(return_value=False)
    mock_server.send_message.side_effect = Exception("Internal error: password=super-secret")

    with patch("boa.email.SMTP", return_value=mock_server):
        with pytest.raises(SmtpSendError) as exc_info:
            send_email(config, to="admin@example.com", subject="Test", body_text="body")

    error_text = str(exc_info.value)
    assert "super-secret" not in error_text
    assert "password" not in error_text.lower()


def test_smtp_status_ready_when_fully_configured() -> None:
    config = load_smtp_config(
        {
            "BOA_SMTP_ENABLED": "true",
            "BOA_SMTP_HOST": "smtp.office365.com",
            "BOA_SMTP_PORT": "587",
            "BOA_SMTP_FROM": "boa@example.com",
            "BOA_SMTP_FROM_NAME": "Boa",
            "BOA_SMTP_STARTTLS": "true",
            "BOA_SMTP_SSL": "false",
            "BOA_SMTP_TIMEOUT": "15",
            "BOA_SMTP_TEST_TO": "admin@example.com",
        }
    )
    status = get_smtp_status(config)
    assert status["enabled"] is True
    assert status["configured"] is True
    assert status["ready"] is True
    assert status["host"] == "smtp.office365.com"
    assert status["port"] == 587
    assert status["from"] == "boa@example.com"
    assert status["from_name"] == "Boa"
    assert status["starttls"] is True
    assert status["ssl"] is False
    assert status["test_to"] == "admin@example.com"
    assert status["message"] == "SMTP is configured."


def test_load_smtp_config_invalid_port() -> None:
    with pytest.raises(SmtpConfigurationError, match="BOA_SMTP_PORT"):
        load_smtp_config({"BOA_SMTP_PORT": "not-a-port"})


def test_load_smtp_config_invalid_timeout() -> None:
    with pytest.raises(SmtpConfigurationError, match="BOA_SMTP_TIMEOUT"):
        load_smtp_config({"BOA_SMTP_TIMEOUT": "-5"})


def test_load_smtp_config_invalid_test_to_email() -> None:
    with pytest.raises(SmtpConfigurationError, match="BOA_SMTP_TEST_TO"):
        load_smtp_config({"BOA_SMTP_TEST_TO": "not-an-email"})
