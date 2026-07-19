#!/usr/bin/env python3
"""Static preflight checks for Boa frontend assets."""

from __future__ import annotations

import re
import sys
from pathlib import Path

STATIC_DIR = Path(__file__).resolve().parents[1] / "src" / "boa" / "static"


def check_no_unsafe_innerhtml_interpolations():
    errors = []
    app_js = (STATIC_DIR / "app.js").read_text()
    for match in re.finditer(r'\.innerHTML\s*=\s*`([^`]*)`', app_js, re.DOTALL):
        block = match.group(1)
        interpolations = re.findall(r'\$\{([^}]*)\}', block)
        unsafe = [
            expr for expr in interpolations
            if not expr.startswith("escapeHtml(")
            and not expr.strip().isdigit()
            and "formatDate" not in expr
            and "formatDateTime" not in expr
        ]
        if unsafe:
            line = app_js[: match.start()].count("\n") + 1
            errors.append(f"app.js:{line} unsafe innerHTML interpolation: {unsafe}")
    return errors


def check_css_brace_balance():
    errors = []
    css = (STATIC_DIR / "app.css").read_text()
    css = re.sub(r'/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', "", css)
    stack = []
    for i, line in enumerate(css.splitlines(), 1):
        for ch in line:
            if ch == "{":
                stack.append(i)
            elif ch == "}":
                if not stack:
                    errors.append(f"app.css:{i} extra closing brace")
                else:
                    stack.pop()
    if stack:
        errors.append(f"app.css:{stack[-1]} unclosed opening brace")
    return errors


def check_html_references_existing_ids():
    errors = []
    html = (STATIC_DIR / "index.html").read_text()
    html_ids = set(re.findall(r'id="([^"]+)"', html))
    js = (STATIC_DIR / "app.js").read_text()
    referenced = set(re.findall(r'document\.querySelector\("#([^"]+)"\)', js))
    missing = referenced - html_ids
    for ident in missing:
        errors.append(f"app.js references missing HTML id: #{ident}")
    return errors


def main():
    errors = []
    errors.extend(check_no_unsafe_innerhtml_interpolations())
    errors.extend(check_css_brace_balance())
    errors.extend(check_html_references_existing_ids())

    if errors:
        print("Preflight failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Preflight passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
