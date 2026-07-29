"""Journey-level Reading Post delivery.

Reading Posts are subscriptions to the latest Observation Notebook page for a
release. They do not send when the page is saved; the scheduler sends them only
when the journey's rhythm and clock say it is time.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Callable

from boa.clock import get_engine_time_zone, normalize_engine_datetime
from boa.domain import ReadingPostSubscription
from boa.email import SmtpConfig, send_email
from boa.email_templates import render_reading_post_email
from boa.storage import BoaStorage


SendEmailFunc = Callable[[str, str, str, str | None], None]


class ReadingPostSendResult:
    """Result of attempting to send one journey Reading Post."""

    def __init__(
        self,
        *,
        release_id: int,
        recipients: tuple[str, ...],
        sent: bool,
        error: str | None = None,
        log_id: int | None = None,
    ) -> None:
        self.release_id = release_id
        self.recipients = recipients
        self.sent = sent
        self.error = error
        self.log_id = log_id


def _parse_send_time(value: str) -> tuple[int, int]:
    parts = value.strip().split(":")
    if len(parts) != 2:
        return (8, 0)
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return (8, 0)
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        return (8, 0)
    return (hour, minute)


def _normalize_now(now: datetime | None) -> datetime:
    return normalize_engine_datetime(now)


def _delivery_window(storage: BoaStorage, release_id: int, deliver_until_days: int) -> tuple[date | None, date | None]:
    milestones = storage.list_milestones(release_id)
    if not milestones:
        return (None, None)
    starts_at = min(item.expected for item in milestones)
    ends_at = max(item.expected for item in milestones) + timedelta(days=deliver_until_days)
    return (starts_at, ends_at)


def _inside_delivery_window(storage: BoaStorage, subscription: ReadingPostSubscription, now: datetime) -> bool:
    starts_at, ends_at = _delivery_window(
        storage,
        subscription.release_id,
        subscription.deliver_until_days,
    )
    today = now.date()
    if starts_at is not None and today < starts_at:
        return False
    if ends_at is not None and today > ends_at:
        return False
    return True


def _due_milestone_dates(storage: BoaStorage, subscription: ReadingPostSubscription, now: datetime) -> tuple[str, ...]:
    if subscription.schedule != "milestones":
        return ()
    sent = set(subscription.milestone_sent_dates)
    today = now.date()
    due_dates = {
        milestone.expected.isoformat()
        for milestone in storage.list_milestones(subscription.release_id)
        if milestone.expected <= today and milestone.expected.isoformat() not in sent
    }
    return tuple(sorted(due_dates))


def _is_due(storage: BoaStorage, subscription: ReadingPostSubscription, now: datetime) -> bool:
    if not subscription.enabled or not subscription.recipients:
        return False
    if subscription.schedule == "never":
        return False
    if not _inside_delivery_window(storage, subscription, now):
        return False

    if subscription.schedule == "milestones":
        return bool(_due_milestone_dates(storage, subscription, now))

    engine_now = _normalize_now(now)
    hour, minute = _parse_send_time(subscription.send_time)
    threshold = engine_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if engine_now < threshold:
        return False
    if subscription.schedule == "weekdays" and engine_now.weekday() >= 5:
        return False

    if subscription.last_sent_at is None:
        return True

    last_sent = subscription.last_sent_at
    engine_tz = get_engine_time_zone()
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=engine_tz)
    last_sent = last_sent.astimezone(engine_tz)

    if subscription.schedule == "daily":
        return last_sent.date() < engine_now.date()
    if subscription.schedule == "weekdays":
        return engine_now.weekday() < 5 and last_sent.date() < engine_now.date()
    if subscription.schedule == "weekly":
        return engine_now - last_sent >= timedelta(days=7)
    return False


def send_due_reading_posts(
    storage: BoaStorage,
    smtp_config: SmtpConfig,
    *,
    now: datetime | None = None,
    send_email_func: SendEmailFunc | None = None,
) -> list[ReadingPostSendResult]:
    """Send all due journey Reading Posts."""
    effective_now = _normalize_now(now)
    results: list[ReadingPostSendResult] = []
    for subscription in storage.list_enabled_reading_post_subscriptions():
        if _is_due(storage, subscription, effective_now):
            results.append(
                send_reading_post(
                    storage,
                    smtp_config,
                    subscription.release_id,
                    now=effective_now,
                    send_email_func=send_email_func,
                )
            )
    return results


def send_reading_post(
    storage: BoaStorage,
    smtp_config: SmtpConfig,
    release_id: int,
    *,
    now: datetime | None = None,
    send_email_func: SendEmailFunc | None = None,
) -> ReadingPostSendResult:
    """Send one release's latest Observation Notebook page to its subscribers."""
    sent_at = _normalize_now(now)
    subscription = storage.get_reading_post_subscription(release_id)
    if subscription is None or not subscription.enabled or not subscription.recipients:
        return ReadingPostSendResult(
            release_id=release_id,
            recipients=(),
            sent=False,
            error="Reading Post is not enabled for this journey.",
        )

    release = storage.get_release(release_id)
    starlight = storage.get_release_starlight(release_id)
    bug_snapshots = storage.list_bug_snapshots(release_id)
    storm = bug_snapshots[-1] if bug_snapshots else None
    subject, body_text, body_html = render_reading_post_email(
        release,
        starlight=starlight,
        storm=storm,
    )

    sender = send_email_func or (
        lambda recipient, subj, text, html: send_email(
            smtp_config,
            to=recipient,
            subject=subj,
            body_text=text,
            body_html=html,
        )
    )

    try:
        for recipient in subscription.recipients:
            sender(recipient, subject, body_text, body_html)
    except Exception as exc:
        log = storage.log_reading_post_email(
            release_id=release_id,
            recipients=subscription.recipients,
            subject=subject,
            sent_at=sent_at,
            status="failed",
            error=str(exc),
        )
        return ReadingPostSendResult(
            release_id=release_id,
            recipients=subscription.recipients,
            sent=False,
            error=str(exc),
            log_id=log.id,
        )

    log = storage.log_reading_post_email(
        release_id=release_id,
        recipients=subscription.recipients,
        subject=subject,
        sent_at=sent_at,
        status="sent",
    )
    if subscription.schedule == "milestones":
        due_dates = _due_milestone_dates(storage, subscription, sent_at)
        storage.mark_reading_post_milestones_sent(release_id, due_dates, sent_at)
    else:
        storage.mark_reading_post_sent(release_id, sent_at)
    return ReadingPostSendResult(
        release_id=release_id,
        recipients=subscription.recipients,
        sent=True,
        log_id=log.id,
    )
