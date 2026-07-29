from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from boa.api import create_app
from boa.domain import Milestone, ReleaseBlueprint, StarlightDetail, StarlightMetrics
from boa.email import load_smtp_config
from boa.reading_post_service import send_due_reading_posts, send_reading_post
from boa.storage import BoaStorage


def test_reading_post_subscription_defaults_and_updates(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("os.environ", {})
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Lantern Vale", "version": "1.6", "secret": "demo"},
        ).json()

        default_response = client.get(f"/api/releases/{release['id']}/reading-post")
        assert default_response.status_code == 200
        default_payload = default_response.json()
        assert default_payload["release_id"] == release["id"]
        assert default_payload["enabled"] is False
        assert default_payload["recipients"] == []
        assert default_payload["rhythm"] == "weekly"
        assert default_payload["schedule"] == "never"
        assert default_payload["send_time"] == "08:00"
        assert default_payload["deliver_until_days"] == 7
        assert default_payload["last_sent_at"] is None
        assert default_payload["smtp_ready"] is False

        update_response = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={
                "secret": "demo",
                "enabled": True,
                "recipients": ["rose@example.com", "rose@example.com", "fox@example.com"],
                "rhythm": "daily",
                "schedule": "weekdays",
                "send_time": "9:05",
                "deliver_until_days": 12,
            },
        )
        assert update_response.status_code == 200
        payload = update_response.json()
        assert payload["enabled"] is True
        assert payload["recipients"] == ["rose@example.com", "fox@example.com"]
        assert payload["rhythm"] == "daily"
        assert payload["schedule"] == "weekdays"
        assert payload["send_time"] == "09:05"
        assert payload["deliver_until_days"] == 12

        sleep_response = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={
                "secret": "demo",
                "enabled": False,
                "recipients": ["rose@example.com", "fox@example.com"],
                "rhythm": "daily",
                "schedule": "never",
                "send_time": "09:05",
                "deliver_until_days": 12,
            },
        )
        assert sleep_response.status_code == 200
        sleeping = sleep_response.json()
        assert sleeping["enabled"] is False
        assert sleeping["recipients"] == ["rose@example.com", "fox@example.com"]
        assert sleeping["rhythm"] == "daily"
        assert sleeping["schedule"] == "never"
        assert sleeping["send_time"] == "09:05"


def test_reading_post_subscription_rejects_bad_shape(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Lantern Vale", "version": "1.6", "secret": "demo"},
        ).json()

        bad_email = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={"secret": "demo", "enabled": True, "recipients": ["not-email"], "rhythm": "weekly", "send_time": "08:00"},
        )
        bad_rhythm = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={"secret": "demo", "enabled": True, "recipients": ["rose@example.com"], "rhythm": "hourly", "send_time": "08:00"},
        )
        bad_time = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={"secret": "demo", "enabled": True, "recipients": ["rose@example.com"], "rhythm": "weekly", "send_time": "25:00"},
        )
        bad_schedule = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={
                "secret": "demo",
                "enabled": True,
                "recipients": ["rose@example.com"],
                "schedule": "hourly",
                "send_time": "08:00",
            },
        )
        bad_until = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={
                "secret": "demo",
                "enabled": True,
                "recipients": ["rose@example.com"],
                "schedule": "daily",
                "send_time": "08:00",
                "deliver_until_days": 366,
            },
        )
        wrong_secret = client.put(
            f"/api/releases/{release['id']}/reading-post",
            json={"secret": "wrong", "enabled": True, "recipients": ["rose@example.com"], "rhythm": "weekly", "send_time": "08:00"},
        )

        assert bad_email.status_code == 422
        assert bad_rhythm.status_code == 422
        assert bad_time.status_code == 422
        assert bad_schedule.status_code == 422
        assert bad_until.status_code == 422
        assert wrong_secret.status_code == 403


def test_reading_post_send_logs_sent_email_without_smtp(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("os.environ", {})
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(Milestone(name="Kickoff", expected=date(2026, 7, 21), owner="rose"),),
        )
    )
    storage.update_release_starlight(
        release.id,
        starlight=73,
        whisper="The release is gathering steadily.",
        detail=StarlightDetail(type="markdown", content="A hill was crossed."),
        metrics=StarlightMetrics(done=5, total=9, blocked=1),
        observed_on=date(2026, 7, 27),
    )
    storage.add_bug_snapshot(
        release.id,
        open_bug_count=2,
        observed_at=datetime(2026, 7, 27, 7, 0, tzinfo=timezone.utc),
    )
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com", "fox@example.com"),
        rhythm="daily",
        schedule="daily",
        send_time="08:00",
    )

    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        sent.append({"to": to, "subject": subject, "body_text": body_text, "body_html": body_html})

    result = send_reading_post(
        storage,
        load_smtp_config(),
        release.id,
        now=datetime(2026, 7, 27, 8, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    assert result.sent is True
    assert result.log_id is not None
    assert [item["to"] for item in sent] == ["rose@example.com", "fox@example.com"]
    assert sent[0]["subject"] == "Lantern Vale 1.6 · Today’s Reading"
    log = storage.get_reading_post_log(result.log_id)
    assert log.status == "sent"
    assert log.recipients == ("rose@example.com", "fox@example.com")
    assert log.subject == "Lantern Vale 1.6 · Today’s Reading"


def test_reading_post_send_logs_failure_without_smtp(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("os.environ", {})
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(Milestone(name="Kickoff", expected=date(2026, 7, 21), owner="rose"),),
        )
    )
    storage.update_release_starlight(
        release.id,
        starlight=73,
        whisper="The release is gathering steadily.",
        detail=StarlightDetail(type="markdown", content="A hill was crossed."),
        metrics=StarlightMetrics(done=5, total=9, blocked=1),
        observed_on=date(2026, 7, 27),
    )
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com",),
        rhythm="daily",
        schedule="daily",
        send_time="08:00",
    )

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        raise RuntimeError("smtp down")

    result = send_reading_post(
        storage,
        load_smtp_config(),
        release.id,
        now=datetime(2026, 7, 27, 8, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    assert result.sent is False
    assert result.error == "smtp down"
    assert result.log_id is not None
    log = storage.get_reading_post_log(result.log_id)
    assert log.status == "failed"
    assert log.error == "smtp down"


def test_reading_post_uses_engine_room_timezone_from_tz_env(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TZ", "Asia/Taipei")
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(Milestone(name="Kickoff", expected=date(2026, 7, 21), owner="rose"),),
        )
    )
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com",),
        rhythm="daily",
        schedule="daily",
        send_time="20:00",
    )

    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        sent.append({"to": to, "subject": subject})

    before = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 27, 11, 59, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    after = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 27, 12, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    subscription = storage.get_reading_post_subscription(release.id)

    assert before == []
    assert len(after) == 1
    assert sent[0]["to"] == "rose@example.com"
    assert subscription is not None
    assert subscription.last_sent_at is not None
    assert subscription.last_sent_at.hour == 20
    assert subscription.last_sent_at.date() == date(2026, 7, 27)
    assert subscription.last_sent_at.isoformat().endswith("+08:00")


def test_due_reading_post_sends_latest_observation_once(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(Milestone(name="Kickoff", expected=date(2026, 7, 21), owner="rose"),),
        )
    )
    storage.update_release_starlight(
        release.id,
        starlight=73,
        whisper="The release is gathering steadily.",
        detail=StarlightDetail(
            type="markdown",
            content="A hill was crossed.\n\nA star feels closer.",
        ),
        metrics=StarlightMetrics(done=5, total=9, blocked=1),
        observed_on=date(2026, 7, 27),
    )
    storage.add_bug_snapshot(release.id, open_bug_count=2, observed_at=datetime(2026, 7, 27, 7, 0, tzinfo=timezone.utc))
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com", "fox@example.com"),
        rhythm="daily",
        send_time="08:00",
    )

    sent: list[dict] = []

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        sent.append({"to": to, "subject": subject, "body_text": body_text, "body_html": body_html})

    smtp_config = load_smtp_config()
    before_time = send_due_reading_posts(
        storage,
        smtp_config,
        now=datetime(2026, 7, 27, 7, 59, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    first_due = send_due_reading_posts(
        storage,
        smtp_config,
        now=datetime(2026, 7, 27, 8, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    duplicate_same_day = send_due_reading_posts(
        storage,
        smtp_config,
        now=datetime(2026, 7, 27, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    assert before_time == []
    assert len(first_due) == 1
    assert first_due[0].sent is True
    assert duplicate_same_day == []
    assert [item["to"] for item in sent] == ["rose@example.com", "fox@example.com"]
    assert sent[0]["subject"] == "Lantern Vale 1.6 · Today’s Reading"
    assert "Today’s Reading: The release is gathering steadily." in sent[0]["body_text"]
    assert "Starlight: 73/100" in sent[0]["body_text"]
    assert "Storms: 2" in sent[0]["body_text"]
    assert "A hill was crossed." in sent[0]["body_text"]

    subscription = storage.get_reading_post_subscription(release.id)
    assert subscription is not None
    assert subscription.last_sent_at == datetime(2026, 7, 27, 8, 0, tzinfo=timezone.utc)


def test_weekday_reading_post_skips_weekend(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(Milestone(name="Kickoff", expected=date(2026, 7, 1), owner="rose"),),
        )
    )
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com",),
        rhythm="daily",
        schedule="weekdays",
        send_time="08:00",
        deliver_until_days=30,
    )

    sent: list[str] = []

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        sent.append(to)

    saturday = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 25, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    monday = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 27, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    assert saturday == []
    assert len(monday) == 1
    assert sent == ["rose@example.com"]


def test_milestone_reading_post_dedupes_and_respects_delivery_window(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    env = {
        "BOA_SMTP_ENABLED": "true",
        "BOA_SMTP_HOST": "smtp.example.com",
        "BOA_SMTP_FROM": "boa@example.com",
    }
    monkeypatch.setattr("os.environ", env)
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="Lantern Vale",
            version="1.6",
            secret="demo",
            milestones=(
                Milestone(name="Kickoff", expected=date(2026, 7, 21), owner="rose"),
                Milestone(name="GA", expected=date(2026, 7, 28), owner="fox"),
            ),
        )
    )
    storage.upsert_reading_post_subscription(
        release.id,
        enabled=True,
        recipients=("rose@example.com",),
        rhythm="daily",
        schedule="milestones",
        send_time="08:00",
        deliver_until_days=1,
    )

    sent: list[str] = []

    def fake_send_email(to: str, subject: str, body_text: str, body_html: str | None) -> None:
        sent.append(to)

    before_first = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 20, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    first = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 21, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    duplicate = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 22, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    second = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 28, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )
    expired = send_due_reading_posts(
        storage,
        load_smtp_config(),
        now=datetime(2026, 7, 30, 9, 0, tzinfo=timezone.utc),
        send_email_func=fake_send_email,
    )

    assert before_first == []
    assert len(first) == 1
    assert duplicate == []
    assert len(second) == 1
    assert expired == []
    assert sent == ["rose@example.com", "rose@example.com"]

    subscription = storage.get_reading_post_subscription(release.id)
    assert subscription is not None
    assert subscription.milestone_sent_dates == ("2026-07-21", "2026-07-28")
