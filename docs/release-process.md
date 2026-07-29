# Boa Release Process

Boa ships best when one version bump travels through code, docs, and validation together.

## Source Of Truth

When cutting a new release, update the version in these places together:

1. `pyproject.toml`
2. `src/boa/__init__.py`
3. `src/boa/api.py`

If the public UI or docs mention the release number, update those references at the same time.

## Docs That Move With A Release

When a release adds or changes visible behavior, keep these docs in sync:

- `README.md`
- `docs/index.md`
- `docs/release-notes-<version>.md`

If a feature is user-facing, make sure README includes a short explanation of how to use it.

## Suggested Release Flow

1. Finish the feature changes.
2. Write or update the release notes.
3. Update README feature guidance for new or changed user-facing behavior.
4. Bump the version in the source of truth files.
5. Run validation.
6. Rebuild and verify the GUI.
7. Tag the release after the branch is ready.

## Validation

The usual checks are:

```bash
uv run pytest
git diff --check
node --check src/boa/static/app.js
```

If the change touches the browser UI, rebuild and verify the page visually before shipping.

## Working Rule

If a feature is important enough to mention in a release, it is important enough to appear in the README somewhere.
