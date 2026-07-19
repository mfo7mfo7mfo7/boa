"""Boa Observation Notebook client.

This module is intentionally narrow: it lets an external script submit today's
reading to an existing Boa journey.

It does not create or edit journeys.
It does not acknowledge milestones.
It does not change Engine Room settings.

Basic usage:

    from boa_client import submit_observation

    submit_observation(
        base_url="http://127.0.0.1:8000",
        product="Lantern Vale",
        version="1.6",
        starlight=73,
        summary="The journey is moving with steady light.",
        detail="## Today\n\n- The integration path is quieter",
        open_bug_count=5,
    )

Environment variables:

    BOA_BASE_URL      default base_url
    BOA_PRODUCT       used by the CLI when product is not given
    BOA_VERSION       used by the CLI when version is not given
    BOA_RELEASE_ID    used by the CLI when release_id is not given
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import date
from typing import Any

import requests


DEFAULT_TIMEOUT = 10
DEFAULT_BASE_URL = "http://127.0.0.1:8000"


class BoaError(Exception):
    """Base exception for Boa client errors."""

    def __init__(self, message: str, status_code: int | None = None, response_body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class BoaClientError(BoaError):
    """Client-side error, e.g. missing required fields."""


class BoaHttpError(BoaError):
    """Non-2xx response from Boa."""


@dataclass
class BoaResult:
    """Result of a `submit_observation` call."""

    release_id: int
    observation_requested: bool
    storms_requested: bool
    observation_ok: bool = False
    storms_ok: bool = False
    errors: list[str] | None = None
    observation_response: dict | None = None
    storms_response: dict | None = None

    @property
    def ok(self) -> bool:
        return (
            (not self.observation_requested or self.observation_ok)
            and (not self.storms_requested or self.storms_ok)
            and (self.observation_requested or self.storms_requested)
        )

    @property
    def starlight_ok(self) -> bool:
        """Backward-compatible alias for older examples."""
        return self.observation_ok

    @property
    def bug_wave_ok(self) -> bool:
        """Backward-compatible alias for older examples."""
        return self.storms_ok


def _today() -> str:
    return date.today().isoformat()


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")


def _default_base_url(base_url: str | None) -> str:
    return (base_url or os.environ.get("BOA_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def _request(method: str, url: str, *, timeout: int, **kwargs: Any) -> requests.Response:
    try:
        response = requests.request(method, url, timeout=timeout, **kwargs)
    except requests.RequestException as exc:
        raise BoaHttpError(f"Network error contacting Boa: {exc}") from exc

    if not response.ok:
        body = None
        try:
            body = response.json()
        except Exception:
            body = response.text
        raise BoaHttpError(
            f"Boa returned {response.status_code} for {url}: {body}",
            status_code=response.status_code,
            response_body=body,
        )
    return response


def get_timeline(
    base_url: str | None = None,
    *,
    galaxy: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> list[dict]:
    """Read Boa's visible journeys, optionally scoped to one galaxy."""
    url = f"{_default_base_url(base_url)}/api/timeline"
    params = {"galaxy": _slugify(galaxy)} if galaxy else None
    response = _request("GET", url, params=params, timeout=timeout)
    return response.json()


def find_release(
    base_url: str | None = None,
    *,
    product: str,
    version: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict | None:
    """Find an existing journey by product and version without creating it."""
    releases = get_timeline(base_url, galaxy=product, timeout=timeout)
    for release in releases:
        if release.get("product") == product and release.get("version") == version:
            return release
    return None


def resolve_release_id(
    base_url: str | None = None,
    *,
    release_id: int | None = None,
    product: str | None = None,
    version: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> int:
    """Resolve an existing journey id from either release_id or product/version."""
    if release_id is not None:
        return int(release_id)
    if not product or not version:
        raise BoaClientError("Provide release_id or both product and version")

    release = find_release(base_url, product=product, version=version, timeout=timeout)
    if release is None:
        raise BoaClientError(
            f"Journey not found for product={product!r}, version={version!r}. "
            "Create or import the journey in Boa first, then send observations."
        )
    return int(release["id"])


def get_observation(
    base_url: str | None = None,
    *,
    release_id: int,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict:
    """Read the current Observation Notebook state for a journey."""
    url = f"{_default_base_url(base_url)}/api/releases/{release_id}/observation"
    response = _request("GET", url, timeout=timeout)
    return response.json()


def submit_today_reading(
    base_url: str | None = None,
    *,
    release_id: int,
    starlight: int,
    summary: str,
    detail: str | None = None,
    metrics: dict[str, int] | None = None,
    observed_on: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict:
    """Submit Starlight and notebook text through Boa's Observation API."""
    if not 0 <= starlight <= 100:
        raise BoaClientError("starlight must be between 0 and 100")
    if not summary or not summary.strip():
        raise BoaClientError("summary is required when submitting starlight")

    url = f"{_default_base_url(base_url)}/api/releases/{release_id}/observation"
    payload: dict[str, Any] = {
        "starlight": starlight,
        "whisper": summary.strip(),
        "detail": {"type": "markdown", "content": detail or ""},
        "observed_on": observed_on or _today(),
    }
    if metrics is not None:
        payload["metrics"] = metrics

    response = _request("PUT", url, json=payload, timeout=timeout)
    return response.json()


def submit_current_storms(
    base_url: str | None = None,
    *,
    release_id: int,
    open_bug_count: int,
    signal_type: str = "total",
    observed_at: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> dict:
    """Submit the current known-troubles count for Bug Wave."""
    if open_bug_count < 0:
        raise BoaClientError("open_bug_count must be non-negative")

    url = f"{_default_base_url(base_url)}/api/releases/{release_id}/bug-snapshots"
    payload: dict[str, Any] = {"open_bug_count": open_bug_count, "signal_type": signal_type}
    if observed_at is not None:
        payload["observed_at"] = observed_at
    response = _request("POST", url, json=payload, timeout=timeout)
    return response.json()


def submit_observation(
    base_url: str | None = None,
    *,
    release_id: int | None = None,
    product: str | None = None,
    version: str | None = None,
    starlight: int | None = None,
    summary: str | None = None,
    detail: str | None = None,
    metrics: dict[str, int] | None = None,
    open_bug_count: int | None = None,
    observed_on: str | None = None,
    observed_at: str | None = None,
    timeout: int = DEFAULT_TIMEOUT,
    allow_partial: bool = False,
) -> BoaResult:
    """Submit today's reading and/or current storms for an existing journey.

    `open_bug_count=None` means storms are unknown and no storm snapshot is sent.
    `open_bug_count=0` means zero known troubles and is sent to Boa.
    """
    resolved_release_id = resolve_release_id(
        base_url,
        release_id=release_id,
        product=product,
        version=version,
        timeout=timeout,
    )

    observation_requested = starlight is not None
    storms_requested = open_bug_count is not None
    if not observation_requested and not storms_requested:
        raise BoaClientError("Provide starlight and/or open_bug_count")

    result = BoaResult(
        release_id=resolved_release_id,
        observation_requested=observation_requested,
        storms_requested=storms_requested,
        errors=[],
    )

    if observation_requested:
        try:
            result.observation_response = submit_today_reading(
                base_url,
                release_id=resolved_release_id,
                starlight=starlight,
                summary=summary or "",
                detail=detail,
                metrics=metrics,
                observed_on=observed_on,
                timeout=timeout,
            )
            result.observation_ok = True
        except BoaHttpError as exc:
            if not allow_partial:
                raise
            result.errors.append(f"Observation failed: {exc}")

    if storms_requested:
        try:
            result.storms_response = submit_current_storms(
                base_url,
                release_id=resolved_release_id,
                open_bug_count=open_bug_count,
                observed_at=observed_at,
                timeout=timeout,
            )
            result.storms_ok = True
        except BoaHttpError as exc:
            if not allow_partial:
                raise
            result.errors.append(f"Current Storms failed: {exc}")

    return result


def submit_starlight(*args: Any, **kwargs: Any) -> dict:
    """Compatibility alias for `submit_today_reading`."""
    return submit_today_reading(*args, **kwargs)


def submit_bug_snapshot(*args: Any, **kwargs: Any) -> dict:
    """Compatibility alias for `submit_current_storms`."""
    return submit_current_storms(*args, **kwargs)


class BoaClient:
    """Optional thin wrapper that pins base_url and timeout."""

    def __init__(self, base_url: str | None = None, timeout: int = DEFAULT_TIMEOUT):
        self.base_url = _default_base_url(base_url)
        self.timeout = timeout

    def get_timeline(self, *, galaxy: str | None = None) -> list[dict]:
        return get_timeline(self.base_url, galaxy=galaxy, timeout=self.timeout)

    def find_release(self, *, product: str, version: str) -> dict | None:
        return find_release(self.base_url, product=product, version=version, timeout=self.timeout)

    def resolve_release_id(
        self,
        *,
        release_id: int | None = None,
        product: str | None = None,
        version: str | None = None,
    ) -> int:
        return resolve_release_id(
            self.base_url,
            release_id=release_id,
            product=product,
            version=version,
            timeout=self.timeout,
        )

    def get_observation(self, *, release_id: int) -> dict:
        return get_observation(self.base_url, release_id=release_id, timeout=self.timeout)

    def submit_today_reading(self, *, release_id: int, starlight: int, summary: str, **kwargs: Any) -> dict:
        return submit_today_reading(
            self.base_url,
            release_id=release_id,
            starlight=starlight,
            summary=summary,
            timeout=self.timeout,
            **kwargs,
        )

    def submit_current_storms(self, *, release_id: int, open_bug_count: int, **kwargs: Any) -> dict:
        return submit_current_storms(
            self.base_url,
            release_id=release_id,
            open_bug_count=open_bug_count,
            timeout=self.timeout,
            **kwargs,
        )

    def submit_observation(self, *, allow_partial: bool = False, **kwargs: Any) -> BoaResult:
        return submit_observation(self.base_url, timeout=self.timeout, allow_partial=allow_partial, **kwargs)

    def submit_starlight(self, *, release_id: int, starlight: int, summary: str, **kwargs: Any) -> dict:
        return self.submit_today_reading(release_id=release_id, starlight=starlight, summary=summary, **kwargs)

    def submit_bug_snapshot(self, *, release_id: int, open_bug_count: int, **kwargs: Any) -> dict:
        return self.submit_current_storms(release_id=release_id, open_bug_count=open_bug_count, **kwargs)


if __name__ == "__main__":
    print("Import boa_client with: from boa_client import submit_observation")
