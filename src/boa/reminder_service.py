"""Reminder orchestration for Boa 1.8 Email Ack Workflow.

This module bridges the existing notification/scheduler model with real
outbound email. It is intentionally separate from the SMTP transport layer
so the product logic can be tested without a live mail server.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta, timezone
from typing import Callable

from boa.ack_token import generate_ack_token, hash_ack_token
from boa.domain import NotificationRecord
from boa.email import SmtpConfig, send_email
from boa.email_templates import render_ack_request_email, render_confirmation_email, render_reminder_email
from boa.storage import BoaStorage


SendEmailFunc = Callable[[str, str, str, str | None], None]


class PublicBaseUrlConfigurationError(ValueError):
    """Raised when acknowledgement links cannot be made public."""


def _public_base_url() -> str:
    raw = os.environ.get("PUBLIC_BASE_URL")
    if not raw or not raw.strip():
        raise PublicBaseUrlConfigurationError(
            "PUBLIC_BASE_URL must be set before sending acknowledgement email links."
        )
    return raw.strip().rstrip("/")


def _token_ttl_hours() -> int:
    raw = os.environ.get("BOA_ACK_TOKEN_TTL_HOURS", "168")
    try:
        value = int(raw.strip())
    except ValueError:
        value = 168
    return max(1, value)


def _recipient_for_milestone(milestone) -> str | None:
    """Return the milestone email if set, otherwise fall back to owner."""
    from boa.email import is_valid_email

    if milestone.email:
        email = milestone.email.strip()
        if is_valid_email(email):
            return email
    owner = milestone.owner.strip()
    if is_valid_email(owner):
        return owner
    return None


def _journey_reading(storage: BoaStorage, release_id: int) -> str:
    starlight = storage.get_release_starlight(release_id)
    if starlight is None:
        starlight_part = "Starlight unwritten"
    else:
        starlight_part = f"Starlight ✦{starlight.current.starlight}"

    bug_snapshots = storage.list_bug_snapshots(release_id)
    if not bug_snapshots:
        storms_part = "Storms unknown"
    else:
        storms_part = f"Storms {bug_snapshots[-1].open_bug_count}"

    return f"{starlight_part} · {storms_part}"


class ReminderSendResult:
    """Result of attempting to email one reminder."""

    def __init__(
        self,
        *,
        milestone_id: int,
        notification_type: str,
        recipient: str | None,
        sent: bool,
        error: str | None = None,
        email_log_id: int | None = None,
    ) -> None:
        self.milestone_id = milestone_id
        self.notification_type = notification_type
        self.recipient = recipient
        self.sent = sent
        self.error = error
        self.email_log_id = email_log_id


def send_due_reminder_emails(
    storage: BoaStorage,
    smtp_config: SmtpConfig,
    *,
    as_of: date | None = None,
    send_email_func: SendEmailFunc | None = None,
    base_url: str | None = None,
) -> list[ReminderSendResult]:
    """Generate due notifications and send one email per pending reminder.

    Uses ``storage.generate_due_notifications`` to avoid duplicate reminders,
    then renders and sends an email for each generated notification.
    """
    effective_as_of = as_of or date.today()
    notifications = storage.generate_due_notifications(as_of=effective_as_of)
    results: list[ReminderSendResult] = []

    sender: SendEmailFunc
    if send_email_func is not None:
        sender = send_email_func
    else:
        def _default_sender(to: str, subject: str, body_text: str, body_html: str | None) -> None:
            send_email(smtp_config, to=to, subject=subject, body_text=body_text, body_html=body_html)

        sender = _default_sender

    for notification in notifications:
        result = _send_notification_email(
            storage,
            notification,
            sender,
            base_url,
        )
        results.append(result)

    return results


def _send_notification_email(
    storage: BoaStorage,
    notification: NotificationRecord,
    sender: SendEmailFunc,
    base_url: str | None,
) -> ReminderSendResult:
    milestone = storage.get_milestone(notification.milestone_id)
    release = storage.get_release(milestone.release_id)

    recipient = _recipient_for_milestone(milestone)
    if not recipient:
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type=notification.type,
            recipient=None,
            sent=False,
            error="Milestone owner is not a valid email address.",
        )

    try:
        effective_base_url = base_url or _public_base_url()
    except PublicBaseUrlConfigurationError as exc:
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type=notification.type,
            recipient=recipient,
            sent=False,
            error=str(exc),
        )

    plain_token = generate_ack_token(milestone.id, ttl_hours=_token_ttl_hours())
    token_record = storage.create_or_replace_ack_token(
        release_id=release.id,
        milestone_id=milestone.id,
        token_hash=plain_token.token_hash,
        expires_at=plain_token.expires_at,
    )

    subject, body_text, body_html = render_reminder_email(
        release,
        milestone,
        token=plain_token.token,
        base_url=effective_base_url,
        journey_reading=_journey_reading(storage, release.id),
    )

    try:
        sender(recipient, subject, body_text, body_html)
    except Exception as exc:
        email_log = storage.log_email(
            release_id=release.id,
            milestone_id=milestone.id,
            notification_id=notification.id,
            template_name="reminder",
            recipient=recipient,
            token_id=token_record.id,
            subject=subject,
            sent_at=datetime.now(timezone.utc).replace(microsecond=0),
            status="failed",
            error=str(exc),
        )
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type=notification.type,
            recipient=recipient,
            sent=False,
            error=str(exc),
            email_log_id=email_log.id,
        )

    email_log = storage.log_email(
        release_id=release.id,
        milestone_id=milestone.id,
        notification_id=notification.id,
        template_name="reminder",
        recipient=recipient,
        token_id=token_record.id,
        subject=subject,
        sent_at=datetime.now(timezone.utc).replace(microsecond=0),
        status="sent",
    )

    return ReminderSendResult(
        milestone_id=milestone.id,
        notification_type=notification.type,
        recipient=recipient,
        sent=True,
        email_log_id=email_log.id,
    )


def send_acknowledgement_confirmation(
    storage: BoaStorage,
    smtp_config: SmtpConfig,
    *,
    release_id: int,
    milestone_id: int,
    ack_name: str,
    ack_note: str,
    send_email_func: SendEmailFunc | None = None,
) -> None:
    """Send a confirmation email after a milestone is acknowledged.

    Failures are swallowed so acknowledgement itself never breaks because of
    email delivery. The error is simply not recorded as a product failure.
    """
    try:
        milestone = storage.get_milestone(milestone_id)
        release = storage.get_release(release_id)
    except KeyError:
        return

    recipient = _recipient_for_milestone(milestone)
    if not recipient:
        return

    subject, body_text, body_html = render_confirmation_email(
        release,
        milestone,
        ack_name=ack_name,
        ack_note=ack_note,
    )

    sender = send_email_func or (
        lambda recipient, subj, text, html: send_email(smtp_config, to=recipient, subject=subj, body_text=text, body_html=html)
    )

    try:
        sender(recipient, subject, body_text, body_html)
    except Exception:
        return

    storage.log_email(
        release_id=release.id,
        milestone_id=milestone.id,
        notification_id=None,
        template_name="confirmation",
        recipient=recipient,
        token_id=None,
        subject=subject,
        sent_at=datetime.now(timezone.utc).replace(microsecond=0),
        status="sent",
    )


def send_ack_request_email(
    storage: BoaStorage,
    smtp_config: SmtpConfig,
    *,
    milestone_id: int,
    send_email_func: SendEmailFunc | None = None,
    base_url: str | None = None,
) -> ReminderSendResult:
    """Send an on-demand acknowledgement request for a single milestone."""
    milestone = storage.get_milestone(milestone_id)
    release = storage.get_release(milestone.release_id)

    recipient = _recipient_for_milestone(milestone)
    if not recipient:
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type="ack_request",
            recipient=None,
            sent=False,
            error="Milestone owner is not a valid email address.",
        )

    try:
        effective_base_url = base_url or _public_base_url()
    except PublicBaseUrlConfigurationError as exc:
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type="ack_request",
            recipient=recipient,
            sent=False,
            error=str(exc),
        )

    plain_token = generate_ack_token(milestone.id, ttl_hours=_token_ttl_hours())
    token_record = storage.create_or_replace_ack_token(
        release_id=release.id,
        milestone_id=milestone.id,
        token_hash=plain_token.token_hash,
        expires_at=plain_token.expires_at,
    )

    subject, body_text, body_html = render_ack_request_email(
        release,
        milestone,
        token=plain_token.token,
        base_url=effective_base_url,
        journey_reading=_journey_reading(storage, release.id),
    )

    sender = send_email_func or (
        lambda recipient, subj, text, html: send_email(smtp_config, to=recipient, subject=subj, body_text=text, body_html=html)
    )

    try:
        sender(recipient, subject, body_text, body_html)
    except Exception as exc:
        email_log = storage.log_email(
            release_id=release.id,
            milestone_id=milestone.id,
            notification_id=None,
            template_name="ack_request",
            recipient=recipient,
            token_id=token_record.id,
            subject=subject,
            sent_at=datetime.now(timezone.utc).replace(microsecond=0),
            status="failed",
            error=str(exc),
        )
        return ReminderSendResult(
            milestone_id=milestone.id,
            notification_type="ack_request",
            recipient=recipient,
            sent=False,
            error=str(exc),
            email_log_id=email_log.id,
        )

    email_log = storage.log_email(
        release_id=release.id,
        milestone_id=milestone.id,
        notification_id=None,
        template_name="ack_request",
        recipient=recipient,
        token_id=token_record.id,
        subject=subject,
        sent_at=datetime.now(timezone.utc).replace(microsecond=0),
        status="sent",
    )

    return ReminderSendResult(
        milestone_id=milestone.id,
        notification_type="ack_request",
        recipient=recipient,
        sent=True,
        email_log_id=email_log.id,
    )
