from __future__ import annotations

from datetime import date

import pytest

from boa.domain import ReleaseBlueprint
from boa.yaml_io import BlueprintValidationError, dump_release_blueprint, load_release_blueprint


SAMPLE_BLUEPRINT = """
product: FortiSASE
version: 26.2
secret: boa-262

milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm

  - name: Regression Ready
    expected: 2026-02-10
    owner: alice

  - name: GA Release
    expected: 2026-03-30
    owner: manager
"""


def test_load_release_blueprint_parses_expected_shape() -> None:
    blueprint = load_release_blueprint(SAMPLE_BLUEPRINT)

    assert isinstance(blueprint, ReleaseBlueprint)
    assert blueprint.product == "FortiSASE"
    assert blueprint.version == "26.2"
    assert blueprint.secret == "boa-262"
    assert [milestone.name for milestone in blueprint.milestones] == [
        "Kickoff",
        "Regression Ready",
        "GA Release",
    ]
    assert blueprint.kickoff().expected == date(2026, 1, 1)


def test_load_release_blueprint_can_shift_timeline() -> None:
    blueprint = load_release_blueprint(
        SAMPLE_BLUEPRINT,
        shift_timeline=True,
        new_kickoff_date=date(2026, 2, 1),
    )

    assert [milestone.expected for milestone in blueprint.milestones] == [
        date(2026, 2, 1),
        date(2026, 3, 13),
        date(2026, 4, 30),
    ]


def test_dump_release_blueprint_exports_blueprint_only() -> None:
    blueprint = load_release_blueprint(SAMPLE_BLUEPRINT)

    exported = dump_release_blueprint(blueprint)

    assert "product: FortiSASE" in exported
    assert "version: '26.2'" in exported
    assert "secret: boa-262" in exported
    assert "acked_at" not in exported
    assert "open_bug_count" not in exported


def test_load_release_blueprint_requires_mandatory_fields() -> None:
    with pytest.raises(BlueprintValidationError, match="Missing required release fields"):
        load_release_blueprint("product: FortiSASE\nversion: 26.2\nsecret: boa-262\n")


def test_shift_timeline_requires_new_kickoff_date() -> None:
    with pytest.raises(BlueprintValidationError, match="new_kickoff_date is required"):
        load_release_blueprint(SAMPLE_BLUEPRINT, shift_timeline=True)


def test_new_kickoff_date_requires_shift_timeline() -> None:
    with pytest.raises(BlueprintValidationError, match="requires shift_timeline=True"):
        load_release_blueprint(
            SAMPLE_BLUEPRINT,
            new_kickoff_date=date(2026, 2, 1),
        )


def test_dump_and_load_release_blueprint_preserves_email_field() -> None:
    blueprint_text = """
product: FortiSASE
version: 26.2
secret: boa-262

milestones:
  - name: Kickoff
    expected: 2026-01-01
    owner: pm
    email: pm@example.com

  - name: GA Release
    expected: 2026-03-30
    owner: manager
"""
    blueprint = load_release_blueprint(blueprint_text)
    kickoff = blueprint.milestones[0]
    assert kickoff.email == "pm@example.com"

    exported = dump_release_blueprint(blueprint)
    reloaded = load_release_blueprint(exported)
    assert reloaded.milestones[0].email == "pm@example.com"
    assert reloaded.milestones[1].email is None


def test_import_preview_and_create_from_yaml(tmp_path: Path) -> None:
    from fastapi.testclient import TestClient
    from boa.api import create_app
    from boa.storage import BoaStorage

    app = create_app(BoaStorage(tmp_path / "boa.db"))
    with TestClient(app) as client:
        yaml_text = b"""
product: Voyager
version: 3.0
secret: voyager-30
milestones:
  - name: Launch Window
    expected: 2026-08-01
    owner: helm
"""
        preview = client.post(
            "/api/releases/import/preview",
            files={"file": ("voyager.yaml", yaml_text, "text/x-yaml")},
        )
        assert preview.status_code == 200
        assert preview.json()["product"] == "Voyager"

        imported = client.post(
            "/api/releases/import",
            files={"file": ("voyager.yaml", yaml_text, "text/x-yaml")},
        )
        assert imported.status_code == 201
        assert imported.json()["product"] == "Voyager"
        assert any(m["name"] == "Launch Window" for m in imported.json()["milestones"])

        release_id = imported.json()["id"]
        export = client.get(f"/api/releases/{release_id}/export")
        assert export.status_code == 200
        assert "product: Voyager" in export.text
