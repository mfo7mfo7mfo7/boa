# Boa 1.7 Release Notes

Boa 1.7 lays the SMTP Foundation for outbound email.

This release does not yet send milestone reminders or acknowledgement emails. It introduces the SMTP client, configuration surface, status API, and the Engine Room so operators can confirm email delivery before later workflow features rely on it.

## Highlights

### SMTP Client

A new standard-library-only module, `src/boa/email.py`, provides:

- `load_smtp_config()` — env-based SMTP configuration with validation
- `get_smtp_status()` — safe status summary (no password exposure)
- `send_email()` — outbound email via SMTP / SMTP_SSL / STARTTLS
- `send_test_email()` — test email to a configured or on-demand recipient

Passwords are never returned in API responses, UI, or error messages.

### Email Status API

- `GET /api/system/smtp` — inspect current SMTP configuration and readiness
- `POST /api/system/smtp/test` — send a test email to verify delivery

### System Panel UI

A small "System" entry in the top-right opens a status panel. The first section shows SMTP readiness, host, sender, security mode, and a test-recipient form.

### Docker / Env Support

All SMTP settings are available as environment variables and forwarded through `compose.yaml`:

- `BOA_SMTP_ENABLED`
- `BOA_SMTP_HOST`
- `BOA_SMTP_PORT`
- `BOA_SMTP_USERNAME`
- `BOA_SMTP_PASSWORD`
- `BOA_SMTP_FROM`
- `BOA_SMTP_FROM_NAME`
- `BOA_SMTP_STARTTLS`
- `BOA_SMTP_SSL`
- `BOA_SMTP_TIMEOUT`
- `BOA_SMTP_TEST_TO`

## Validation Rules

- Port must be an integer between 1 and 65535.
- `STARTTLS` and `SSL` cannot both be enabled.
- Timeout must be a positive number.
- When enabled, `BOA_SMTP_HOST` and `BOA_SMTP_FROM` are required.
- `BOA_SMTP_FROM` and `BOA_SMTP_TEST_TO` must look like email addresses.

## Provider Examples

See `.env.example` for commented examples for Gmail / Google Workspace, Microsoft 365, SendGrid, and Amazon SES.

## What Is Not Included

The following are intentionally left for future releases:

- Email Ack Workflow
- Milestone reminder schedule
- Reminder engine
- SMTP server hosting
- OAuth SMTP
- DKIM/SPF/DMARC setup
- Inbound email parsing
- Email templates beyond the test email

## Suggested Tag

- `v1.7.0`
