"""SMTP configuration and email delivery for Boa.

Uses only the Python standard library so the runtime stays small.
Passwords are never logged or returned in API responses.
"""

from __future__ import annotations

import os
import re
import socket
import ssl as ssl_module
from dataclasses import dataclass
from email.message import EmailMessage
from smtplib import SMTP, SMTPAuthenticationError, SMTPException, SMTP_SSL


class SmtpConfigurationError(Exception):
    """Raised when SMTP configuration is missing or invalid."""

    pass


class SmtpSendError(Exception):
    """Raised when an email cannot be sent; the message is sanitized for users."""

    pass


@dataclass(frozen=True, slots=True)
class SmtpConfig:
    enabled: bool
    host: str | None
    port: int
    username: str | None
    password: str | None
    from_email: str | None
    from_name: str
    starttls: bool
    ssl: bool
    timeout: float
    test_to: str | None

    @property
    def configured(self) -> bool:
        return bool(self.host and self.from_email and self.port)

    @property
    def ready(self) -> bool:
        return self.enabled and self.configured and _validation_message(self) is None


_DEFAULT_PORT = 587
_DEFAULT_TIMEOUT = 15.0
_DEFAULT_FROM_NAME = "Boa"


_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _env_bool(value: str | None, *, default: bool = False) -> bool:
    if value is None or value.strip() == "":
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _parse_port(raw: str | None) -> int:
    if raw is None or raw.strip() == "":
        return _DEFAULT_PORT
    try:
        port = int(raw.strip())
    except ValueError as exc:
        raise SmtpConfigurationError(f"BOA_SMTP_PORT must be an integer, got: {raw!r}") from exc
    if not 1 <= port <= 65535:
        raise SmtpConfigurationError(f"BOA_SMTP_PORT must be between 1 and 65535, got: {port}")
    return port


def _parse_timeout(raw: str | None) -> float:
    if raw is None or raw.strip() == "":
        return _DEFAULT_TIMEOUT
    try:
        timeout = float(raw.strip())
    except ValueError as exc:
        raise SmtpConfigurationError(f"BOA_SMTP_TIMEOUT must be a positive number, got: {raw!r}") from exc
    if timeout <= 0:
        raise SmtpConfigurationError(f"BOA_SMTP_TIMEOUT must be a positive number, got: {timeout}")
    return timeout


def _is_valid_email(value: str | None) -> bool:
    if not value:
        return False
    return bool(_EMAIL_RE.match(value.strip()))


def _validation_message(config: SmtpConfig) -> str | None:
    if config.port < 1 or config.port > 65535:
        return "BOA_SMTP_PORT must be between 1 and 65535."
    if config.timeout <= 0:
        return "BOA_SMTP_TIMEOUT must be a positive number."
    if config.starttls and config.ssl:
        return "SMTP configuration is invalid: STARTTLS and SSL cannot both be enabled."
    if not config.enabled:
        return None
    if not config.host:
        return "BOA_SMTP_HOST is required when SMTP is enabled."
    if not config.from_email:
        return "BOA_SMTP_FROM is required when SMTP is enabled."
    if not _is_valid_email(config.from_email):
        return "BOA_SMTP_FROM must be a valid email address."
    return None


def load_smtp_config(environ: dict[str, str] | None = None) -> SmtpConfig:
    """Load SMTP configuration from environment variables.

    Returns a ``SmtpConfig`` even when required fields are missing; callers
    should inspect ``config.ready`` or use ``get_smtp_status`` to report issues.
    Raises ``SmtpConfigurationError`` only for invalid syntax (bad port,
    bad timeout, invalid test_to email).
    """
    env = environ or os.environ

    enabled = _env_bool(env.get("BOA_SMTP_ENABLED"), default=False)

    host = env.get("BOA_SMTP_HOST")
    if host is not None:
        host = host.strip() or None

    port = _parse_port(env.get("BOA_SMTP_PORT"))

    username = env.get("BOA_SMTP_USERNAME")
    if username is not None and username.strip() == "":
        username = None

    password = env.get("BOA_SMTP_PASSWORD")
    if password is not None and password.strip() == "":
        password = None

    from_email = env.get("BOA_SMTP_FROM")
    if from_email is not None:
        from_email = from_email.strip() or None

    from_name = env.get("BOA_SMTP_FROM_NAME") or _DEFAULT_FROM_NAME
    from_name = from_name.strip() or _DEFAULT_FROM_NAME

    starttls = _env_bool(env.get("BOA_SMTP_STARTTLS"), default=True)
    ssl = _env_bool(env.get("BOA_SMTP_SSL"), default=False)

    timeout = _parse_timeout(env.get("BOA_SMTP_TIMEOUT"))

    test_to = env.get("BOA_SMTP_TEST_TO")
    if test_to is not None and test_to.strip() == "":
        test_to = None
    if test_to is not None and not _is_valid_email(test_to):
        raise SmtpConfigurationError("BOA_SMTP_TEST_TO must be a valid email address when provided.")

    return SmtpConfig(
        enabled=enabled,
        host=host,
        port=port,
        username=username,
        password=password,
        from_email=from_email,
        from_name=from_name,
        starttls=starttls,
        ssl=ssl,
        timeout=timeout,
        test_to=test_to,
    )


def get_smtp_status(config: SmtpConfig | None = None) -> dict:
    """Return a safe, serializable status summary for the current SMTP config.

    Never exposes the password. Usernames are summarized only by presence.
    """
    if config is None:
        try:
            config = load_smtp_config()
        except SmtpConfigurationError as exc:
            return {
                "enabled": False,
                "configured": False,
                "ready": False,
                "host": None,
                "port": _DEFAULT_PORT,
                "from": None,
                "from_name": _DEFAULT_FROM_NAME,
                "starttls": True,
                "ssl": False,
                "authenticated": False,
                "test_to": None,
                "message": str(exc),
            }

    ready = config.ready
    configured = config.configured
    validation = _validation_message(config)

    if not config.enabled:
        message = "SMTP is disabled."
    elif validation:
        message = validation
    elif not configured:
        message = "SMTP is not configured. Set BOA_SMTP_HOST and BOA_SMTP_FROM."
    else:
        message = "SMTP is configured."

    return {
        "enabled": config.enabled,
        "configured": configured,
        "ready": ready,
        "host": config.host,
        "port": config.port,
        "from": config.from_email,
        "from_name": config.from_name,
        "starttls": config.starttls,
        "ssl": config.ssl,
        "authenticated": bool(config.username),
        "test_to": config.test_to,
        "message": message,
    }


def _build_message(
    *,
    from_email: str,
    from_name: str,
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None,
) -> EmailMessage:
    message = EmailMessage()
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body_text)
    if body_html is not None:
        message.add_alternative(body_html, subtype="html")
    return message


def _deliver(config: SmtpConfig, message: EmailMessage) -> None:
    if config.ssl:
        context = ssl_module.create_default_context()
        server: SMTP | SMTP_SSL = SMTP_SSL(
            host=config.host,
            port=config.port,
            timeout=config.timeout,
            context=context,
        )
    else:
        server = SMTP(host=config.host, port=config.port, timeout=config.timeout)

    with server:
        if config.starttls:
            context = ssl_module.create_default_context()
            server.starttls(context=context)
        if config.username:
            server.login(config.username, config.password or "")
        server.send_message(message)


def _sanitize_smtp_error(text: str) -> str:
    """Strip anything that looks like a password from an SMTP error string."""
    lowered = text.lower()
    sensitive_terms = ("password", "pass", "secret", "auth")
    if any(term in lowered for term in sensitive_terms):
        return "server rejected the connection"
    return text


def send_email(
    config: SmtpConfig,
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
) -> None:
    """Send an email using the configured SMTP transport.

    Raises ``SmtpConfigurationError`` if the config is not ready, and
    ``SmtpSendError`` if delivery fails. Error messages are sanitized and never
    contain credentials.
    """
    if not config.ready:
        status = get_smtp_status(config)
        raise SmtpConfigurationError(status["message"])

    to = to.strip()
    if not _is_valid_email(to):
        raise SmtpSendError("Recipient email address is invalid.")

    message = _build_message(
        from_email=config.from_email or "",
        from_name=config.from_name,
        to=to,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
    )

    try:
        _deliver(config, message)
    except SMTPAuthenticationError as exc:
        raise SmtpSendError("Authentication failed. Check BOA_SMTP_USERNAME and BOA_SMTP_PASSWORD.") from exc
    except SMTPException as exc:
        raise SmtpSendError(f"SMTP error: {_sanitize_smtp_error(str(exc))}") from exc
    except (socket.timeout, TimeoutError) as exc:
        raise SmtpSendError("Connection timed out while contacting the SMTP server.") from exc
    except OSError as exc:
        raise SmtpSendError(f"Could not reach SMTP server: {_sanitize_smtp_error(str(exc))}") from exc
    except Exception as exc:
        raise SmtpSendError(f"Failed to send email: {_sanitize_smtp_error(str(exc))}") from exc


def send_test_email(config: SmtpConfig, to: str | None = None) -> None:
    """Send a test email. ``to`` falls back to the configured test recipient."""
    recipient = to or config.test_to
    if not recipient:
        raise SmtpConfigurationError("No test recipient provided. Set BOA_SMTP_TEST_TO or include a 'to' address.")
    if not _is_valid_email(recipient):
        raise SmtpSendError("Test recipient email address is invalid.")

    subject = "Boa SMTP test email"
    body_text = (
        "This is a test email from Boa.\n\n"
        "If you received this message, SMTP delivery is configured correctly.\n\n"
        "Keep traveling."
    )
    body_html = """
    <html>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px;">
        <h2 style="font-weight: 400;">Boa SMTP test</h2>
        <p>This is a test email from Boa.</p>
        <p>If you received this message, SMTP delivery is configured correctly.</p>
        <p style="opacity: 0.7;">Keep traveling.</p>
      </body>
    </html>
    """

    send_email(config, to=recipient, subject=subject, body_text=body_text, body_html=body_html)
