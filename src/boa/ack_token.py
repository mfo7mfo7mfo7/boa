"""Secure acknowledgement tokens for the Email Ack Workflow.

Tokens are generated with ``secrets.token_urlsafe`` and stored as SHA-256
hashes so a database leak does not expose usable links.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


DEFAULT_TOKEN_TTL_HOURS = 168  # 7 days


@dataclass(frozen=True, slots=True)
class PlainAckToken:
    """A freshly generated token before it is hashed and persisted."""

    milestone_id: int
    token: str
    token_hash: str
    expires_at: datetime


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_ack_token(
    milestone_id: int,
    *,
    ttl_hours: int = DEFAULT_TOKEN_TTL_HOURS,
) -> PlainAckToken:
    """Generate a cryptographically secure acknowledgement token."""
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(hours=ttl_hours)
    return PlainAckToken(
        milestone_id=milestone_id,
        token=token,
        token_hash=token_hash,
        expires_at=expires_at,
    )


def hash_ack_token(token: str) -> str:
    """Hash a plaintext token for lookup."""
    return _hash_token(token)
