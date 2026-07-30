"""Journey-themed email templates for the Boa Email Ack Workflow.

Templates are returned as (subject, body_text, body_html) tuples so the
standard-library email module can send a multipart alternative message.
"""

from __future__ import annotations

import re
from datetime import date
from html import escape

from boa.domain import BugSnapshot, MilestoneRecord, ReleaseRecord, ReleaseStarlight


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


def _ack_fallback_link(ack_url: str) -> str:
    return f"""
          <p style="margin: -6px 0 18px 0; font-size: 12px; line-height: 1.45; color: rgba(74,59,42,0.62); font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;">
            If the green path does not open, this quiet link leads to the same place:<br>
            <a href="{ack_url}" style="color: #6f7f5d; text-decoration: underline; text-underline-offset: 2px; overflow-wrap: anywhere;">{ack_url}</a>
          </p>
    """


def _reading_text(journey_reading: str | None) -> str:
    return f"{journey_reading}\n" if journey_reading else ""


def _reading_html(journey_reading: str | None) -> str:
    if not journey_reading:
        return ""
    return f"""
            <br>
            <span style="font-size: 13px; opacity: 0.72;">{journey_reading}</span>
    """


def _plain_reading_lines(starlight: ReleaseStarlight | None, storm: BugSnapshot | None) -> list[str]:
    if starlight is None:
        starlight_line = "Starlight: not written yet"
        reading_line = "Today’s Reading: not written yet"
        detail_line = ""
    else:
        starlight_line = f"Starlight: {starlight.current.starlight}/100"
        reading_line = f"Today’s Reading: {starlight.current.whisper}"
        detail_line = starlight.current.detail.content.strip()

    storm_line = "Storms: unknown" if storm is None else f"Storms: {storm.open_bug_count}"
    lines = [reading_line, starlight_line, storm_line]
    if detail_line:
        lines.extend(["", "Page Notes:", detail_line])
    return lines


_INLINE_MARKDOWN_PATTERN = re.compile(
    r"\[([^\]]+)\]\((https?://[^)\s]+)\)|`([^`]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_"
)


def _decode_markdown_text(text: str) -> str:
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!|])", r"\1", str(text or ""))


def _render_inline_markdown(text: str) -> str:
    source = _decode_markdown_text(text)
    parts: list[str] = []
    last_index = 0

    for match in _INLINE_MARKDOWN_PATTERN.finditer(source):
        if match.start() > last_index:
            parts.append(escape(source[last_index:match.start()]))

        if match.group(1) and match.group(2):
            parts.append(
                f'<a href="{escape(match.group(2), quote=True)}" target="_blank" rel="noopener noreferrer">'
                f"{escape(_decode_markdown_text(match.group(1)))}"
                "</a>"
            )
        elif match.group(3):
            parts.append(f"<code>{escape(match.group(3))}</code>")
        elif match.group(4) or match.group(5):
            parts.append(f"<strong>{escape(_decode_markdown_text(match.group(4) or match.group(5)))}</strong>")
        elif match.group(6) or match.group(7):
            parts.append(f"<em>{escape(_decode_markdown_text(match.group(6) or match.group(7)))}</em>")
        last_index = match.end()

    if last_index < len(source):
        parts.append(escape(source[last_index:]))
    return "".join(parts)


def _parse_markdown_table_row(line: str) -> list[str]:
    source = str(line or "").strip()
    if "|" not in source:
        return []
    trimmed = source.removeprefix("|").removesuffix("|")
    cells: list[str] = []
    cell = []
    escaped = False
    for char in trimmed:
        if escaped:
            cell.append(char)
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == "|":
            cells.append("".join(cell).strip())
            cell = []
            continue
        cell.append(char)
    cells.append("".join(cell).strip())
    return cells if any(cells) else []


def _render_markdown_html(markdown: str) -> str:
    source = _decode_markdown_text(markdown).replace("\r\n", "\n").replace("\r", "\n")
    lines = source.split("\n")
    blocks: list[tuple[str, object]] = []
    paragraph: list[str] = []
    list_items: list[dict[str, object]] = []
    list_ordered = False
    code_lines: list[str] = []
    in_code_block = False

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            blocks.append(("paragraph", " ".join(paragraph).strip()))
            paragraph = []

    def flush_list() -> None:
        nonlocal list_items, list_ordered
        if list_items:
            blocks.append(("list", {"ordered": list_ordered, "items": list_items[:]}))
            list_items = []
            list_ordered = False

    def flush_code() -> None:
        nonlocal code_lines
        if code_lines:
            blocks.append(("code", "\n".join(code_lines)))
            code_lines = []

    def is_table_divider(line: str) -> bool:
        cells = _parse_markdown_table_row(line)
        return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells)

    index = 0
    while index < len(lines):
        line = lines[index]
        trimmed = line.strip()

        if trimmed.startswith("```"):
            flush_paragraph()
            flush_list()
            if in_code_block:
                flush_code()
                in_code_block = False
            else:
                in_code_block = True
            index += 1
            continue

        if in_code_block:
            code_lines.append(line)
            index += 1
            continue

        if not trimmed:
            flush_paragraph()
            flush_list()
            index += 1
            continue

        heading_match = re.match(r"^(#{1,3})\s+(.*)$", trimmed)
        if heading_match:
            flush_paragraph()
            flush_list()
            blocks.append(("heading", (len(heading_match.group(1)), heading_match.group(2).strip())))
            index += 1
            continue

        table_headers = _parse_markdown_table_row(trimmed)
        next_line = lines[index + 1].strip() if index + 1 < len(lines) else ""
        if table_headers and is_table_divider(next_line):
            flush_paragraph()
            flush_list()
            index += 2
            rows: list[list[str]] = []
            while index < len(lines):
                row_cells = _parse_markdown_table_row(lines[index].strip())
                if not row_cells:
                    break
                rows.append(row_cells)
                index += 1
            blocks.append(("table", {"headers": table_headers, "rows": rows}))
            continue

        checkbox_match = re.match(r"^[-*]\s+\[( |x|X)\]\s+(.*)$", trimmed)
        if checkbox_match:
            flush_paragraph()
            if list_items and list_ordered:
                flush_list()
            list_items.append({"checked": checkbox_match.group(1).lower() == "x", "text": checkbox_match.group(2).strip()})
            list_ordered = False
            index += 1
            continue

        unordered_match = re.match(r"^[-*]\s+(.*)$", trimmed)
        if unordered_match:
            flush_paragraph()
            if list_items and list_ordered:
                flush_list()
            list_items.append({"text": unordered_match.group(1).strip()})
            list_ordered = False
            index += 1
            continue

        ordered_match = re.match(r"^\d+\.\s+(.*)$", trimmed)
        if ordered_match:
            flush_paragraph()
            if list_items and not list_ordered:
                flush_list()
            list_ordered = True
            list_items.append({"text": ordered_match.group(1).strip()})
            index += 1
            continue

        flush_list()
        paragraph.append(trimmed)
        index += 1

    flush_paragraph()
    flush_list()
    flush_code()

    rendered: list[str] = []
    for block_type, payload in blocks:
        if block_type == "heading":
            level, text = payload  # type: ignore[misc]
            tag = "h2" if int(level) <= 2 else "h3"
            rendered.append(f"<{tag}>{_render_inline_markdown(str(text))}</{tag}>")
            continue
        if block_type == "list":
            data = payload  # type: ignore[assignment]
            tag = "ol" if data["ordered"] else "ul"
            items_html: list[str] = []
            for item in data["items"]:
                text = _render_inline_markdown(str(item.get("text", "")))
                if item.get("checked") is not None:
                    checkbox = "☑" if item["checked"] else "☐"
                    text = f'<span class="boa-note-checkbox">{checkbox}</span> {text}'
                items_html.append(f"<li>{text}</li>")
            rendered.append(f"<{tag}>" + "".join(items_html) + f"</{tag}>")
            continue
        if block_type == "code":
            rendered.append(f"<pre><code>{escape(str(payload))}</code></pre>")
            continue
        if block_type == "table":
            data = payload  # type: ignore[assignment]
            headers = data["headers"]
            rows = data["rows"]
            head_html = "".join(f"<th>{_render_inline_markdown(str(header))}</th>" for header in headers)
            body_html = []
            for row in rows:
                row_html = "".join(f"<td>{_render_inline_markdown(str(row[index]) if index < len(row) else '')}</td>" for index in range(len(headers)))
                body_html.append(f"<tr>{row_html}</tr>")
            rendered.append(
                '<div class="boa-note-table-frame">'
                '<table style="width:100%; border-collapse:collapse;">'
                f"<thead><tr>{head_html}</tr></thead>"
                f"<tbody>{''.join(body_html)}</tbody>"
                "</table></div>"
            )
            continue
        rendered.append(f"<p>{_render_inline_markdown(str(payload))}</p>")

    return "".join(rendered)


def render_reading_post_email(
    release: ReleaseRecord,
    *,
    starlight: ReleaseStarlight | None,
    storm: BugSnapshot | None,
) -> tuple[str, str, str]:
    """Render a journey-level Observation Notebook reading post."""
    subject = f"{_journey_subject_prefix(release)} · Today’s Reading"
    lines = _plain_reading_lines(starlight, storm)
    body_text = (
        f"A quiet page from {release.blueprint.product} {release.blueprint.version}.\n\n"
        + "\n".join(lines)
        + _boa_signature()
    )

    if starlight is None:
        reading_html = "This page has not been written yet."
        starlight_html = "Not written"
        detail_html = ""
    else:
        reading_html = escape(starlight.current.whisper)
        starlight_html = f"{starlight.current.starlight}/100"
        detail_content = starlight.current.detail.content.strip()
        detail_html = (
            f"""
            <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(103,92,83,0.12);">
              <p style="margin: 0 0 7px 0; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif; font-size: 11px; letter-spacing: 0.11em; text-transform: uppercase; color: rgba(74,59,42,0.62);">Page Notes</p>
              <div style="margin: 0; color: rgba(74,59,42,0.82); font-size: 13px; line-height: 1.52;">{_render_markdown_html(detail_content)}</div>
            </div>
            """
            if detail_content
            else ""
        )

    storm_html = "Unknown" if storm is None else str(storm.open_bug_count)
    body_html = f"""
    <html>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px; line-height: 1.55;">
        <div style="max-width: 560px; margin: 0 auto; background: #fffdf7; border: 1px solid rgba(103,92,83,0.16); border-radius: 12px; padding: 32px;">
          <p style="margin: 0 0 8px 0; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(74,59,42,0.58);">Reading Post</p>
          <h1 style="margin: 0 0 8px 0; font-size: 28px; line-height: 1.18; font-weight: 400;">Today’s Reading</h1>
          <p style="margin: 0 0 22px 0; color: rgba(74,59,42,0.68);">A quiet page from <strong>{escape(release.blueprint.product)} {escape(release.blueprint.version)}</strong>.</p>
          <p style="margin: 0 0 18px 0; font-size: 17px;">{reading_html}</p>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0 0 4px 0;">
            <div style="padding: 12px 14px; border: 1px solid rgba(103,92,83,0.12); border-radius: 12px; background: rgba(251,246,234,0.46);">
              <p style="margin: 0 0 4px 0; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(74,59,42,0.58);">Starlight</p>
              <p style="margin: 0;">{escape(starlight_html)}</p>
            </div>
            <div style="padding: 12px 14px; border: 1px solid rgba(103,92,83,0.12); border-radius: 12px; background: rgba(251,246,234,0.46);">
              <p style="margin: 0 0 4px 0; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(74,59,42,0.58);">Storms</p>
              <p style="margin: 0;">{escape(storm_html)}</p>
            </div>
          </div>
          {detail_html}
          <hr style="border: none; border-top: 1px solid rgba(103,92,83,0.12); margin: 28px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; opacity: 0.6;">Boa — reveal the shape of a release.</p>
        </div>
      </body>
    </html>
    """
    return subject, body_text, body_html


def render_reminder_email(
    release: ReleaseRecord,
    milestone: MilestoneRecord,
    *,
    token: str,
    base_url: str,
    journey_reading: str | None = None,
) -> tuple[str, str, str]:
    """Render a milestone reminder email with a secret acknowledgement link."""
    subject = f"{_journey_subject_prefix(release)} · {milestone.name} is approaching"
    ack_url = _ack_url(base_url, token)

    body_text = (
        f"Hi {milestone.owner},\n\n"
        f"The milestone '{milestone.name}' for {release.blueprint.product} "
        f"{release.blueprint.version} is coming into view.\n"
        f"Expected on {_format_date(milestone.expected)}.\n"
        f"{_reading_text(journey_reading)}"
        f"\n"
        f"If you have seen it, acknowledge it here. No login is needed:\n"
        f"{ack_url}\n\n"
        f"This link stays open for 7 days.\n"
        f"If a mark has already been left, you can let this note drift by.\n"
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
            is coming into view.
            <br>
            <span style="font-size: 13px; opacity: 0.72;">Expected on <strong>{_format_date(milestone.expected)}</strong>.</span>
            {_reading_html(journey_reading)}
          </p>
          <p style="margin: 0 0 18px 0;">
            <a href="{ack_url}" style="display: inline-block; padding: 12px 20px; background: #6f9f7a; color: #fffdf7; text-decoration: none; border-radius: 4px; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;">
              Acknowledge
            </a>
          </p>
          {_ack_fallback_link(ack_url)}
          <p style="margin: 0; font-size: 13px; opacity: 0.72;">
            This link stays open for 7 days. If a mark has already been left, you can let this note drift by.
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
    journey_reading: str | None = None,
) -> tuple[str, str, str]:
    """Render an on-demand acknowledgement request email."""
    subject = f"{_journey_subject_prefix(release)} · {milestone.name} is ready for a mark"
    ack_url = _ack_url(base_url, token)

    body_text = (
        f"Hi {milestone.owner},\n\n"
        f"The milestone '{milestone.name}' for {release.blueprint.product} "
        f"{release.blueprint.version} is waiting for acknowledgement.\n"
        f"Expected on {_format_date(milestone.expected)}.\n"
        f"{_reading_text(journey_reading)}"
        f"\n"
        f"You can acknowledge it here. No login is needed:\n"
        f"{ack_url}\n\n"
        f"This link stays open for 7 days.\n"
        f"{_boa_signature()}"
    )

    body_html = f"""
    <html>
      <body style="font-family: Georgia, serif; color: #4a3b2a; background: #fbf6ea; padding: 24px; line-height: 1.55;">
        <div style="max-width: 520px; margin: 0 auto; background: #fffdf7; border: 1px solid rgba(103,92,83,0.16); border-radius: 6px; padding: 32px;">
          <p style="margin: 0 0 18px 0;">Hi {milestone.owner},</p>
          <p style="margin: 0 0 18px 0;">
            The milestone <strong>{milestone.name}</strong> for
            <strong>{release.blueprint.product} {release.blueprint.version}</strong>
            is waiting for acknowledgement.
            <br>
            <span style="font-size: 13px; opacity: 0.72;">Expected on <strong>{_format_date(milestone.expected)}</strong>.</span>
            {_reading_html(journey_reading)}
          </p>
          <p style="margin: 0 0 18px 0;">
            <a href="{ack_url}" style="display: inline-block; padding: 12px 20px; background: #6f9f7a; color: #fffdf7; text-decoration: none; border-radius: 4px; font-family: 'Inter', 'SF Pro Text', system-ui, sans-serif;">
              Acknowledge
            </a>
          </p>
          {_ack_fallback_link(ack_url)}
          <p style="margin: 0; font-size: 13px; opacity: 0.72;">This link stays open for 7 days.</p>
          <hr style="border: none; border-top: 1px solid rgba(103,92,83,0.12); margin: 28px 0 16px 0;">
          <p style="margin: 0; font-size: 13px; opacity: 0.6;">Boa — reveal the shape of a release.</p>
        </div>
      </body>
    </html>
    """

    return subject, body_text, body_html
