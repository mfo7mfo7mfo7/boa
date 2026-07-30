# Boa 3.1 Release Notes

Boa 3.1 tightens the shared journey language and makes the reading path feel more complete.

This release brings the Starlight hover popup, Reading Post email output, and the supporting terminology into one steadier vocabulary. The main page now keeps Whisper, Page Notes, Evidence, and Today’s Reading in their proper places, while the Engine Room and release docs explain the control language more clearly.

## What Changed

### Starlight Hover Now Focuses On Page Notes

The Starlight hover popup now centers Page Notes instead of trying to show too many different reading fragments at once.

- The popup can expand so longer notes are easier to read.
- The hover card keeps the supporting reading hidden until the user asks for more space.
- The popup uses the same shared journey language as the rest of the dialogs.

### Reading Post Sends The Full Today’s Reading

Reading Post email output now renders the full Today’s Reading instead of flattening the page into plain text.

- Whisper, Starlight, Storms, and Page Notes all appear in the email.
- Page Notes support markdown so headings, lists, tables, and emphasis survive the trip.
- Imported or downloaded Reading Post settings stay useful because the same language is used across the journey.

### Engine Room And Release Language Stay In Sync

The Engine Room now reads like the control center for the journey instead of a loose collection of settings.

- The current time and date language are shown as part of the same shared vocabulary.
- Reading Post settings sit beside the rest of the delivery controls.
- The release docs now explain the journey terms in a more consistent order.

### Documentation Catches Up Again

Boa 3.1 updates the README and docs index so the public language matches the product behavior.

- The shared terms now describe Whisper, Page Notes, Evidence, and Today’s Reading.
- The release notes index points to the newest release first.
- The release process docs stay aligned with the versioning workflow.

## Validation

Boa 3.1 was prepared with:

```bash
uv run pytest tests/test_email_templates.py tests/test_playwright_e2e.py
uv run pytest tests/test_reading_post.py tests/test_yaml_io.py tests/test_api_hardening.py
git diff --check
```

## Suggested Tag

- `v3.1.0`

## Closing Note

Boa 3.1 keeps the journey language quiet, but a little more complete.

It makes the reading path, the popup path, and the release path feel like they belong to the same story.
