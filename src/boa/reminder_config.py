"""Configurable reminder schedule for Boa 1.8 Reminder Engine."""

from __future__ import annotations

import os


DEFAULT_REMINDER_DAYS_BEFORE = (7, 3, 1)


def reminder_t_minus_days() -> tuple[tuple[int, str], ...]:
    """Return reminder types as (days_before, type_name) tuples.

    Configured via ``BOA_REMINDER_DAYS_BEFORE`` as a comma-separated list.
    Defaults to 7, 3, 1 days before the milestone.
    """
    raw = os.environ.get("BOA_REMINDER_DAYS_BEFORE", "")
    if not raw:
        return tuple((days, f"t-{days}") for days in DEFAULT_REMINDER_DAYS_BEFORE)

    parsed: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            value = int(part)
        except ValueError:
            continue
        if value > 0 and value not in parsed:
            parsed.append(value)

    if not parsed:
        return tuple((days, f"t-{days}") for days in DEFAULT_REMINDER_DAYS_BEFORE)

    return tuple((days, f"t-{days}") for days in sorted(parsed, reverse=True))
