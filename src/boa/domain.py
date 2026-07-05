"""Core domain objects for Boa release blueprints."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from boa.reminder_config import reminder_t_minus_days


DAILY_REMINDER_TYPE = "daily"
BUG_SNAPSHOT_INGEST_CAPABILITY = "bug_snapshot_ingest"


@dataclass(slots=True, frozen=True)
class Milestone:
    """A release milestone defined in a YAML blueprint."""

    name: str
    expected: date
    owner: str
    note: str | None = None
    email: str | None = None

    def shift(self, delta: timedelta) -> "Milestone":
        return Milestone(
            name=self.name,
            expected=self.expected + delta,
            owner=self.owner,
            note=self.note,
            email=self.email,
        )


@dataclass(slots=True, frozen=True)
class ReleaseBlueprint:
    """A YAML-defined release blueprint."""

    product: str
    version: str
    secret: str
    milestones: tuple[Milestone, ...]

    def kickoff(self) -> Milestone:
        if not self.milestones:
            raise ValueError("Release blueprint must contain at least one milestone.")
        return min(self.milestones, key=lambda milestone: milestone.expected)

    def shift_to_kickoff(self, new_kickoff: date) -> "ReleaseBlueprint":
        current_kickoff = self.kickoff().expected
        delta = new_kickoff - current_kickoff
        return ReleaseBlueprint(
            product=self.product,
            version=self.version,
            secret=self.secret,
            milestones=tuple(milestone.shift(delta) for milestone in self.milestones),
        )


@dataclass(slots=True, frozen=True)
class ReleaseRecord:
    """A persisted release and its blueprint."""

    id: int
    blueprint: ReleaseBlueprint


@dataclass(slots=True, frozen=True)
class MilestoneRecord:
    """A persisted milestone belonging to a release."""

    id: int
    release_id: int
    name: str
    expected: date
    owner: str
    note: str | None = None
    email: str | None = None


@dataclass(slots=True, frozen=True)
class AckRecord:
    """A milestone acknowledgement event."""

    id: int
    release_id: int
    milestone_id: int
    ack_name: str
    acked_at: datetime
    note: str


@dataclass(slots=True, frozen=True)
class BugSnapshot:
    """A daily bug count for a release."""

    id: int
    release_id: int
    observed_at: datetime
    signal_type: str
    open_bug_count: int
    quality: str = "normal"
    quality_reason: str | None = None


@dataclass(slots=True, frozen=True)
class MilestoneTimelineItem:
    """A milestone enriched with its latest acknowledgement timestamp."""

    id: int
    release_id: int
    name: str
    expected: date
    owner: str
    email: str | None
    note: str | None
    acked_at: datetime | None
    ack_name: str | None
    ack_note: str | None


@dataclass(slots=True, frozen=True)
class ReleaseTimeline:
    """Full release data needed to render a Boa timeline."""

    release: ReleaseRecord
    milestones: tuple[MilestoneTimelineItem, ...]
    bug_snapshots: tuple[BugSnapshot, ...]
    starlight: "ReleaseStarlight | None" = None


@dataclass(slots=True, frozen=True)
class NotificationRecord:
    """A durable reminder log entry for a milestone."""

    id: int
    release_id: int
    milestone_id: int
    type: str
    sent_at: datetime


@dataclass(slots=True, frozen=True)
class ReminderState:
    """Current reminder state for a milestone."""

    release_id: int
    milestone_id: int
    milestone_name: str
    expected: date
    owner: str
    acked_at: datetime | None
    pending_types: tuple[str, ...]
    notifications: tuple[NotificationRecord, ...]
    emails: tuple[EmailLogRecord, ...]


@dataclass(slots=True, frozen=True)
class PluginDescriptor:
    """A minimal plugin contract exposed to the app."""

    name: str
    version: str
    capabilities: tuple[str, ...]
    endpoint: str | None = None


@dataclass(slots=True, frozen=True)
class BugSnapshotSubmission:
    """Stable plugin boundary for ingesting a release bug snapshot."""

    open_bug_count: int
    signal_type: str = "total"


@dataclass(slots=True, frozen=True)
class StarlightDetail:
    """Primary narrative observation stored as markdown."""

    type: str
    content: str


@dataclass(slots=True, frozen=True)
class StarlightMetrics:
    """Optional structured facts that support the narrative observation."""

    done: int
    total: int
    blocked: int


@dataclass(slots=True, frozen=True)
class StarlightStatus:
    """Latest submitted journey-readiness signal for a release."""

    release_id: int
    starlight: int
    whisper: str
    detail: StarlightDetail
    metrics: StarlightMetrics | None
    observed_on: date
    updated_at: datetime


@dataclass(slots=True, frozen=True)
class StarlightEvent:
    """A meaningful readiness milestone retained in the starlight trail."""

    id: int
    release_id: int
    observed_on: date
    starlight: int
    whisper: str
    detail: StarlightDetail
    metrics: StarlightMetrics | None
    created_at: datetime


@dataclass(slots=True, frozen=True)
class ReleaseStarlight:
    """Current release readiness plus its meaningful trail."""

    current: StarlightStatus
    trail: tuple[StarlightEvent, ...]


def reminder_type_due_on_day(
    expected: date,
    reminder_type: str,
    *,
    as_of: date,
    t_minus_days: tuple[tuple[int, str], ...] | None = None,
) -> bool:
    if reminder_type == DAILY_REMINDER_TYPE:
        return as_of >= expected

    effective_t_minus_days = t_minus_days or reminder_t_minus_days()
    for days_before, candidate_type in effective_t_minus_days:
        if candidate_type == reminder_type:
            return as_of == expected - timedelta(days=days_before)

    raise ValueError(f"Unknown reminder type: {reminder_type}")


def pending_reminder_types(
    *,
    expected: date,
    acked_at: datetime | None,
    notifications: tuple[NotificationRecord, ...],
    as_of: date,
    t_minus_days: tuple[tuple[int, str], ...] | None = None,
) -> tuple[str, ...]:
    if acked_at is not None:
        return ()

    effective_t_minus_days = t_minus_days or reminder_t_minus_days()
    pending: list[str] = []
    sent_types = {notification.type for notification in notifications}
    sent_daily_dates = {
        notification.sent_at.date()
        for notification in notifications
        if notification.type == DAILY_REMINDER_TYPE
    }

    for _days_before, reminder_type in effective_t_minus_days:
        if reminder_type_due_on_day(expected, reminder_type, as_of=as_of, t_minus_days=effective_t_minus_days) and reminder_type not in sent_types:
            pending.append(reminder_type)

    if (
        reminder_type_due_on_day(expected, DAILY_REMINDER_TYPE, as_of=as_of, t_minus_days=effective_t_minus_days)
        and as_of not in sent_daily_dates
    ):
        pending.append(DAILY_REMINDER_TYPE)

    return tuple(pending)


@dataclass(slots=True, frozen=True)
class AckTokenRecord:
    """A secret acknowledgement token for the Email Ack Workflow."""

    id: int
    release_id: int
    milestone_id: int
    token_hash: str
    created_at: datetime
    expires_at: datetime
    used_at: datetime | None
    ack_id: int | None


@dataclass(slots=True, frozen=True)
class EmailLogRecord:
    """A durable log entry for an outbound email."""

    id: int
    release_id: int
    milestone_id: int
    notification_id: int | None
    template_name: str
    recipient: str
    token_id: int | None
    subject: str
    sent_at: datetime
    status: str
    error: str | None
