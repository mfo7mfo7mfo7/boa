"""Core domain objects for Boa release blueprints."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta


REMINDER_T_MINUS_DAYS: tuple[tuple[int, str], ...] = (
    (7, "t-7"),
    (3, "t-3"),
    (1, "t-1"),
)
DAILY_REMINDER_TYPE = "daily"
BUG_SNAPSHOT_INGEST_CAPABILITY = "bug_snapshot_ingest"


@dataclass(slots=True, frozen=True)
class Milestone:
    """A release milestone defined in a YAML blueprint."""

    name: str
    expected: date
    owner: str

    def shift(self, delta: timedelta) -> "Milestone":
        return Milestone(
            name=self.name,
            expected=self.expected + delta,
            owner=self.owner,
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


@dataclass(slots=True, frozen=True)
class AckRecord:
    """A milestone acknowledgement event."""

    id: int
    release_id: int
    milestone_id: int
    owner: str
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
    acked_at: datetime | None
    ack_note: str | None


@dataclass(slots=True, frozen=True)
class ReleaseTimeline:
    """Full release data needed to render a Boa timeline."""

    release: ReleaseRecord
    milestones: tuple[MilestoneTimelineItem, ...]
    bug_snapshots: tuple[BugSnapshot, ...]


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


def reminder_type_due_on_day(
    expected: date,
    reminder_type: str,
    *,
    as_of: date,
) -> bool:
    if reminder_type == DAILY_REMINDER_TYPE:
        return as_of >= expected

    for days_before, candidate_type in REMINDER_T_MINUS_DAYS:
        if candidate_type == reminder_type:
            return as_of == expected - timedelta(days=days_before)

    raise ValueError(f"Unknown reminder type: {reminder_type}")


def pending_reminder_types(
    *,
    expected: date,
    acked_at: datetime | None,
    notifications: tuple[NotificationRecord, ...],
    as_of: date,
) -> tuple[str, ...]:
    if acked_at is not None and acked_at.date() <= as_of:
        return ()

    pending: list[str] = []
    sent_types = {notification.type for notification in notifications}
    sent_daily_dates = {
        notification.sent_at.date()
        for notification in notifications
        if notification.type == DAILY_REMINDER_TYPE
    }

    for _days_before, reminder_type in REMINDER_T_MINUS_DAYS:
        if reminder_type_due_on_day(expected, reminder_type, as_of=as_of) and reminder_type not in sent_types:
            pending.append(reminder_type)

    if (
        reminder_type_due_on_day(expected, DAILY_REMINDER_TYPE, as_of=as_of)
        and as_of not in sent_daily_dates
    ):
        pending.append(DAILY_REMINDER_TYPE)

    return tuple(pending)
