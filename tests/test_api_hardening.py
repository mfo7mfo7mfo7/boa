from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient

from boa.api import create_app
from boa.storage import BoaStorage


def make_client(tmp_path, *, raise_server_exceptions: bool = True) -> TestClient:
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    return TestClient(app, raise_server_exceptions=raise_server_exceptions)


def create_release(
    client: TestClient,
    *,
    product: str = "FortiSASE",
    version: str = "26.2",
    secret: str = "boa-262",
) -> dict:
    response = client.post(
        "/api/releases",
        json={"product": product, "version": version, "secret": secret},
    )
    assert response.status_code == 201
    return response.json()


def test_release_identity_fields_reject_blank_and_overlong_values(tmp_path) -> None:
    payloads = [
        {"product": "", "version": "26.2", "secret": "boa-262"},
        {"product": "   ", "version": "26.2", "secret": "boa-262"},
        {"product": "FortiSASE", "version": "", "secret": "boa-262"},
        {"product": "FortiSASE", "version": "26.2", "secret": ""},
        {"product": "F" * 10_000, "version": "26.2", "secret": "boa-262"},
        {"product": "FortiSASE", "version": "2" * 10_000, "secret": "boa-262"},
        {"product": "FortiSASE", "version": "26.2", "secret": "s" * 10_000},
    ]

    with make_client(tmp_path) as client:
        responses = [client.post("/api/releases", json=payload) for payload in payloads]

    assert [response.status_code for response in responses] == [422] * len(payloads)


def test_release_create_rejects_malformed_json_missing_fields_and_extra_fields(tmp_path) -> None:
    with make_client(tmp_path) as client:
        malformed = client.post(
            "/api/releases",
            content='{"product": "FortiSASE",',
            headers={"content-type": "application/json"},
        )
        missing = client.post(
            "/api/releases",
            json={"product": "FortiSASE", "version": "26.2"},
        )
        extra = client.post(
            "/api/releases",
            json={
                "product": "FortiSASE",
                "version": "26.2",
                "secret": "boa-262",
                "admin": True,
            },
        )

    assert malformed.status_code == 422
    assert missing.status_code == 422
    assert extra.status_code == 422


def test_release_update_rejects_duplicate_product_version_without_mutating_record(tmp_path) -> None:
    with make_client(tmp_path) as client:
        create_release(client, product="FortiSASE", version="26.2")
        second = create_release(client, product="FortiSASE", version="26.3")

        duplicate = client.put(
            f"/api/releases/{second['id']}",
            json={"product": "FortiSASE", "version": "26.2", "secret": "boa-263"},
        )
        fetched = client.get(f"/api/releases/{second['id']}")

    assert duplicate.status_code == 409
    assert fetched.status_code == 200
    assert fetched.json()["version"] == "26.3"


def test_release_special_characters_are_parameterized_not_executed(tmp_path) -> None:
    product = "FortiSASE'; DROP TABLE releases; --"
    version = "26.2<beta>&\"quoted\""
    secret = "s3cr3t`$;{}[]"

    with make_client(tmp_path) as client:
        created = create_release(client, product=product, version=version, secret=secret)
        normal = create_release(client, product="FortiGate", version="7.4", secret="fg-74")
        listed = client.get("/api/releases")

    assert created["product"] == product
    assert created["version"] == version
    assert created["secret"] == secret
    assert normal["id"] == created["id"] + 1
    assert listed.status_code == 200
    assert [item["product"] for item in listed.json()] == [product, "FortiGate"]


def test_galaxy_filter_normalizes_case_spaces_and_symbols(tmp_path) -> None:
    with make_client(tmp_path) as client:
        create_release(client, product="Forti SASE++", version="26.2")
        create_release(client, product="forti_sase", version="26.3", secret="boa-263")
        create_release(client, product="Elsewhere", version="1.0", secret="else-10")

        filtered = client.get("/api/timeline", params={"galaxy": "FoRTi---SaSe"})

    assert filtered.status_code == 200
    assert [item["version"] for item in filtered.json()] == ["26.2", "26.3"]


def test_galaxy_route_does_not_shadow_static_assets(tmp_path) -> None:
    with make_client(tmp_path) as client:
        response = client.get("/static/app.css")

    assert response.status_code == 200
    assert "app-core.css" in response.text


def test_integer_path_parameters_reject_non_integer_values(tmp_path) -> None:
    cases = [
        ("get", "/api/releases/not-an-int", None),
        ("put", "/api/releases/not-an-int", {"product": "x", "version": "1", "secret": "s"}),
        ("delete", "/api/releases/not-an-int", None),
        ("post", "/api/releases/not-an-int/milestones", {"name": "x", "expected": "2026-01-01", "owner": "pm"}),
        ("get", "/api/releases/not-an-int/bug-snapshots", None),
        ("post", "/api/releases/not-an-int/bug-snapshots", {"open_bug_count": 0}),
        ("get", "/api/releases/not-an-int/starlight", None),
        ("post", "/api/releases/not-an-int/starlight", {"starlight": 12, "whisper": "x", "detail": {"type": "markdown", "content": "x"}, "metrics": {"done": 1, "total": 2, "blocked": 0}}),
        ("get", "/api/releases/not-an-int/observation", None),
        ("put", "/api/releases/not-an-int/observation", {"starlight": 12, "whisper": "x", "detail": {"type": "markdown", "content": "x"}, "metrics": {"done": 1, "total": 2, "blocked": 0}}),
        ("get", "/api/releases/not-an-int/notifications", None),
        ("get", "/api/milestones/not-an-int/notifications", None),
        ("post", "/api/milestones/not-an-int/ack", {"secret": "s"}),
    ]

    with make_client(tmp_path) as client:
        responses = [
            getattr(client, method)(path, json=json_body) if json_body else getattr(client, method)(path)
            for method, path, json_body in cases
        ]

    assert [response.status_code for response in responses] == [422] * len(cases)


def test_missing_release_and_milestone_resources_return_404(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release_get = client.get("/api/releases/999999")
        release_delete = client.delete("/api/releases/999999")
        starlight_get = client.get("/api/releases/999999/starlight")
        starlight_post = client.post(
            "/api/releases/999999/starlight",
            json={"starlight": 12, "whisper": "Gathering signal", "detail": {"type": "markdown", "content": "Gathering signal"}, "metrics": {"done": 1, "total": 4, "blocked": 0}},
        )
        observation_get = client.get("/api/releases/999999/observation")
        observation_put = client.put(
            "/api/releases/999999/observation",
            json={"starlight": 12, "whisper": "Gathering signal", "detail": {"type": "markdown", "content": "Gathering signal"}, "metrics": {"done": 1, "total": 4, "blocked": 0}},
        )
        milestone_update = client.put(
            "/api/milestones/999999",
            json={"name": "QA", "expected": "2026-01-01", "owner": "qa"},
        )
        milestone_delete = client.delete("/api/milestones/999999")
        milestone_ack = client.post("/api/milestones/999999/ack", json={"secret": "boa-262", "ack_name": "qa"})

    assert release_get.status_code == 404
    assert release_delete.status_code == 404
    assert starlight_get.status_code == 404
    assert starlight_post.status_code == 404
    assert observation_get.status_code == 404
    assert observation_put.status_code == 404
    assert milestone_update.status_code == 404
    assert milestone_delete.status_code == 404
    assert milestone_ack.status_code == 404


def test_milestone_accepts_date_boundaries_and_rejects_invalid_dates(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        early = client.post(
            f"/api/releases/{release['id']}/milestones",
            json={"name": "Earliest", "expected": "0001-01-01", "owner": "pm"},
        )
        late = client.post(
            f"/api/releases/{release['id']}/milestones",
            json={"name": "Latest", "expected": "9999-12-31", "owner": "pm"},
        )
        invalid = client.post(
            f"/api/releases/{release['id']}/milestones",
            json={"name": "Invalid", "expected": "2026-02-30", "owner": "pm"},
        )

    assert early.status_code == 201
    assert early.json()["expected"] == "0001-01-01"
    assert late.status_code == 201
    assert late.json()["expected"] == "9999-12-31"
    assert invalid.status_code == 422


def test_milestone_fields_reject_blank_and_overlong_values(tmp_path) -> None:
    payloads = [
        {"name": "", "expected": "2026-01-01", "owner": "pm"},
        {"name": "QA", "expected": "2026-01-01", "owner": ""},
        {"name": "N" * 10_000, "expected": "2026-01-01", "owner": "pm"},
        {"name": "QA", "expected": "2026-01-01", "owner": "O" * 10_000},
    ]

    with make_client(tmp_path) as client:
        release = create_release(client)
        responses = [
            client.post(f"/api/releases/{release['id']}/milestones", json=payload)
            for payload in payloads
        ]

    assert [response.status_code for response in responses] == [422] * len(payloads)


def test_failed_ack_does_not_create_ack_state_or_persist_note(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client, secret="correct-secret")
        milestone_id = release["milestones"][0]["id"]

        denied = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "wrong-secret", "ack_name": "gui", "note": {"content": "<script>alert(1)</script>"}},
        )
        state = client.get(
            f"/api/milestones/{milestone_id}/notifications",
            params={"as_of": date.today().isoformat()},
        )
        timeline = client.get("/api/timeline")

    assert denied.status_code == 403
    assert state.status_code == 200
    assert state.json()["acked_at"] is None
    assert timeline.json()[0]["milestones"][0]["ack_note"] is None


def test_ack_trims_note(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        milestone_id = release["milestones"][0]["id"]

        response = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "ack_name": "gui", "note": {"content": " ok "}},
        )

    assert response.status_code == 200
    assert response.json()["note"] == {"content": "ok"}


def test_starlight_rejects_invalid_ranges_and_unexpected_fields(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        bad_range = client.post(
            f"/api/releases/{release['id']}/starlight",
            json={"starlight": 120, "whisper": "too bright", "detail": {"type": "markdown", "content": "too bright"}, "metrics": {"done": 1, "total": 2, "blocked": 0}},
        )
        bad_totals = client.post(
            f"/api/releases/{release['id']}/starlight",
            json={"starlight": 30, "whisper": "bad math", "detail": {"type": "markdown", "content": "bad math"}, "metrics": {"done": 3, "total": 2, "blocked": 0}},
        )
        bad_type = client.post(
            f"/api/releases/{release['id']}/starlight",
            json={"starlight": 30, "whisper": "wrong type", "detail": {"type": "html", "content": "<b>no</b>"}},
        )
        too_long = client.post(
            f"/api/releases/{release['id']}/starlight",
            json={"starlight": 30, "whisper": "too long", "detail": {"type": "markdown", "content": "x" * (20 * 1024 + 1)}},
        )
        extra = client.post(
            f"/api/releases/{release['id']}/starlight",
            json={
                "starlight": 30,
                "whisper": "extra field",
                "detail": {"type": "markdown", "content": "extra field"},
                "metrics": {"done": 1, "total": 2, "blocked": 0},
                "history": True,
            },
        )

    assert bad_range.status_code == 422
    assert bad_totals.status_code == 422
    assert bad_type.status_code == 422
    assert too_long.status_code == 422
    assert extra.status_code == 422


def test_ack_rejects_unexpected_fields(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        milestone_id = release["milestones"][0]["id"]

        extra = client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "boa-262", "ack_name": "gui", "note": {"content": " ok "}, "role": "admin"},
        )

    assert extra.status_code == 422


def test_yaml_import_preview_rejects_bad_utf8_missing_file_and_does_not_persist(tmp_path) -> None:
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
"""
    with make_client(tmp_path) as client:
        bad_utf8 = client.post(
            "/api/releases/import/preview",
            files={"file": ("release.yaml", b"\xff\xfe", "text/yaml")},
        )
        missing_file = client.post("/api/releases/import/preview")
        preview = client.post(
            "/api/releases/import/preview",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
        )
        releases = client.get("/api/releases")

    assert bad_utf8.status_code == 400
    assert missing_file.status_code == 422
    assert preview.status_code == 200
    assert releases.status_code == 200
    assert releases.json() == []


def test_yaml_import_rejects_unsafe_tags_with_client_error(tmp_path) -> None:
    unsafe_yaml = """
!!python/object/apply:os.system
- echo unsafe
"""
    with make_client(tmp_path, raise_server_exceptions=False) as client:
        response = client.post(
            "/api/releases/import",
            files={"file": ("unsafe.yaml", unsafe_yaml, "text/yaml")},
        )

    assert response.status_code == 400


def test_yaml_import_duplicate_product_version_is_conflict_and_preview_stays_non_mutating(tmp_path) -> None:
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
"""
    with make_client(tmp_path) as client:
        imported = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
        )
        duplicate = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
        )
        preview = client.post(
            "/api/releases/import/preview",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
        )
        releases = client.get("/api/releases")

    assert imported.status_code == 201
    assert duplicate.status_code == 409
    assert preview.status_code == 200
    assert len(releases.json()) == 1


def test_bug_snapshot_rejects_bad_payloads_and_accepts_frequent_observations(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        release_id = release["id"]

        negative = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": -1},
        )
        non_integer = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": "many"},
        )
        client_date = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"date": "2026-01-01", "open_bug_count": 7},
        )
        bad_signal_type = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"signal_type": "total;drop", "open_bug_count": 7},
        )
        first = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": 7},
        )
        second = client.post(
            f"/api/releases/{release_id}/bug-snapshots",
            json={"signal_type": "total", "open_bug_count": 8},
        )
        snapshots = client.get(f"/api/releases/{release_id}/bug-snapshots")

    assert negative.status_code == 422
    assert non_integer.status_code == 422
    assert client_date.status_code == 422
    assert bad_signal_type.status_code == 422
    assert first.status_code == 201
    assert second.status_code == 201
    payload = snapshots.json()
    assert [snapshot["open_bug_count"] for snapshot in payload] == [7, 8]
    assert [snapshot["signal_type"] for snapshot in payload] == ["total", "total"]
    assert [snapshot["quality"] for snapshot in payload] == ["normal", "normal"]
    assert all(snapshot["observed_at"] for snapshot in payload)


def test_notification_run_rejects_bad_date_and_daily_reminders_are_once_per_day(tmp_path) -> None:
    yaml_text = """
product: FortiSASE
version: 26.2
secret: boa-262
milestones:
  - name: GA
    expected: 2026-08-01
    owner: releng
"""
    with make_client(tmp_path) as client:
        imported = client.post(
            "/api/releases/import",
            files={"file": ("release.yaml", yaml_text, "text/yaml")},
            data={"keep_original": "true"},
        )
        assert imported.status_code == 201
        release = imported.json()
        milestone_id = release["milestones"][0]["id"]

        bad_run = client.post("/api/notifications/run", json={"as_of": "not-a-date"})
        first_daily = client.post("/api/notifications/run", json={"as_of": "2026-08-01"})
        duplicate_daily = client.post("/api/notifications/run", json={"as_of": "2026-08-01"})
        next_daily = client.post("/api/notifications/run", json={"as_of": "2026-08-02"})
        state = client.get(
            f"/api/milestones/{milestone_id}/notifications",
            params={"as_of": "2026-08-02"},
        )

    assert bad_run.status_code == 422
    assert [item["type"] for item in first_daily.json()] == ["daily"]
    assert duplicate_daily.json() == []
    assert [item["type"] for item in next_daily.json()] == ["daily"]
    assert [item["type"] for item in state.json()["notifications"]] == ["daily", "daily"]
    assert state.json()["pending_types"] == []


def test_notification_state_rejects_bad_query_date_and_missing_resources(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        release_id = release["id"]
        milestone_id = release["milestones"][0]["id"]

        bad_release_date = client.get(
            f"/api/releases/{release_id}/notifications",
            params={"as_of": "tomorrow"},
        )
        bad_milestone_date = client.get(
            f"/api/milestones/{milestone_id}/notifications",
            params={"as_of": "tomorrow"},
        )
        missing_release = client.get("/api/releases/999999/notifications")
        missing_milestone = client.get("/api/milestones/999999/notifications")

    assert bad_release_date.status_code == 422
    assert bad_milestone_date.status_code == 422
    assert missing_release.status_code == 404
    assert missing_milestone.status_code == 404


def test_plugin_runner_rejects_hostile_plugin_name_and_invalid_snapshot_payload(tmp_path) -> None:
    with make_client(tmp_path) as client:
        release = create_release(client)
        release_id = release["id"]

        hostile_name = client.post(
            f"/api/plugins/manual_bug_snapshot%3Bdrop/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": 1},
        )
        negative_count = client.post(
            f"/api/plugins/manual_bug_snapshot/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": -1},
        )
        valid = client.post(
            f"/api/plugins/manual_bug_snapshot/releases/{release_id}/bug-snapshots",
            json={"open_bug_count": 1},
        )
        snapshots = client.get(f"/api/releases/{release_id}/bug-snapshots")

    assert hostile_name.status_code == 404
    assert negative_count.status_code == 422
    assert valid.status_code == 201
    payload = snapshots.json()
    assert len(payload) == 1
    assert payload[0]["open_bug_count"] == 1
    assert payload[0]["signal_type"] == "total"
    assert payload[0]["quality"] == "normal"
    assert payload[0]["observed_at"]


def test_large_timeline_remains_readable(tmp_path: Path) -> None:
    """A long release with many milestones and observations should still serialize."""
    from datetime import date, timedelta
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Odyssey", "version": "12.0", "secret": "odyssey-12"},
        ).json()
        release_id = release["id"]
        first_milestone_id = release["milestones"][0]["id"]

        # Add 20 milestones spanning two years
        base = date.today()
        for i in range(20):
            client.post(
                f"/api/releases/{release_id}/milestones",
                json={
                    "name": f"Waypoint {i + 1}",
                    "expected": (base + timedelta(days=30 * i)).isoformat(),
                    "owner": "navigator",
                    "email": None,
                    "note": None,
                },
            )

        # Record 50 observations
        for i in range(50):
            client.put(
                f"/api/releases/{release_id}/observation",
                json={
                    "starlight": (i * 2) % 101,
                    "whisper": f"Observation {i + 1}",
                    "detail": {"type": "markdown", "content": f"Note {i + 1}"},
                    "metrics": {"done": i, "total": 50, "blocked": 0},
                    "observed_on": (base - timedelta(days=i)).isoformat(),
                },
            )

        timeline = client.get("/api/timeline")
        assert timeline.status_code == 200
        payload = timeline.json()
        item = next((t for t in payload if t["id"] == release_id), None)
        assert item is not None
        assert len(item["milestones"]) == 22
        assert len(item["starlight_trail"]) >= 50


def test_many_acknowledgements_immutable_history(tmp_path: Path) -> None:
    """Each acknowledgement is recorded; the latest ack wins for display."""
    from datetime import date
    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        release = client.post(
            "/api/releases",
            json={"product": "Archive", "version": "1.0", "secret": "archive-10"},
        ).json()
        milestone_id = release["milestones"][0]["id"]
        due = (date.today()).isoformat()
        client.put(
            f"/api/milestones/{milestone_id}",
            json={"name": "Final", "expected": due, "owner": "a", "email": None, "note": None},
        )
        client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "archive-10", "ack_name": "First Ack", "note": {"content": "initial"}},
        )
        client.post(
            f"/api/milestones/{milestone_id}/ack",
            json={"secret": "archive-10", "ack_name": "Second Ack", "note": {"content": "updated"}},
        )
        timeline = client.get("/api/timeline").json()
        milestone = next(m for m in timeline[0]["milestones"] if m["id"] == milestone_id)
        # Marks form a trail; the latest mark is used for timeline display.
        assert milestone["ack_name"] == "Second Ack"
        assert milestone["ack_note"]["content"] == "updated"
        assert [item["ack_name"] for item in milestone["ack_trail"]] == ["Second Ack", "First Ack"]
