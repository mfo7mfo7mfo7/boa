"""YAML import and export helpers for Boa release blueprints."""

from __future__ import annotations

from datetime import date
from typing import Any

import yaml

from boa.domain import Milestone, ReleaseBlueprint


class BlueprintValidationError(ValueError):
    """Raised when a release blueprint does not match the expected schema."""


def load_release_blueprint(
    yaml_text: str,
    *,
    shift_timeline: bool = False,
    new_kickoff_date: date | None = None,
) -> ReleaseBlueprint:
    try:
        payload = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        raise BlueprintValidationError("Release blueprint must be valid YAML.") from exc

    if not isinstance(payload, dict):
        raise BlueprintValidationError("Release blueprint must be a YAML mapping.")

    blueprint = _blueprint_from_mapping(payload)

    if shift_timeline and new_kickoff_date is None:
        raise BlueprintValidationError(
            "new_kickoff_date is required when shift_timeline is enabled."
        )

    if new_kickoff_date is not None and not shift_timeline:
        raise BlueprintValidationError(
            "new_kickoff_date requires shift_timeline=True."
        )

    if shift_timeline and new_kickoff_date is not None:
        return blueprint.shift_to_kickoff(new_kickoff_date)

    return blueprint


def dump_release_blueprint(blueprint: ReleaseBlueprint) -> str:
    payload = {
        "product": blueprint.product,
        "version": blueprint.version,
        "secret": blueprint.secret,
        "milestones": [
            {
                "name": milestone.name,
                "expected": milestone.expected.isoformat(),
                "owner": milestone.owner,
            }
            for milestone in blueprint.milestones
        ],
    }
    return yaml.safe_dump(payload, sort_keys=False)


def _blueprint_from_mapping(payload: dict[str, Any]) -> ReleaseBlueprint:
    required_fields = ("product", "version", "secret", "milestones")
    missing_fields = [field for field in required_fields if field not in payload]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise BlueprintValidationError(f"Missing required release fields: {missing}.")

    milestones_payload = payload["milestones"]
    if not isinstance(milestones_payload, list) or not milestones_payload:
        raise BlueprintValidationError("milestones must be a non-empty list.")

    milestones = tuple(_milestone_from_mapping(item) for item in milestones_payload)

    return ReleaseBlueprint(
        product=_require_non_empty_string(payload["product"], field="product"),
        version=_require_scalar_string(payload["version"], field="version"),
        secret=_require_non_empty_string(payload["secret"], field="secret"),
        milestones=milestones,
    )


def _milestone_from_mapping(payload: Any) -> Milestone:
    if not isinstance(payload, dict):
        raise BlueprintValidationError("Each milestone must be a mapping.")

    required_fields = ("name", "expected", "owner")
    missing_fields = [field for field in required_fields if field not in payload]
    if missing_fields:
        missing = ", ".join(missing_fields)
        raise BlueprintValidationError(f"Missing required milestone fields: {missing}.")

    return Milestone(
        name=_require_non_empty_string(payload["name"], field="name"),
        expected=_parse_date(payload["expected"], field="expected"),
        owner=_require_non_empty_string(payload["owner"], field="owner"),
    )


def _require_non_empty_string(value: Any, *, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise BlueprintValidationError(f"{field} must be a non-empty string.")
    return value.strip()


def _require_scalar_string(value: Any, *, field: str) -> str:
    if isinstance(value, str):
        text = value.strip()
        if text:
            return text
        raise BlueprintValidationError(f"{field} must be a non-empty string.")

    if isinstance(value, (int, float)):
        return str(value)

    raise BlueprintValidationError(f"{field} must be a string or number.")


def _parse_date(value: Any, *, field: str) -> date:
    if isinstance(value, date):
        return value

    if not isinstance(value, str):
        raise BlueprintValidationError(f"{field} must be an ISO date string.")

    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise BlueprintValidationError(f"{field} must be a valid ISO date.") from exc
