from __future__ import annotations

import sqlite3
from datetime import date, datetime, timezone

from fastapi.testclient import TestClient

from boa.api import create_app
from boa.domain import Milestone, ReleaseBlueprint
from boa.storage import BoaStorage


def test_root_serves_boa_ui(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "reveal the shape of a journey" in response.text


def test_galaxy_route_serves_boa_ui(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/fortisase")
        assert response.status_code == 200
        assert "reveal the shape of a journey" in response.text


def test_galaxy_route_serves_boa_ui(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/fortisase")
        assert response.status_code == 200
        assert "reveal the shape of a release" in response.text


def test_release_crud_and_export(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        create_response = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["product"] == "FortiSASE"
        assert created["secret"] == "boa-262"
        assert len(created["milestones"]) == 2
        assert created["milestones"][0]["expected"] != created["milestones"][1]["expected"]

        list_response = client.get("/api/releases")
        assert list_response.status_code == 200
        assert len(list_response.json()) == 1

        export_response = client.get(f"/api/releases/{created['id']}/export")
        assert export_response.status_code == 200
        assert "product: FortiSASE" in export_response.text
        assert "acked_at" not in export_response.text


def test_release_basics_can_be_edited(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()

        updated = client.put(
            f"/api/releases/{created['id']}",
            json={"product": "FortiSASE", "version": "26.3", "secret": "boa-263"},
        )
        assert updated.status_code == 200
        body = updated.json()
        assert body["product"] == "FortiSASE"
        assert body["version"] == "26.3"
        assert body["secret"] == "boa-263"
        assert [item["name"] for item in body["milestones"]] == ["Kickoff", "GA Release"]

        fetched = client.get(f"/api/releases/{created['id']}")
        assert fetched.status_code == 200
        assert fetched.json()["secret"] == "boa-263"

        exported = client.get(f"/api/releases/{created['id']}/export")
        assert exported.status_code == 200
        assert "version: '26.3'" in exported.text
        assert "secret: boa-263" in exported.text


def test_duplicate_product_version_is_rejected(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    payload = {"product": "FortiSASE", "version": "26.2", "secret": "boa-262"}
    with TestClient(app) as client:
        first = client.post("/api/releases", json=payload)
        second = client.post("/api/releases", json=payload)

        assert first.status_code == 201
        assert second.status_code == 409
        assert second.json()["detail"] == "FortiSASE 26.2 already exists."


def test_timeline_endpoint_includes_ack_and_bug_wave_data(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        kickoff_id = created["milestones"][0]["id"]
        release_id = created["id"]
        client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": 37},
        )
        client.post(f"/api/milestones/{kickoff_id}/ack", json={"secret": "boa-262", "ack_name": "qa"})

        timeline = client.get("/api/timeline")
        assert timeline.status_code == 200
        payload = timeline.json()
        assert len(payload) == 1
        assert payload[0]["milestones"][0]["acked_at"] is not None
        assert payload[0]["milestones"][0]["ack_name"] == "qa"
        assert payload[0]["milestones"][0]["ack_note"] is None
        assert payload[0]["bug_snapshots"][0]["open_bug_count"] == 37
        assert payload[0]["bug_snapshots"][0]["signal_type"] == "total"
        assert payload[0]["bug_snapshots"][0]["quality"] == "normal"
        assert datetime.fromisoformat(payload[0]["bug_snapshots"][0]["observed_at"]).tzinfo is not None
        assert payload[0]["starlight"] is None
        assert payload[0]["starlight_trail"] == []


def test_timeline_endpoint_filters_by_galaxy_slug(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        )
        client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.3", "secret": "boa-263"},
        )
        client.post(
            "/api/releases",
            json={"product": "Lighthouse OS", "version": "5.7", "secret": "light-57"},
        )

        filtered = client.get("/api/timeline", params={"galaxy": "fortisase"})
        normalized = client.get("/api/timeline", params={"galaxy": "lighthouse-os"})
        missing = client.get("/api/timeline", params={"galaxy": "unknown-galaxy"})

        assert filtered.status_code == 200
        assert [item["version"] for item in filtered.json()] == ["26.2", "26.3"]
        assert all(item["product"] == "FortiSASE" for item in filtered.json())

        assert normalized.status_code == 200
        assert len(normalized.json()) == 1
        assert normalized.json()[0]["product"] == "Lighthouse OS"

        assert missing.status_code == 200
        assert missing.json() == []


def test_starlight_updates_create_meaningful_trail_events_only_on_readiness_change(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        release_id = created["id"]

        first = client.post(
            f"/api/releases/{release_id}/starlight",
            json={
                "observed_on": "2026-06-05",
                "starlight": 20,
                "whisper": "Kickoff completed",
                "detail": {"type": "markdown", "content": "## Completed\n\n- Kickoff completed"},
                "metrics": {"done": 4, "total": 18, "blocked": 1},
            },
        )
        second = client.post(
            f"/api/releases/{release_id}/starlight",
            json={
                "observed_on": "2026-06-06",
                "starlight": 20,
                "whisper": "Documentation updated",
                "detail": {"type": "markdown", "content": "Documentation updated."},
                "metrics": {"done": 4, "total": 18, "blocked": 1},
            },
        )
        third = client.post(
            f"/api/releases/{release_id}/starlight",
            json={
                "observed_on": "2026-06-07",
                "starlight": 35,
                "whisper": "Core implementation completed",
                "detail": {"type": "markdown", "content": "## Completed\n\n- Core implementation completed"},
                "metrics": {"done": 9, "total": 18, "blocked": 2},
            },
        )

        assert first.status_code == 201
        assert second.status_code == 201
        assert third.status_code == 201

        body = third.json()
        assert body["starlight"] == 35
        assert body["whisper"] == "Core implementation completed"
        assert body["detail"]["type"] == "markdown"
        assert "Core implementation completed" in body["detail"]["content"]
        assert body["metrics"] == {"done": 9, "total": 18, "blocked": 2}
        assert [event["starlight"] for event in body["trail"]] == [20, 35]
        assert body["trail"][0]["whisper"] == "Kickoff completed"
        assert body["trail"][1]["whisper"] == "Core implementation completed"

        timeline = client.get("/api/timeline")
        assert timeline.status_code == 200
        payload = timeline.json()[0]
        assert payload["starlight"]["starlight"] == 35
        assert payload["starlight"]["whisper"] == "Core implementation completed"
        assert [event["starlight"] for event in payload["starlight_trail"]] == [20, 35]


def test_observation_workspace_returns_empty_current_before_first_starlight(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "LighthouseOS", "version": "5.7", "secret": "light-57"},
        ).json()

        response = client.get(f"/api/releases/{created['id']}/observation")

        assert response.status_code == 200
        assert response.json() == {
            "release_id": created["id"],
            "product": "LighthouseOS",
            "version": "5.7",
            "current": None,
            "trail": [],
        }


def test_observation_workspace_updates_current_state_without_duplicate_trail_events(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "NimbusCore", "version": "9.4", "secret": "nimbus-94"},
        ).json()
        release_id = created["id"]

        first = client.put(
            f"/api/releases/{release_id}/observation",
            json={
                "observed_on": "2026-06-18",
                "starlight": 52,
                "whisper": "Regression path stabilized.",
                "detail": {"type": "markdown", "content": "## Completed\n\n- Regression path stabilized"},
                "metrics": {"done": 14, "total": 18, "blocked": 2},
            },
        )
        second = client.put(
            f"/api/releases/{release_id}/observation",
            json={
                "observed_on": "2026-06-19",
                "starlight": 52,
                "whisper": "Support notes are nearly ready.",
                "detail": {"type": "markdown", "content": "Support notes are nearly ready."},
                "metrics": {"done": 15, "total": 18, "blocked": 1},
            },
        )

        assert first.status_code == 200
        assert second.status_code == 200
        body = second.json()
        assert body["current"]["starlight"] == 52
        assert body["current"]["whisper"] == "Support notes are nearly ready."
        assert body["current"]["metrics"] == {"done": 15, "total": 18, "blocked": 1}
        assert [event["starlight"] for event in body["trail"]] == [52]
        assert body["trail"][0]["whisper"] == "Regression path stabilized."


def test_config_exposes_journey_fold_days(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("BOA_JOURNEY_FOLD_DAYS", "21")
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        response = client.get("/api/config")

        assert response.status_code == 200
        assert response.json()["journey_fold_days"] == 21
        assert response.json()["stale_kickoff_days"] == 21


def test_bug_snapshot_date_is_server_observed(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()

        response = client.post(
            f"/api/releases/{created['id']}/bug-snapshots",
            json={"date": date.today().isoformat(), "open_bug_count": 12},
        )

        assert response.status_code == 422

        snapshots = client.get(f"/api/releases/{created['id']}/bug-snapshots")
        assert snapshots.status_code == 200
        assert snapshots.json() == []


def test_ack_requires_matching_secret(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        denied = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "wrong", "ack_name": "qa"})
        assert denied.status_code == 403

        accepted = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262", "ack_name": "qa"})
        assert accepted.status_code == 200
        body = accepted.json()
        assert body["acked"] is True
        assert "acked_at" in body
        assert body["ack_name"] == "qa"
        assert body["note"] is None


def test_milestone_can_receive_multiple_marks(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        first = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "ack_name": "gui", "note": {"content": "first acknowledgement"}},
        )
        assert first.status_code == 200
        first_body = first.json()
        assert first_body["ack_name"] == "gui"
        assert first_body["note"] == {"content": "first acknowledgement"}

        second = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "ack_name": "qa", "note": {"content": "updated note"}},
        )
        assert second.status_code == 200
        second_body = second.json()
        assert second_body["ack_name"] == "qa"
        assert second_body["note"] == {"content": "updated note"}

        timeline = client.get("/api/timeline")
        milestone = timeline.json()[0]["milestones"][0]
        assert milestone["acked_at"] == second_body["acked_at"]
        assert milestone["ack_name"] == "qa"
        assert milestone["ack_note"] == {"content": "updated note"}
        assert [item["ack_name"] for item in milestone["ack_trail"]] == ["qa", "gui"]


def test_milestone_note_persists_in_release_and_timeline(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        updated = client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "Kickoff",
                "expected": created["milestones"][0]["expected"],
                "owner": "pm",
                "note": {"content": "## Context\n\n- Scope aligned\n- Team ready"},
            },
        )

        assert updated.status_code == 200
        assert updated.json()["note"] == {"content": "## Context\n\n- Scope aligned\n- Team ready"}

        timeline = client.get("/api/timeline")
        milestone = timeline.json()[0]["milestones"][0]
        assert milestone["note"] == {"content": "## Context\n\n- Scope aligned\n- Team ready"}


def test_import_with_timeline_shift_and_bug_snapshots(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
  - name: GA Release
    expected: 2026-03-30
    owner: manager
"""

    with TestClient(app) as client:
        imported = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
            data={"shift_timeline": "true", "new_kickoff_date": "2026-02-01"},
        )
        assert imported.status_code == 201
        release = imported.json()
        assert release["milestones"][0]["expected"] == "2026-02-01"
        assert release["milestones"][1]["expected"] == "2026-04-30"

        snapshot = client.post(
            f"/api/releases/{release['id']}/bug-snapshots",
            json={"open_bug_count": 37},
        )
        assert snapshot.status_code == 201

        snapshots = client.get(f"/api/releases/{release['id']}/bug-snapshots")
        assert snapshots.status_code == 200
        payload = snapshots.json()
        assert len(payload) == 1
        assert payload[0]["id"] == 1
        assert payload[0]["open_bug_count"] == 37
        assert payload[0]["signal_type"] == "total"
        assert payload[0]["quality"] == "normal"
        assert payload[0]["quality_reason"] is None
        assert datetime.fromisoformat(payload[0]["observed_at"]).tzinfo is not None


def test_bug_snapshot_accepts_explicit_observed_at(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))

    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Lantern Vale", "version": "1.6", "secret": "demo"},
        ).json()

        observed_at = "2026-06-01T12:00:00+00:00"
        snapshot = client.post(
            f"/api/releases/{release['id']}/bug-snapshots",
            json={"open_bug_count": 12, "observed_at": observed_at},
        )

        assert snapshot.status_code == 201
        assert snapshot.json()["observed_at"] == observed_at

        snapshots = client.get(f"/api/releases/{release['id']}/bug-snapshots")
        assert snapshots.status_code == 200
        assert snapshots.json()[0]["observed_at"] == observed_at


def test_import_preview_shifts_without_creating_release(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
  - name: GA Release
    expected: 2026-03-30
    owner: manager
"""

    with TestClient(app) as client:
        preview = client.post(
            "/api/releases/import/preview",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
            data={"shift_timeline": "true", "new_kickoff_date": "2026-02-01"},
        )
        assert preview.status_code == 200
        blueprint = preview.json()
        assert "id" not in blueprint
        assert blueprint["product"] == "FortiSASE"
        assert blueprint["version"] == "26.2"
        assert blueprint["secret"] == "boa-262"
        assert blueprint["milestones"][0]["expected"] == "2026-02-01"
        assert blueprint["milestones"][1]["expected"] == "2026-04-30"

        releases = client.get("/api/releases")
        assert releases.status_code == 200
        assert releases.json() == []


def test_import_keep_original_ignores_shift_fields(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
  - name: GA Release
    expected: 2026-03-30
    owner: manager
"""

    with TestClient(app) as client:
        imported = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
            data={
                "keep_original": "true",
                "shift_timeline": "true",
                "new_kickoff_date": "2026-02-01",
            },
        )
        assert imported.status_code == 201
        release = imported.json()
        assert release["milestones"][0]["expected"] == "2026-01-01"
        assert release["milestones"][1]["expected"] == "2026-03-30"


def test_delete_release_removes_related_rows(tmp_path) -> None:
    db_path = tmp_path / "boa.db"
    app = create_app(BoaStorage(db_path))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        release_id = created["id"]
        milestone_id = created["milestones"][0]["id"]
        snapshot = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": 37},
        )
        assert snapshot.status_code == 201

        ack = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262", "ack_name": "qa"})
        assert ack.status_code == 200

        deleted = client.delete(f"/api/releases/{release_id}")
        assert deleted.status_code == 204

        missing = client.get(f"/api/releases/{release_id}")
        assert missing.status_code == 404

    with sqlite3.connect(db_path) as connection:
        milestone_count = connection.execute("SELECT COUNT(*) FROM milestones").fetchone()[0]
        ack_count = connection.execute("SELECT COUNT(*) FROM milestone_ack").fetchone()[0]
        snapshot_count = connection.execute("SELECT COUNT(*) FROM bug_snapshot").fetchone()[0]

    assert milestone_count == 0
    assert ack_count == 0
    assert snapshot_count == 0


def test_notifications_run_and_expose_pending_state_until_ack(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-06-10
    owner: pm
"""

    with TestClient(app) as client:
        imported = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
            data={"keep_original": "true"},
        )
        assert imported.status_code == 201
        release = imported.json()
        release_id = release["id"]
        milestone_id = release["milestones"][0]["id"]

        t7_run = client.post("/api/notifications/run", json={"as_of": "2026-06-03"})
        assert t7_run.status_code == 200
        assert [item["type"] for item in t7_run.json()] == ["t-7"]

        release_state = client.get(f"/api/releases/{release_id}/notifications", params={"as_of": "2026-06-03"})
        assert release_state.status_code == 200
        state_body = release_state.json()
        assert state_body[0]["pending_types"] == []
        assert [item["type"] for item in state_body[0]["notifications"]] == ["t-7"]

        milestone_state = client.get(
            f"/api/milestones/{milestone_id}/notifications",
            params={"as_of": "2026-06-07"},
        )
        assert milestone_state.status_code == 200
        assert milestone_state.json()["pending_types"] == ["t-3"]

        t3_run = client.post("/api/notifications/run", json={"as_of": "2026-06-07"})
        assert t3_run.status_code == 200
        assert [item["type"] for item in t3_run.json()] == ["t-3"]

        t1_run = client.post("/api/notifications/run", json={"as_of": "2026-06-09"})
        assert t1_run.status_code == 200
        assert [item["type"] for item in t1_run.json()] == ["t-1"]

        daily_run = client.post("/api/notifications/run", json={"as_of": "2026-06-10"})
        assert daily_run.status_code == 200
        assert [item["type"] for item in daily_run.json()] == ["daily"]

        duplicate_daily = client.post("/api/notifications/run", json={"as_of": "2026-06-10"})
        assert duplicate_daily.status_code == 200
        assert duplicate_daily.json() == []

        ack = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262", "ack_name": "qa"})
        assert ack.status_code == 200

        after_ack = client.post("/api/notifications/run", json={"as_of": "2026-06-11"})
        assert after_ack.status_code == 200
        assert after_ack.json() == []

        final_state = client.get(
            f"/api/milestones/{milestone_id}/notifications",
            params={"as_of": "2026-06-11"},
        )
        assert final_state.status_code == 200
        assert final_state.json()["pending_types"] == []


def test_storage_notification_generation_is_durable(tmp_path) -> None:
    storage = BoaStorage(tmp_path / "boa.db")
    storage.initialize()
    release = storage.create_release(
        ReleaseBlueprint(
            product="FortiSASE",
            version="26.2",
            secret="boa-262",
            milestones=(
                Milestone(
                    name="Kickoff",
                    expected=date(2026, 6, 10),
                    owner="pm",
                ),
            ),
        )
    )

    generated = storage.generate_due_notifications(
        as_of=date(2026, 6, 3),
        sent_at=datetime(2026, 6, 3, 16, 0, tzinfo=timezone.utc),
    )
    assert [item.type for item in generated] == ["t-7"]
    stored = storage.list_notifications(release_id=release.id)
    assert [item.type for item in stored] == ["t-7"]
    assert stored[0].sent_at == datetime(2026, 6, 3, 16, 0, tzinfo=timezone.utc)


def test_plugin_registry_and_runner_ingest_bug_snapshots(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        plugins = client.get("/api/plugins")
        assert plugins.status_code == 200
        assert plugins.json() == [
            {
                "name": "manual_bug_snapshot",
                "version": "1.0.0",
                "capabilities": ["bug_snapshot_ingest"],
                "endpoint": "/api/plugins/manual_bug_snapshot/releases/{release_id}/bug-snapshots",
            }
        ]

        release = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        ingested = client.post(
            f"/api/plugins/manual_bug_snapshot/releases/{release['id']}/bug-snapshots",
            json={"open_bug_count": 21},
        )
        assert ingested.status_code == 201
        assert ingested.json()["open_bug_count"] == 21
        assert ingested.json()["signal_type"] == "total"

        snapshots = client.get(f"/api/releases/{release['id']}/bug-snapshots")
        assert snapshots.status_code == 200
        payload = snapshots.json()
        assert len(payload) == 1
        assert payload[0]["open_bug_count"] == 21
        assert datetime.fromisoformat(payload[0]["observed_at"]).tzinfo is not None

        missing_plugin = client.post(
            f"/api/plugins/unknown/releases/{release['id']}/bug-snapshots",
            json={"open_bug_count": 22},
        )
        assert missing_plugin.status_code == 404


def test_complete_journey_create_milestone_reminder_ack_timeline(tmp_path: Path, monkeypatch) -> None:
    """End-to-end product acceptance test for the Boa 2.0 journey."""
    from datetime import date, timedelta
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        # 1. Create a journey
        release = client.post(
            "/api/releases",
            json={"product": "Nova-3281", "version": "1.0", "secret": "nova-10"},
        ).json()

        # 2. Edit a milestone to be due soon with an owner email
        milestones = release["milestones"]
        milestone_id = milestones[0]["id"]
        due_soon = (date.today() + timedelta(days=2)).isoformat()
        client.put(
            f"/api/milestones/{milestone_id}",
            json={
                "name": "First Light",
                "expected": due_soon,
                "owner": "stargazer",
                "email": "stargazer@example.com",
                "note": None,
            },
        )

        # 3. No observations yet
        observation = client.get(f"/api/releases/{release['id']}/observation")
        assert observation.status_code == 200

        # 4. Record an observation
        obs_put = client.put(
            f"/api/releases/{release['id']}/observation",
            json={
                "starlight": 72,
                "whisper": "Advancing",
                "detail": {"type": "markdown", "content": "The sky is clearing."},
                "metrics": {"done": 8, "total": 12, "blocked": 2},
                "observed_on": date.today().isoformat(),
            },
        )
        assert obs_put.status_code == 200

        # 5. Before running reminders, the t-3 reminder is pending
        t_minus_day = (date.today() + timedelta(days=2) - timedelta(days=3)).isoformat()
        pending_before = client.get(f"/api/releases/{release['id']}/notifications", params={"as_of": t_minus_day})
        states_before = pending_before.json()
        assert any("t-3" in state["pending_types"] for state in states_before if state["pending_types"])

        # 6. Run reminders logs the t-3 notification
        run = client.post("/api/notifications/run", json={"as_of": t_minus_day})
        assert run.status_code == 200
        logged_types = [n["type"] for n in run.json()]
        assert "t-3" in logged_types

        # 7. After logging, the pending type disappears
        pending_after = client.get(f"/api/releases/{release['id']}/notifications", params={"as_of": t_minus_day})
        states_after = pending_after.json()
        target_state = next((s for s in states_after if s["milestone_id"] == milestone_id), None)
        assert target_state is not None
        assert "t-3" not in target_state["pending_types"]

        # 8. Ack via authenticated direct path also sends confirmation when SMTP is ready
        monkeypatch.setenv("BOA_SMTP_ENABLED", "true")
        monkeypatch.setenv("BOA_SMTP_HOST", "smtp.example.com")
        monkeypatch.setenv("BOA_SMTP_PORT", "587")
        monkeypatch.setenv("BOA_SMTP_FROM", "boa@example.com")
        ack = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "nova-10", "ack_name": "Stargazer", "note": None},
        )
        assert ack.status_code == 200
        assert ack.json()["acked"]

        # 9. Milestone now has no pending reminders
        notifications_after = client.get(f"/api/releases/{release['id']}/notifications")
        states_after = notifications_after.json()
        target = next((s for s in states_after if s["milestone_id"] == milestone_id), None)
        assert target is not None
        assert target["pending_types"] == []

        # 10. Timeline reflects acknowledgement
        timeline = client.get("/api/timeline")
        assert timeline.status_code == 200
        item = next((t for t in timeline.json() if t["id"] == release["id"]), None)
        assert item is not None
        acked = next((m for m in item["milestones"] if m["id"] == milestone_id), None)
        assert acked["acked_at"] is not None
        assert acked["ack_name"] == "Stargazer"


def test_health_and_config_endpoints(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["status"] == "ok"

        config = client.get("/api/config")
        assert config.status_code == 200
        assert "journey_fold_days" in config.json()


def test_static_files_and_ack_page_serve_ui(tmp_path: Path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        css = client.get("/static/app.css?v=starlight-40")
        assert css.status_code == 200
        assert "app-dialogs.css" in css.text

        ack = client.get("/ack/test-token")
        assert ack.status_code == 200
        assert "Acknowledge" in ack.text
