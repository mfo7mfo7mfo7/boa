# Testing Boa

Boa is tested like a traveler checking each landmark: layer by layer, from the smallest stone to the whole horizon.

1. **Unit / API tests** (`tests/test_*.py`) — FastAPI `TestClient`, in-memory SQLite.
2. **SMTP tests** (`tests/test_smtp.py`) — configuration, status, error sanitization.
3. **Email ack tests** (`tests/test_email_ack.py`) — token lifecycle, confirmation emails, replay.
4. **Reminder tests** (`tests/test_reminders.py`) — scheduling, parsing, duplicate prevention.
5. **YAML tests** (`tests/test_yaml_io.py`) — import, export, round-trip.
6. **API hardening tests** (`tests/test_api_hardening.py`) — edge cases, large datasets, long journeys.
7. **Static preflight** (`scripts/static_preflight.py`) — XSS-safe rendering, CSS balance, HTML id references.
8. **Playwright E2E** (`tests/test_playwright_*.py`) — browser automation; deselected in sandboxed environments where localhost binding is blocked.

## Running tests

```bash
uv run pytest -q tests/ -k "not playwright"
```

To run static preflight separately:

```bash
python3 scripts/static_preflight.py
```

## Sandbox limitations

Some environments do not allow binding to `127.0.0.1`. In those environments Playwright tests fail at setup with `PermissionError`. This is an environment limitation, not a product issue. Always run the non-Playwright suite for a reliable signal.
