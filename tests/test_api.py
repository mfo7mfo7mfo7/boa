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
        client.post(f"/api/milestones/{kickoff_id}/ack", json={"secret": "boa-262"})

        timeline = client.get("/api/timeline")
        assert timeline.status_code == 200
        payload = timeline.json()
        assert len(payload) == 1
        assert payload[0]["milestones"][0]["acked_at"] is not None
        assert payload[0]["milestones"][0]["ack_note"] == ""
        assert payload[0]["bug_snapshots"][0]["open_bug_count"] == 37
        assert payload[0]["bug_snapshots"][0]["signal_type"] == "total"
        assert payload[0]["bug_snapshots"][0]["quality"] == "normal"
        assert datetime.fromisoformat(payload[0]["bug_snapshots"][0]["observed_at"]).tzinfo is not None


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

        denied = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "wrong"})
        assert denied.status_code == 403

        accepted = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262"})
        assert accepted.status_code == 200
        body = accepted.json()
        assert body["acked"] is True
        assert "acked_at" in body
        assert body["note"] == ""


def test_ack_note_can_be_saved_and_edited_without_changing_ack_time(tmp_path) -> None:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        created = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-262"},
        ).json()
        milestone_id = created["milestones"][0]["id"]

        first = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "note": "first acknowledgement"},
        )
        assert first.status_code == 200
        first_body = first.json()
        assert first_body["note"] == "first acknowledgement"

        second = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "note": "updated note"},
        )
        assert second.status_code == 200
        second_body = second.json()
        assert second_body["acked_at"] == first_body["acked_at"]
        assert second_body["note"] == "updated note"

        timeline = client.get("/api/timeline")
        milestone = timeline.json()[0]["milestones"][0]
        assert milestone["acked_at"] == first_body["acked_at"]
        assert milestone["ack_note"] == "updated note"


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

        ack = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262"})
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

        ack = client.post(f"/api/milestones/{milestone_id}/ack", json={"secret": "boa-262"})
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
