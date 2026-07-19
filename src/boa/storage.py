"""SQLite-backed storage for Boa releases and runtime state."""

from __future__ import annotations

import re
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterator

from boa.domain import (
    AckRecord,
    AckTokenRecord,
    BUG_SNAPSHOT_INGEST_CAPABILITY,
    BugSnapshot,
    BugSnapshotSubmission,
    DAILY_REMINDER_TYPE,
    EmailLogRecord,
    Milestone,
    MilestoneRecord,
    MilestoneTimelineItem,
    NotificationRecord,
    PluginDescriptor,
    ReleaseBlueprint,
    ReleaseRecord,
    ReleaseStarlight,
    ReleaseTimeline,
    ReminderState,
    StarlightDetail,
    StarlightEvent,
    StarlightMetrics,
    StarlightStatus,
    pending_reminder_types,
)


class BoaStorage:
    """Repository layer for Boa's persisted state."""

    def __init__(self, db_path: str | Path = "boa.db") -> None:
        self.db_path = str(db_path)
        self.plugin_registry = {
            "manual_bug_snapshot": PluginDescriptor(
                name="manual_bug_snapshot",
                version="1.0.0",
                capabilities=(BUG_SNAPSHOT_INGEST_CAPABILITY,),
                endpoint="/api/plugins/manual_bug_snapshot/releases/{release_id}/bug-snapshots",
            )
        }

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS releases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product TEXT NOT NULL,
                    version TEXT NOT NULL,
                    secret TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS milestones (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    expected TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    email TEXT NOT NULL DEFAULT '',
                    note TEXT NOT NULL DEFAULT '',
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS milestone_ack (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    milestone_id INTEGER NOT NULL,
                    owner TEXT NOT NULL,
                    ack_name TEXT NOT NULL DEFAULT '',
                    acked_at TEXT NOT NULL,
                    note TEXT NOT NULL DEFAULT '',
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS bug_snapshot (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    snapshot_date TEXT NOT NULL,
                    observed_at TEXT,
                    signal_type TEXT NOT NULL DEFAULT 'total',
                    open_bug_count INTEGER NOT NULL,
                    quality TEXT NOT NULL DEFAULT 'normal',
                    quality_reason TEXT,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS notification_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    milestone_id INTEGER NOT NULL,
                    sent_at TEXT NOT NULL,
                    type TEXT NOT NULL,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS ack_token (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    milestone_id INTEGER NOT NULL UNIQUE,
                    token_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    used_at TEXT,
                    ack_id INTEGER,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
                    FOREIGN KEY (ack_id) REFERENCES milestone_ack(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS email_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    milestone_id INTEGER NOT NULL,
                    notification_id INTEGER,
                    template_name TEXT NOT NULL,
                    recipient TEXT NOT NULL,
                    token_id INTEGER,
                    subject TEXT NOT NULL,
                    sent_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'sent',
                    error TEXT,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
                    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
                    FOREIGN KEY (notification_id) REFERENCES notification_log(id) ON DELETE SET NULL,
                    FOREIGN KEY (token_id) REFERENCES ack_token(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS starlight_status (
                    release_id INTEGER PRIMARY KEY,
                    starlight INTEGER NOT NULL,
                    whisper TEXT NOT NULL,
                    detail_type TEXT NOT NULL DEFAULT 'markdown',
                    detail_content TEXT NOT NULL DEFAULT '',
                    metrics_present INTEGER NOT NULL DEFAULT 0,
                    done_count INTEGER NOT NULL DEFAULT 0,
                    total_count INTEGER NOT NULL DEFAULT 0,
                    blocked_count INTEGER NOT NULL DEFAULT 0,
                    observed_on TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS starlight_event (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    release_id INTEGER NOT NULL,
                    observed_on TEXT NOT NULL,
                    starlight INTEGER NOT NULL,
                    whisper TEXT NOT NULL,
                    detail_type TEXT NOT NULL DEFAULT 'markdown',
                    detail_content TEXT NOT NULL DEFAULT '',
                    metrics_present INTEGER NOT NULL DEFAULT 0,
                    done_count INTEGER NOT NULL DEFAULT 0,
                    total_count INTEGER NOT NULL DEFAULT 0,
                    blocked_count INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
                );
                """
            )
            ack_columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(milestone_ack)").fetchall()
            }
            if "note" not in ack_columns:
                connection.execute(
                    "ALTER TABLE milestone_ack ADD COLUMN note TEXT NOT NULL DEFAULT ''"
                )
            if "ack_name" not in ack_columns:
                connection.execute(
                    "ALTER TABLE milestone_ack ADD COLUMN ack_name TEXT NOT NULL DEFAULT ''"
                )
            connection.execute(
                """
                UPDATE milestone_ack
                SET ack_name = owner
                WHERE ack_name = ''
                """
            )
            milestone_columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(milestones)").fetchall()
            }
            if "note" not in milestone_columns:
                connection.execute(
                    "ALTER TABLE milestones ADD COLUMN note TEXT NOT NULL DEFAULT ''"
                )
            if "email" not in milestone_columns:
                connection.execute(
                    "ALTER TABLE milestones ADD COLUMN email TEXT NOT NULL DEFAULT ''"
                )
            bug_snapshot_columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(bug_snapshot)").fetchall()
            }
            if "observed_at" not in bug_snapshot_columns:
                connection.execute("ALTER TABLE bug_snapshot ADD COLUMN observed_at TEXT")
            if "signal_type" not in bug_snapshot_columns:
                connection.execute("ALTER TABLE bug_snapshot ADD COLUMN signal_type TEXT NOT NULL DEFAULT 'total'")
            if "quality" not in bug_snapshot_columns:
                connection.execute("ALTER TABLE bug_snapshot ADD COLUMN quality TEXT NOT NULL DEFAULT 'normal'")
            if "quality_reason" not in bug_snapshot_columns:
                connection.execute("ALTER TABLE bug_snapshot ADD COLUMN quality_reason TEXT")
            connection.execute(
                """
                UPDATE bug_snapshot
                SET observed_at = snapshot_date || 'T12:00:00+00:00'
                WHERE observed_at IS NULL
                """
            )
            starlight_status_columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(starlight_status)").fetchall()
            }
            if "done_count" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN done_count INTEGER NOT NULL DEFAULT 0"
                )
            if "detail_type" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN detail_type TEXT NOT NULL DEFAULT 'markdown'"
                )
            if "detail_content" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN detail_content TEXT NOT NULL DEFAULT ''"
                )
            if "metrics_present" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN metrics_present INTEGER NOT NULL DEFAULT 0"
                )
            if "total_count" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN total_count INTEGER NOT NULL DEFAULT 0"
                )
            if "blocked_count" not in starlight_status_columns:
                connection.execute(
                    "ALTER TABLE starlight_status ADD COLUMN blocked_count INTEGER NOT NULL DEFAULT 0"
                )
            connection.execute(
                """
                UPDATE starlight_status
                SET metrics_present = 1
                WHERE metrics_present = 0
                  AND (done_count > 0 OR total_count > 0 OR blocked_count > 0)
                """
            )
            starlight_event_columns = {
                str(row["name"])
                for row in connection.execute("PRAGMA table_info(starlight_event)").fetchall()
            }
            if starlight_event_columns:
                if "detail_type" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN detail_type TEXT NOT NULL DEFAULT 'markdown'"
                    )
                if "detail_content" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN detail_content TEXT NOT NULL DEFAULT ''"
                    )
                if "metrics_present" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN metrics_present INTEGER NOT NULL DEFAULT 0"
                    )
                if "done_count" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN done_count INTEGER NOT NULL DEFAULT 0"
                    )
                if "total_count" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN total_count INTEGER NOT NULL DEFAULT 0"
                    )
                if "blocked_count" not in starlight_event_columns:
                    connection.execute(
                        "ALTER TABLE starlight_event ADD COLUMN blocked_count INTEGER NOT NULL DEFAULT 0"
                    )
                connection.execute(
                    """
                    UPDATE starlight_event
                    SET metrics_present = 1
                    WHERE metrics_present = 0
                      AND (done_count > 0 OR total_count > 0 OR blocked_count > 0)
                    """
                )

    def create_release(self, blueprint: ReleaseBlueprint) -> ReleaseRecord:
        with self.connect() as connection:
            self._ensure_unique_release_version(connection, blueprint.product, blueprint.version)
            cursor = connection.execute(
                """
                INSERT INTO releases (product, version, secret)
                VALUES (?, ?, ?)
                """,
                (blueprint.product, blueprint.version, blueprint.secret),
            )
            release_id = int(cursor.lastrowid)

            connection.executemany(
                """
                INSERT INTO milestones (release_id, name, expected, owner, email, note)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        release_id,
                        milestone.name,
                        milestone.expected.isoformat(),
                        milestone.owner,
                        milestone.email or "",
                        milestone.note or "",
                    )
                    for milestone in blueprint.milestones
                ],
            )

        return self.get_release(release_id)

    def list_releases(self) -> list[ReleaseRecord]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT id FROM releases ORDER BY id ASC"
            ).fetchall()
        return [self.get_release(int(row["id"])) for row in rows]

    def list_releases_for_galaxy(self, galaxy_slug: str) -> list[ReleaseRecord]:
        normalized_slug = slugify_galaxy(galaxy_slug)
        if not normalized_slug:
            return []
        return [
            release
            for release in self.list_releases()
            if slugify_galaxy(release.blueprint.product) == normalized_slug
        ]

    def get_release(self, release_id: int) -> ReleaseRecord:
        with self.connect() as connection:
            release_row = connection.execute(
                """
                SELECT id, product, version, secret
                FROM releases
                WHERE id = ?
                """,
                (release_id,),
            ).fetchone()
            if release_row is None:
                raise KeyError(f"Release {release_id} was not found.")

            milestone_rows = connection.execute(
                """
                SELECT id, release_id, name, expected, owner, email, note
                FROM milestones
                WHERE release_id = ?
                ORDER BY expected ASC, id ASC
                """,
                (release_id,),
            ).fetchall()

        blueprint = ReleaseBlueprint(
            product=str(release_row["product"]),
            version=str(release_row["version"]),
            secret=str(release_row["secret"]),
            milestones=tuple(
                Milestone(
                    name=str(row["name"]),
                    expected=date.fromisoformat(str(row["expected"])),
                    owner=str(row["owner"]),
                    note=str(row["note"]) if row["note"] else None,
                )
                for row in milestone_rows
            ),
        )
        return ReleaseRecord(id=int(release_row["id"]), blueprint=blueprint)

    def list_milestones(self, release_id: int) -> list[MilestoneRecord]:
        self.get_release(release_id)
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT id, release_id, name, expected, owner, email, note
                FROM milestones
                WHERE release_id = ?
                ORDER BY expected ASC, id ASC
                """,
                (release_id,),
            ).fetchall()

        return [
            MilestoneRecord(
                id=int(row["id"]),
                release_id=int(row["release_id"]),
                name=str(row["name"]),
                expected=date.fromisoformat(str(row["expected"])),
                owner=str(row["owner"]),
                note=str(row["note"]) if row["note"] else None,
            )
            for row in rows
        ]

    def delete_release(self, release_id: int) -> None:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM releases WHERE id = ?",
                (release_id,),
            )
            if cursor.rowcount == 0:
                raise KeyError(f"Release {release_id} was not found.")

    def update_release(self, release_id: int, blueprint: ReleaseBlueprint) -> ReleaseRecord:
        with self.connect() as connection:
            self._ensure_unique_release_version(
                connection,
                blueprint.product,
                blueprint.version,
                ignored_release_id=release_id,
            )
            cursor = connection.execute(
                """
                UPDATE releases
                SET product = ?, version = ?, secret = ?
                WHERE id = ?
                """,
                (blueprint.product, blueprint.version, blueprint.secret, release_id),
            )
            if cursor.rowcount == 0:
                raise KeyError(f"Release {release_id} was not found.")
        return self.get_release(release_id)

    def _ensure_unique_release_version(
        self,
        connection: sqlite3.Connection,
        product: str,
        version: str,
        *,
        ignored_release_id: int | None = None,
    ) -> None:
        if ignored_release_id is None:
            row = connection.execute(
                """
                SELECT id FROM releases
                WHERE product = ? AND version = ?
                LIMIT 1
                """,
                (product, version),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT id FROM releases
                WHERE product = ? AND version = ? AND id != ?
                LIMIT 1
                """,
                (product, version, ignored_release_id),
            ).fetchone()

        if row is not None:
            raise ValueError(f"{product} {version} already exists.")

    def add_milestone(self, release_id: int, milestone: Milestone) -> MilestoneRecord:
        self.get_release(release_id)
        with self.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO milestones (release_id, name, expected, owner, email, note)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    release_id,
                    milestone.name,
                    milestone.expected.isoformat(),
                    milestone.owner,
                    (milestone.email or ""),
                    (milestone.note or ""),
                ),
            )
            milestone_id = int(cursor.lastrowid)
        return self.get_milestone(milestone_id)

    def update_milestone(self, milestone_id: int, milestone: Milestone) -> MilestoneRecord:
        with self.connect() as connection:
            cursor = connection.execute(
                """
                UPDATE milestones
                SET name = ?, expected = ?, owner = ?, email = ?, note = ?
                WHERE id = ?
                """,
                (
                    milestone.name,
                    milestone.expected.isoformat(),
                    milestone.owner,
                    (milestone.email or ""),
                    (milestone.note or ""),
                    milestone_id,
                ),
            )
            if cursor.rowcount == 0:
                raise KeyError(f"Milestone {milestone_id} was not found.")
        return self.get_milestone(milestone_id)

    def delete_milestone(self, milestone_id: int) -> None:
        with self.connect() as connection:
            cursor = connection.execute("DELETE FROM milestones WHERE id = ?", (milestone_id,))
            if cursor.rowcount == 0:
                raise KeyError(f"Milestone {milestone_id} was not found.")

    def get_milestone(self, milestone_id: int) -> MilestoneRecord:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT id, release_id, name, expected, owner, email, note
                FROM milestones
                WHERE id = ?
                """,
                (milestone_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Milestone {milestone_id} was not found.")

        return MilestoneRecord(
            id=int(row["id"]),
            release_id=int(row["release_id"]),
            name=str(row["name"]),
            expected=date.fromisoformat(str(row["expected"])),
            owner=str(row["owner"]),
            note=str(row["note"]) if row["note"] else None,
            email=str(row["email"]) if row["email"] else None,
        )

    def ack_milestone(self, milestone_id: int, ack_name: str, note: str) -> AckRecord:
        milestone = self.get_milestone(milestone_id)
        with self.connect() as connection:
            acked_at = datetime.now(timezone.utc).replace(microsecond=0)
            cursor = connection.execute(
                """
                INSERT INTO milestone_ack (release_id, milestone_id, owner, ack_name, acked_at, note)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    milestone.release_id,
                    milestone.id,
                    milestone.owner,
                    ack_name,
                    acked_at.isoformat(),
                    note,
                ),
            )
            ack_id = int(cursor.lastrowid)
        return AckRecord(
            id=ack_id,
            release_id=milestone.release_id,
            milestone_id=milestone.id,
            ack_name=ack_name,
            acked_at=acked_at,
            note=note,
        )

    def list_bug_snapshots(self, release_id: int) -> list[BugSnapshot]:
        self.get_release(release_id)
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT id, release_id, observed_at, signal_type, open_bug_count, quality, quality_reason
                FROM bug_snapshot
                WHERE release_id = ?
                ORDER BY observed_at ASC, id ASC
                """,
                (release_id,),
            ).fetchall()
        return [
            BugSnapshot(
                id=int(row["id"]),
                release_id=int(row["release_id"]),
                observed_at=datetime.fromisoformat(str(row["observed_at"])),
                signal_type=str(row["signal_type"]),
                open_bug_count=int(row["open_bug_count"]),
                quality=str(row["quality"]),
                quality_reason=str(row["quality_reason"]) if row["quality_reason"] is not None else None,
            )
            for row in rows
        ]

    def add_bug_snapshot(
        self,
        release_id: int,
        *,
        open_bug_count: int,
        signal_type: str = "total",
        observed_at: datetime | None = None,
    ) -> BugSnapshot:
        self.get_release(release_id)
        cleaned_signal_type = signal_type.strip().lower() or "total"
        if observed_at is None:
            observed_at = datetime.now(timezone.utc).replace(microsecond=0)
        elif observed_at.tzinfo is None:
            observed_at = observed_at.replace(tzinfo=timezone.utc)
        else:
            observed_at = observed_at.astimezone(timezone.utc).replace(microsecond=0)

        with self.connect() as connection:
            previous = connection.execute(
                """
                SELECT open_bug_count
                FROM bug_snapshot
                WHERE release_id = ? AND signal_type = ? AND quality = 'normal'
                ORDER BY observed_at DESC, id DESC
                LIMIT 1
                """,
                (release_id, cleaned_signal_type),
            ).fetchone()
            quality, quality_reason = self._classify_bug_snapshot_quality(
                open_bug_count,
                previous_count=(int(previous["open_bug_count"]) if previous is not None else None),
            )
            cursor = connection.execute(
                """
                INSERT INTO bug_snapshot (
                    release_id,
                    snapshot_date,
                    observed_at,
                    signal_type,
                    open_bug_count,
                    quality,
                    quality_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    release_id,
                    observed_at.date().isoformat(),
                    observed_at.isoformat(),
                    cleaned_signal_type,
                    open_bug_count,
                    quality,
                    quality_reason,
                ),
            )
            snapshot_id = int(cursor.lastrowid)
        return BugSnapshot(
            id=snapshot_id,
            release_id=release_id,
            observed_at=observed_at,
            signal_type=cleaned_signal_type,
            open_bug_count=open_bug_count,
            quality=quality,
            quality_reason=quality_reason,
        )

    def _classify_bug_snapshot_quality(
        self,
        open_bug_count: int,
        *,
        previous_count: int | None,
    ) -> tuple[str, str | None]:
        if previous_count is None:
            return ("normal", None)
        if open_bug_count >= 100_000 and open_bug_count > max(previous_count * 20, previous_count + 10_000):
            return ("suspicious", "extreme spike from previous observation")
        if open_bug_count == 0 and previous_count >= 50:
            return ("suspicious", "sudden drop to zero from previous observation")
        return ("normal", None)

    def list_plugins(self) -> list[PluginDescriptor]:
        return list(self.plugin_registry.values())

    def run_bug_snapshot_plugin(
        self,
        plugin_name: str,
        release_id: int,
        submission: BugSnapshotSubmission,
    ) -> BugSnapshot:
        plugin = self.plugin_registry.get(plugin_name)
        if plugin is None:
            raise KeyError(f"Plugin {plugin_name} was not found.")
        if BUG_SNAPSHOT_INGEST_CAPABILITY not in plugin.capabilities:
            raise ValueError(f"Plugin {plugin_name} does not support bug snapshot ingestion.")
        return self.add_bug_snapshot(
            release_id,
            open_bug_count=submission.open_bug_count,
            signal_type=submission.signal_type,
        )

    def get_release_starlight(self, release_id: int) -> ReleaseStarlight | None:
        self.get_release(release_id)
        with self.connect() as connection:
            current_row = connection.execute(
                """
                SELECT
                    release_id,
                    starlight,
                    whisper,
                    detail_type,
                    detail_content,
                    metrics_present,
                    done_count,
                    total_count,
                    blocked_count,
                    observed_on,
                    updated_at
                FROM starlight_status
                WHERE release_id = ?
                """,
                (release_id,),
            ).fetchone()
            if current_row is None:
                return None

            event_rows = connection.execute(
                """
                SELECT
                    id,
                    release_id,
                    observed_on,
                    starlight,
                    whisper,
                    detail_type,
                    detail_content,
                    metrics_present,
                    done_count,
                    total_count,
                    blocked_count,
                    created_at
                FROM starlight_event
                WHERE release_id = ?
                ORDER BY observed_on ASC, id ASC
                """,
                (release_id,),
            ).fetchall()

        current = StarlightStatus(
            release_id=int(current_row["release_id"]),
            starlight=int(current_row["starlight"]),
            whisper=str(current_row["whisper"]),
            detail=StarlightDetail(
                type=str(current_row["detail_type"] or "markdown"),
                content=str(current_row["detail_content"] or ""),
            ),
            metrics=(
                StarlightMetrics(
                    done=int(current_row["done_count"]),
                    total=int(current_row["total_count"]),
                    blocked=int(current_row["blocked_count"]),
                )
                if int(current_row["metrics_present"] or 0)
                else None
            ),
            observed_on=date.fromisoformat(str(current_row["observed_on"])),
            updated_at=datetime.fromisoformat(str(current_row["updated_at"])),
        )
        trail = tuple(
            StarlightEvent(
                id=int(row["id"]),
                release_id=int(row["release_id"]),
                observed_on=date.fromisoformat(str(row["observed_on"])),
                starlight=int(row["starlight"]),
                whisper=str(row["whisper"]),
                detail=StarlightDetail(
                    type=str(row["detail_type"] or "markdown"),
                    content=str(row["detail_content"] or ""),
                ),
                metrics=(
                    StarlightMetrics(
                        done=int(row["done_count"]),
                        total=int(row["total_count"]),
                        blocked=int(row["blocked_count"]),
                    )
                    if int(row["metrics_present"] or 0)
                    else None
                ),
                created_at=datetime.fromisoformat(str(row["created_at"])),
            )
            for row in event_rows
        )
        return ReleaseStarlight(current=current, trail=trail)

    def update_release_starlight(
        self,
        release_id: int,
        *,
        starlight: int,
        whisper: str,
        detail: StarlightDetail,
        metrics: StarlightMetrics | None,
        observed_on: date,
    ) -> ReleaseStarlight:
        self.get_release(release_id)
        updated_at = datetime.now(timezone.utc).replace(microsecond=0)
        with self.connect() as connection:
            current_row = connection.execute(
                """
                SELECT starlight
                FROM starlight_status
                WHERE release_id = ?
                """,
                (release_id,),
            ).fetchone()

            connection.execute(
                """
                INSERT INTO starlight_status (
                    release_id,
                    starlight,
                    whisper,
                    detail_type,
                    detail_content,
                    metrics_present,
                    done_count,
                    total_count,
                    blocked_count,
                    observed_on,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(release_id) DO UPDATE SET
                    starlight = excluded.starlight,
                    whisper = excluded.whisper,
                    detail_type = excluded.detail_type,
                    detail_content = excluded.detail_content,
                    metrics_present = excluded.metrics_present,
                    done_count = excluded.done_count,
                    total_count = excluded.total_count,
                    blocked_count = excluded.blocked_count,
                    observed_on = excluded.observed_on,
                    updated_at = excluded.updated_at
                """,
                (
                    release_id,
                    starlight,
                    whisper,
                    detail.type,
                    detail.content,
                    1 if metrics is not None else 0,
                    metrics.done if metrics is not None else 0,
                    metrics.total if metrics is not None else 0,
                    metrics.blocked if metrics is not None else 0,
                    observed_on.isoformat(),
                    updated_at.isoformat(),
                ),
            )

            current_starlight = int(current_row["starlight"]) if current_row is not None else None
            if current_starlight is None or current_starlight != starlight:
                connection.execute(
                    """
                    INSERT INTO starlight_event (
                        release_id,
                        observed_on,
                        starlight,
                        whisper,
                        detail_type,
                        detail_content,
                        metrics_present,
                        done_count,
                        total_count,
                        blocked_count,
                        created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        release_id,
                        observed_on.isoformat(),
                        starlight,
                        whisper,
                        detail.type,
                        detail.content,
                        1 if metrics is not None else 0,
                        metrics.done if metrics is not None else 0,
                        metrics.total if metrics is not None else 0,
                        metrics.blocked if metrics is not None else 0,
                        updated_at.isoformat(),
                    ),
                )

        result = self.get_release_starlight(release_id)
        if result is None:
            raise KeyError(f"Release {release_id} was not found.")
        return result

    def log_notification(
        self,
        *,
        release_id: int,
        milestone_id: int,
        notification_type: str,
        sent_at: datetime,
    ) -> NotificationRecord:
        with self.connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO notification_log (release_id, milestone_id, sent_at, type)
                VALUES (?, ?, ?, ?)
                """,
                (release_id, milestone_id, sent_at.isoformat(), notification_type),
            )
            notification_id = int(cursor.lastrowid)
        return NotificationRecord(
            id=notification_id,
            release_id=release_id,
            milestone_id=milestone_id,
            type=notification_type,
            sent_at=sent_at,
        )

    def create_or_replace_ack_token(
        self,
        *,
        release_id: int,
        milestone_id: int,
        token_hash: str,
        expires_at: datetime,
    ) -> AckTokenRecord:
        now = datetime.now(timezone.utc).replace(microsecond=0)
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT INTO ack_token (release_id, milestone_id, token_hash, created_at, expires_at, used_at, ack_id) "
                "VALUES (?, ?, ?, ?, ?, NULL, NULL) "
                "ON CONFLICT(milestone_id) DO UPDATE SET "
                "token_hash = excluded.token_hash, "
                "created_at = excluded.created_at, "
                "expires_at = excluded.expires_at, "
                "used_at = NULL, "
                "ack_id = NULL",
                (release_id, milestone_id, token_hash, now.isoformat(), expires_at.isoformat()),
            )
            token_id = int(cursor.lastrowid)
        return self.get_ack_token(token_id)

    def get_ack_token(self, token_id: int) -> AckTokenRecord:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT id, release_id, milestone_id, token_hash, created_at, expires_at, used_at, ack_id "
                "FROM ack_token WHERE id = ?",
                (token_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Ack token {token_id} was not found.")
        return AckTokenRecord(
            id=int(row["id"]),
            release_id=int(row["release_id"]),
            milestone_id=int(row["milestone_id"]),
            token_hash=str(row["token_hash"]),
            created_at=datetime.fromisoformat(str(row["created_at"])),
            expires_at=datetime.fromisoformat(str(row["expires_at"])),
            used_at=datetime.fromisoformat(str(row["used_at"])) if row["used_at"] else None,
            ack_id=int(row["ack_id"]) if row["ack_id"] else None,
        )

    def get_ack_token_by_hash(self, token_hash: str) -> AckTokenRecord | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT id, release_id, milestone_id, token_hash, created_at, expires_at, used_at, ack_id "
                "FROM ack_token WHERE token_hash = ?",
                (token_hash,),
            ).fetchone()
        if row is None:
            return None
        return AckTokenRecord(
            id=int(row["id"]),
            release_id=int(row["release_id"]),
            milestone_id=int(row["milestone_id"]),
            token_hash=str(row["token_hash"]),
            created_at=datetime.fromisoformat(str(row["created_at"])),
            expires_at=datetime.fromisoformat(str(row["expires_at"])),
            used_at=datetime.fromisoformat(str(row["used_at"])) if row["used_at"] else None,
            ack_id=int(row["ack_id"]) if row["ack_id"] else None,
        )

    def mark_ack_token_used(
        self,
        token_id: int,
        *,
        ack_id: int,
        used_at: datetime,
    ) -> AckTokenRecord:
        with self.connect() as connection:
            connection.execute(
                "UPDATE ack_token SET used_at = ?, ack_id = ? WHERE id = ?",
                (used_at.isoformat(), ack_id, token_id),
            )
        return self.get_ack_token(token_id)

    def log_email(
        self,
        *,
        release_id: int,
        milestone_id: int,
        notification_id: int | None,
        template_name: str,
        recipient: str,
        token_id: int | None,
        subject: str,
        sent_at: datetime,
        status: str,
        error: str | None = None,
    ) -> EmailLogRecord:
        with self.connect() as connection:
            cursor = connection.execute(
                "INSERT INTO email_log (release_id, milestone_id, notification_id, template_name, "
                "recipient, token_id, subject, sent_at, status, error) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    release_id,
                    milestone_id,
                    notification_id,
                    template_name,
                    recipient,
                    token_id,
                    subject,
                    sent_at.isoformat(),
                    status,
                    error,
                ),
            )
            email_id = int(cursor.lastrowid)
        return self.get_email_log(email_id)

    def get_email_log(self, email_id: int) -> EmailLogRecord:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT id, release_id, milestone_id, notification_id, template_name, "
                "recipient, token_id, subject, sent_at, status, error "
                "FROM email_log WHERE id = ?",
                (email_id,),
            ).fetchone()
        if row is None:
            raise KeyError(f"Email log {email_id} was not found.")
        return EmailLogRecord(
            id=int(row["id"]),
            release_id=int(row["release_id"]),
            milestone_id=int(row["milestone_id"]),
            notification_id=int(row["notification_id"]) if row["notification_id"] else None,
            template_name=str(row["template_name"]),
            recipient=str(row["recipient"]),
            token_id=int(row["token_id"]) if row["token_id"] else None,
            subject=str(row["subject"]),
            sent_at=datetime.fromisoformat(str(row["sent_at"])),
            status=str(row["status"]),
            error=str(row["error"]) if row["error"] else None,
        )

    def list_email_logs(
        self,
        *,
        release_id: int | None = None,
        milestone_id: int | None = None,
    ) -> list[EmailLogRecord]:
        where: list[str] = []
        params: list[int] = []
        if release_id is not None:
            where.append("release_id = ?")
            params.append(release_id)
        if milestone_id is not None:
            where.append("milestone_id = ?")
            params.append(milestone_id)

        query = "SELECT id, release_id, milestone_id, notification_id, template_name, "
        query += "recipient, token_id, subject, sent_at, status, error FROM email_log"
        if where:
            query += f" WHERE {' AND '.join(where)}"
        query += " ORDER BY sent_at DESC, id DESC"

        with self.connect() as connection:
            rows = connection.execute(query, params).fetchall()

        return [
            EmailLogRecord(
                id=int(row["id"]),
                release_id=int(row["release_id"]),
                milestone_id=int(row["milestone_id"]),
                notification_id=int(row["notification_id"]) if row["notification_id"] else None,
                template_name=str(row["template_name"]),
                recipient=str(row["recipient"]),
                token_id=int(row["token_id"]) if row["token_id"] else None,
                subject=str(row["subject"]),
                sent_at=datetime.fromisoformat(str(row["sent_at"])),
                status=str(row["status"]),
                error=str(row["error"]) if row["error"] else None,
            )
            for row in rows
        ]

    def list_notifications(
        self,
        *,
        release_id: int | None = None,
        milestone_id: int | None = None,
    ) -> list[NotificationRecord]:
        where: list[str] = []
        params: list[int] = []
        if release_id is not None:
            where.append("release_id = ?")
            params.append(release_id)
        if milestone_id is not None:
            where.append("milestone_id = ?")
            params.append(milestone_id)

        query = """
            SELECT id, release_id, milestone_id, sent_at, type
            FROM notification_log
        """
        if where:
            query += f" WHERE {' AND '.join(where)}"
        query += " ORDER BY sent_at ASC, id ASC"

        with self.connect() as connection:
            rows = connection.execute(query, params).fetchall()

        return [
            NotificationRecord(
                id=int(row["id"]),
                release_id=int(row["release_id"]),
                milestone_id=int(row["milestone_id"]),
                type=str(row["type"]),
                sent_at=datetime.fromisoformat(str(row["sent_at"])),
            )
            for row in rows
        ]

    def get_milestone_reminder_state(self, milestone_id: int, *, as_of: date) -> ReminderState:
        milestone = self.get_milestone(milestone_id)
        timeline = self.get_release_timeline(milestone.release_id)
        timeline_item = next(item for item in timeline.milestones if item.id == milestone_id)
        notifications = tuple(self.list_notifications(milestone_id=milestone_id))
        emails = tuple(self.list_email_logs(milestone_id=milestone_id))
        return ReminderState(
            release_id=timeline_item.release_id,
            milestone_id=timeline_item.id,
            milestone_name=timeline_item.name,
            expected=timeline_item.expected,
            owner=timeline_item.owner,
            acked_at=timeline_item.acked_at,
            pending_types=pending_reminder_types(
                expected=timeline_item.expected,
                acked_at=timeline_item.acked_at,
                notifications=notifications,
                as_of=as_of,
            ),
            notifications=notifications,
            emails=emails,
        )

    def list_release_reminder_states(self, release_id: int, *, as_of: date) -> list[ReminderState]:
        timeline = self.get_release_timeline(release_id)
        notifications_by_milestone: dict[int, list[NotificationRecord]] = {}
        for notification in self.list_notifications(release_id=release_id):
            notifications_by_milestone.setdefault(notification.milestone_id, []).append(notification)

        emails_by_milestone: dict[int, list[EmailLogRecord]] = {}
        for email in self.list_email_logs(release_id=release_id):
            emails_by_milestone.setdefault(email.milestone_id, []).append(email)

        states: list[ReminderState] = []
        for item in timeline.milestones:
            notifications = tuple(notifications_by_milestone.get(item.id, []))
            emails = tuple(emails_by_milestone.get(item.id, []))
            states.append(
                ReminderState(
                    release_id=item.release_id,
                    milestone_id=item.id,
                    milestone_name=item.name,
                    expected=item.expected,
                    owner=item.owner,
                    acked_at=item.acked_at,
                    pending_types=pending_reminder_types(
                        expected=item.expected,
                        acked_at=item.acked_at,
                        notifications=notifications,
                        as_of=as_of,
                    ),
                    notifications=notifications,
                    emails=emails,
                )
            )
        return states

    def generate_due_notifications(
        self,
        *,
        as_of: date,
        sent_at: datetime | None = None,
    ) -> list[NotificationRecord]:
        if sent_at is None:
            sent_at = datetime.now(timezone.utc).replace(microsecond=0)

        generated: list[NotificationRecord] = []
        for release in self.list_releases():
            for state in self.list_release_reminder_states(release.id, as_of=as_of):
                for reminder_type in state.pending_types:
                    effective_sent_at = sent_at
                    if reminder_type == DAILY_REMINDER_TYPE:
                        effective_sent_at = sent_at.replace(
                            year=as_of.year,
                            month=as_of.month,
                            day=as_of.day,
                        )
                    generated.append(
                        self.log_notification(
                            release_id=state.release_id,
                            milestone_id=state.milestone_id,
                            notification_type=reminder_type,
                            sent_at=effective_sent_at,
                        )
                    )
        return generated

    def get_release_timeline(self, release_id: int) -> ReleaseTimeline:
        release = self.get_release(release_id)
        with self.connect() as connection:
            milestone_rows = connection.execute(
                """
                SELECT
                    milestones.id,
                    milestones.release_id,
                    milestones.name,
                    milestones.expected,
                    milestones.owner,
                    milestones.email,
                    milestones.note,
                    (
                        SELECT milestone_ack.ack_name
                        FROM milestone_ack
                        WHERE milestone_ack.milestone_id = milestones.id
                        ORDER BY milestone_ack.acked_at DESC, milestone_ack.id DESC
                        LIMIT 1
                    ) AS ack_name
                    ,
                    (
                        SELECT milestone_ack.acked_at
                        FROM milestone_ack
                        WHERE milestone_ack.milestone_id = milestones.id
                        ORDER BY milestone_ack.acked_at DESC, milestone_ack.id DESC
                        LIMIT 1
                    ) AS acked_at
                    ,
                    (
                        SELECT milestone_ack.note
                        FROM milestone_ack
                        WHERE milestone_ack.milestone_id = milestones.id
                        ORDER BY milestone_ack.acked_at DESC, milestone_ack.id DESC
                        LIMIT 1
                    ) AS ack_note
                FROM milestones
                WHERE milestones.release_id = ?
                ORDER BY milestones.expected ASC, milestones.id ASC
                """,
                (release_id,),
            ).fetchall()
            ack_rows = connection.execute(
                """
                SELECT id, release_id, milestone_id, ack_name, owner, acked_at, note
                FROM milestone_ack
                WHERE release_id = ?
                ORDER BY acked_at DESC, id DESC
                """,
                (release_id,),
            ).fetchall()

        ack_history_by_milestone: dict[int, list[AckRecord]] = {}
        for row in ack_rows:
            milestone_id = int(row["milestone_id"])
            ack_history_by_milestone.setdefault(milestone_id, []).append(
                AckRecord(
                    id=int(row["id"]),
                    release_id=int(row["release_id"]),
                    milestone_id=milestone_id,
                    ack_name=str(row["ack_name"]) if row["ack_name"] else str(row["owner"]),
                    acked_at=datetime.fromisoformat(str(row["acked_at"])),
                    note=str(row["note"]) if row["note"] is not None else "",
                )
            )

        return ReleaseTimeline(
            release=release,
            milestones=tuple(
                MilestoneTimelineItem(
                    id=int(row["id"]),
                    release_id=int(row["release_id"]),
                    name=str(row["name"]),
                    expected=date.fromisoformat(str(row["expected"])),
                    owner=str(row["owner"]),
                    email=str(row["email"]) if row["email"] else None,
                    note=str(row["note"]) if row["note"] else None,
                    acked_at=(
                        datetime.fromisoformat(str(row["acked_at"]))
                        if row["acked_at"] is not None
                        else None
                    ),
                    ack_name=str(row["ack_name"]) if row["ack_name"] else None,
                    ack_note=str(row["ack_note"]) if row["ack_note"] is not None else None,
                    ack_trail=tuple(ack_history_by_milestone.get(int(row["id"]), [])),
                )
                for row in milestone_rows
            ),
            bug_snapshots=tuple(self.list_bug_snapshots(release_id)),
            starlight=self.get_release_starlight(release_id),
        )

    def list_release_timelines(self, galaxy_slug: str | None = None) -> list[ReleaseTimeline]:
        releases = (
            self.list_releases_for_galaxy(galaxy_slug)
            if galaxy_slug is not None
            else self.list_releases()
        )
        return [self.get_release_timeline(release.id) for release in releases]


def slugify_galaxy(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.strip().lower()))
