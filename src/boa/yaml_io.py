"""YAML import and export helpers for Boa release blueprints."""

from __future__ import annotations

from datetime import date
from typing import Any

import yaml

from boa.domain import Milestone, ReadingPostBlueprint, ReleaseBlueprint


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
                **({"email": milestone.email} if milestone.email else {}),
                **({"note": {"content": milestone.note}} if milestone.note else {}),
            }
            for milestone in blueprint.milestones
        ],
    }
    if blueprint.reading_post is not None:
        payload["reading_post"] = _reading_post_to_mapping(blueprint.reading_post)
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
        reading_post=_reading_post_from_mapping(payload.get("reading_post")),
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
        note=_parse_optional_note(payload.get("note")),
        email=_parse_optional_string(payload.get("email"), field="email"),
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


def _parse_optional_note(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise BlueprintValidationError("note must be a mapping with a content field.")
    content = value.get("content", "")
    if not isinstance(content, str):
        raise BlueprintValidationError("note.content must be a string.")
    cleaned = content.strip()
    return cleaned or None


def _parse_optional_string(value: Any, *, field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise BlueprintValidationError(f"{field} must be a string.")
    cleaned = value.strip()
    return cleaned or None


def _reading_post_from_mapping(payload: Any) -> ReadingPostBlueprint | None:
    if payload is None:
        return None
    if not isinstance(payload, dict):
        raise BlueprintValidationError("reading_post must be a mapping.")

    recipients_value = payload.get("recipients", [])
    if not isinstance(recipients_value, list):
        raise BlueprintValidationError("reading_post.recipients must be a list.")
    recipients = tuple(
        _require_non_empty_string(item, field="reading_post.recipients")
        for item in recipients_value
    )

    enabled_value = payload.get("enabled", False)
    if not isinstance(enabled_value, bool):
        raise BlueprintValidationError("reading_post.enabled must be a boolean.")
    enabled = enabled_value
    rhythm = _parse_reading_post_choice(
        payload.get("rhythm", "weekly"),
        field="reading_post.rhythm",
        allowed={"daily", "weekly"},
    )
    schedule = _parse_reading_post_choice(
        payload.get("schedule") or rhythm,
        field="reading_post.schedule",
        allowed={"daily", "weekdays", "milestones", "never", "weekly"},
    )
    send_time = _parse_reading_post_time(payload.get("send_time", "08:00"))
    deliver_until_days = _parse_reading_post_deliver_until_days(payload.get("deliver_until_days", 7))

    return ReadingPostBlueprint(
        enabled=enabled,
        recipients=recipients,
        rhythm=rhythm,
        schedule=schedule,
        send_time=send_time,
        deliver_until_days=deliver_until_days,
    )


def _reading_post_to_mapping(reading_post: ReadingPostBlueprint) -> dict[str, Any]:
    return {
        "enabled": reading_post.enabled,
        "recipients": list(reading_post.recipients),
        "rhythm": reading_post.rhythm,
        "schedule": reading_post.schedule,
        "send_time": reading_post.send_time,
        "deliver_until_days": reading_post.deliver_until_days,
    }


def _parse_reading_post_choice(value: Any, *, field: str, allowed: set[str]) -> str:
    if not isinstance(value, str):
        raise BlueprintValidationError(f"{field} must be a string.")
    cleaned = value.strip().lower()
    if cleaned not in allowed:
        allowed_text = ", ".join(sorted(allowed))
        raise BlueprintValidationError(f"{field} must be one of: {allowed_text}.")
    return cleaned


def _parse_reading_post_time(value: Any) -> str:
    if not isinstance(value, str):
        raise BlueprintValidationError("reading_post.send_time must be a string.")
    cleaned = value.strip()
    parts = cleaned.split(":")
    if len(parts) != 2:
        raise BlueprintValidationError("reading_post.send_time must use HH:MM.")
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError as exc:
        raise BlueprintValidationError("reading_post.send_time must use HH:MM.") from exc
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        raise BlueprintValidationError("reading_post.send_time must be a valid 24-hour time.")
    return f"{hour:02d}:{minute:02d}"


def _parse_reading_post_deliver_until_days(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise BlueprintValidationError("reading_post.deliver_until_days must be an integer.")
    if not 0 <= value <= 365:
        raise BlueprintValidationError("reading_post.deliver_until_days must be between 0 and 365.")
    return value
