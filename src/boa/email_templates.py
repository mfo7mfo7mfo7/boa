"""Journey-themed email templates for the Boa Email Ack Workflow.

Templates are returned as (subject, body_text, body_html) tuples so the
standard-library email module can send a multipart alternative message.
"""

from __future__ import annotations

from datetime import date

from boa.domain import MilestoneRecord, ReleaseRecord


_ACK_BASE_PATH = "/ack/"


def _ack_url(base_url: str, token: str) -> str:
    base = base_url.rstrip("/")
    return f"{base}{_ACK_BASE_PATH}{token}"


def _format_date(value: date) -> str:
    return value.strftime("%B %d, %Y")


def _journey_subject_prefix(release: ReleaseRecord) -> str:
    return f"{release.blueprint.product} {release.blueprint.version}"


def _boa_signature() -> str:
    return (
        "\n"
        "—\n"
        "Boa\n"
        "Reveal the shape of a release.\n"
        "https://github.com/trendmicro/boa\n"
    )


def render_reminder_email(
    release: ReleaseRecord,
    milestone: MilestoneRecord,
    *,
    token: str,
    base_url: str,
) -> tuple[str, str, str]:
    """Render a milestone reminder email with a secret acknowledgement link."""
    subject = f"{_journey_subject_prefix(release)} · {milestone.name} is approaching"
    ack_url = _ack_url(base_url, token)

    body_text = (
        f"Hi {milestone.owner},\n\n"
        f"The milestone '{milestone.name}' for {release.blueprint.product} "
        f"{release.blueprint.version} is expected on {_format_date(milestone.expected)}.\n\n"
        f"Quietly mark it here (no login required):\n"
        f"{ack_url}\n\n"
        f"This secret link expires in 7 days.\n"
        f"If you already acknowledged this milestone, you can ignore this reminder.\n"
        f"{_boa_signature()}"
    )

    body_html = f"""
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px; line-height: 1.55;">
        <div style="max-width: 520px; margin: 0 auto; background: #fffdf7; border: 1px solid rgba(103,92,83,0.16); border-radius: 6px; padding: 32px;">
          <p style="margin: 0 0 18px 0;">Hi {milestone.owner},</p>
          <p style="margin: 0 0 18px 0;">
            The milestone <strong>{milestone.name}</strong> for
            <strong>{release.blueprint.product} {release.blueprint.version}</strong>
            is expected on <strong>{_format_date(milestone.expected)}</strong>.
          </p>
          <p style="margin: 0 0 18px 0;">
            <a href="{ack_url}" style="display: inline-block; padding: 12px 20px; background: #6f9f7a; color: #fffdf7; text-decoration: none; border-radius: 4px; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;">
              Acknowledge this milestone
            </a>
          </p>
          <p style="margin: 0; font-size: 13px; opacity: 0.72;">
            This secret link expires in 7 days. If you already acknowledged this milestone, you can ignore this reminder.
          </p>
          <hr style="border: none; border-top: 1px solid rgba(103,92,83,0.12); margin: 28px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; opacity: 0.6;">
            Boa — reveal the shape of a release.
          </p>
        </div>
      </body>
    </html>
    """

    return subject, body_text, body_html


def render_confirmation_email(
    release: ReleaseRecord,
    milestone: MilestoneRecord,
    *,
    ack_name: str,
    ack_note: str,
) -> tuple[str, str, str]:
    """Render an acknowledgement confirmation email."""
    subject = f"{_journey_subject_prefix(release)} · {milestone.name} acknowledged"

    note_line = ""
    if ack_note:
        note_line = f"\nNote: {ack_note}\n"

    body_text = (
        f"Hi {milestone.owner},\n\n"
        f"{ack_name} acknowledged the milestone '{milestone.name}' for "
        f"{release.blueprint.product} {release.blueprint.version}.\n"
        f"{note_line}"
        f"\n"
        f"The journey continues.\n"
        f"{_boa_signature()}"
    )

    body_html = f"""
    <html>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px; line-height: 1.55;">
        <div style="max-width: 520px; margin: 0 auto; background: #fffdf7; border: 1px solid rgba(103,92,83,0.16); border-radius: 6px; padding: 32px;">
          <p style="margin: 0 0 18px 0;">Hi {milestone.owner},</p>
          <p style="margin: 0 0 18px 0;">
            <strong>{ack_name}</strong> acknowledged the milestone
            <strong>{milestone.name}</strong> for
            <strong>{release.blueprint.product} {release.blueprint.version}</strong>.
          </p>
          {f'<p style="margin: 0 0 18px 0; font-style: italic;">“{ack_note}”</p>' if ack_note else ""}
          <p style="margin: 0;">The journey continues.</p>
          <hr style="border: none; border-top: 1px solid rgba(103,92,83,0.12); margin: 28px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; opacity: 0.6;">Boa — reveal the shape of a release.</p>
        </div>
      </body>
    </html>
    """

    return subject, body_text, body_html


def render_ack_request_email(
    release: ReleaseRecord,
    milestone: MilestoneRecord,
    *,
    token: str,
    base_url: str,
) -> tuple[str, str, str]:
    """Render an on-demand acknowledgement request email."""
    subject = f"{_journey_subject_prefix(release)} · Please acknowledge {milestone.name}"
    ack_url = _ack_url(base_url, token)

    body_text = (
        f"Hi {milestone.owner},\n\n"
        f"Please acknowledge the milestone '{milestone.name}' for "
        f"{release.blueprint.product} {release.blueprint.version}.\n\n"
        f"Use this secret link (no login required):\n"
        f"{ack_url}\n\n"
        f"This link expires in 7 days.\n"
        f"{_boa_signature()}"
    )

    body_html = f"""
    <html>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px; line-height: 1.55;">
        <div style="max-width: 520px; margin: 0 auto; background: #fffdf7; border: 1px solid rgba(103,92,83,0.16); border-radius: 6px; padding: 32px;">
          <p style="margin: 0 0 18px 0;">Hi {milestone.owner},</p>
          <p style="margin: 0 0 18px 0;">
            Please acknowledge the milestone <strong>{milestone.name}</strong> for
            <strong>{release.blueprint.product} {release.blueprint.version}</strong>.
          </p>
          <p style="margin: 0 0 18px 0;">
            <a href="{ack_url}" style="display: inline-block; padding: 12px 20px; background: #6f9f7a; color: #fffdf7; text-decoration: none; border-radius: 4px; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;">
              Acknowledge this milestone
            </a>
          </p>
          <p style="margin: 0; font-size: 13px; opacity: 0.72;">This secret link expires in 7 days.</p>
          <hr style="border: none; border-top: 1px solid rgba(103,92,83,0.12); margin: 28px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; opacity: 0.6;">Boa — reveal the shape of a release.</p>
        </div>
      </body>
    </html>
    """

    return subject, body_text, body_html
