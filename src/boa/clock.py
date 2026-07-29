"""Shared engine-room clock helpers."""

from __future__ import annotations

import os
from datetime import datetime, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def get_engine_time_zone_name() -> str:
    raw = os.environ.get("TZ")
    if raw and raw.strip():
        try:
            ZoneInfo(raw.strip())
        except ZoneInfoNotFoundError:
            return "UTC"
        return raw.strip()
    return "UTC"


def get_engine_time_zone() -> tzinfo:
    raw = os.environ.get("TZ")
    if raw and raw.strip():
        try:
            return ZoneInfo(raw.strip())
        except ZoneInfoNotFoundError:
            pass
    return timezone.utc


def normalize_engine_datetime(value: datetime | None = None) -> datetime:
    tz = get_engine_time_zone()
    current = value or datetime.now(tz)
    if current.tzinfo is None:
        return current.replace(tzinfo=tz).replace(microsecond=0)
    return current.astimezone(tz).replace(microsecond=0)
