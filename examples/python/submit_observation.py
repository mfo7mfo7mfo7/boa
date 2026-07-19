#!/usr/bin/env python3
"""CLI for submitting a Boa Observation Notebook reading.

Examples:

    python submit_observation.py \
        --product "Lantern Vale" \
        --version 1.6 \
        --starlight 73 \
        --summary "The journey is moving with steady light." \
        --open-bugs 5

    python submit_observation.py \
        --release-id 21 \
        --starlight 73 \
        --open-bugs 37 \
        --detail-file today.md

Environment variables:

    BOA_BASE_URL      default: http://127.0.0.1:8000
    BOA_PRODUCT       default product
    BOA_VERSION       default version
    BOA_RELEASE_ID    default release id
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date

from boa_client import (
    BoaError,
    BoaResult,
    submit_observation,
)


def parse_args():
    parser = argparse.ArgumentParser(description="Submit today's Boa observation to an existing journey.")
    parser.add_argument("--base-url", default=os.environ.get("BOA_BASE_URL", "http://127.0.0.1:8000"))
    env_release_id = os.environ.get("BOA_RELEASE_ID")
    parser.add_argument("--release-id", type=int, default=int(env_release_id) if env_release_id else None)
    parser.add_argument("--product", default=os.environ.get("BOA_PRODUCT", None))
    parser.add_argument("--version", default=os.environ.get("BOA_VERSION", None))
    parser.add_argument("--starlight", type=int, default=None)
    parser.add_argument("--summary", default=None)
    parser.add_argument("--detail", default=None)
    parser.add_argument("--detail-file", default=None)
    parser.add_argument("--open-bugs", type=int, default=None)
    parser.add_argument("--observed-on", default=date.today().isoformat())
    parser.add_argument("--timeout", type=int, default=10)
    parser.add_argument("--allow-partial", action="store_true", help="Do not abort if one call fails.")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be submitted and exit.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.release_id is None and (args.product is None or args.version is None):
        print("Error: provide --release-id or both --product and --version", file=sys.stderr)
        return 1

    detail = args.detail
    if args.detail_file:
        with open(args.detail_file, "r", encoding="utf-8") as f:
            detail = f.read()

    if args.starlight is None and args.open_bugs is None:
        print("Error: provide at least one of --starlight or --open-bugs", file=sys.stderr)
        return 1

    if args.dry_run:
        print("Would submit to", args.base_url)
        if args.release_id:
            print("  release_id:", args.release_id)
        else:
            print("  product:", args.product)
            print("  version:", args.version)
        print("  starlight:", args.starlight)
        print("  summary:", args.summary)
        print("  detail:", (detail or "")[:80])
        print("  open_bugs:", args.open_bugs)
        print("  observed_on:", args.observed_on)
        return 0

    try:
        result = submit_observation(
            base_url=args.base_url,
            release_id=args.release_id,
            product=args.product,
            version=args.version,
            starlight=args.starlight,
            summary=args.summary,
            detail=detail,
            open_bug_count=args.open_bugs,
            observed_on=args.observed_on,
            timeout=args.timeout,
            allow_partial=args.allow_partial,
        )
    except BoaError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"release_id={result.release_id}")
    if result.observation_ok:
        print("observation=ok")
    if result.storms_ok:
        print("current_storms=ok")
    for error in result.errors:
        print(f"warning: {error}", file=sys.stderr)

    return 0 if result.ok else 2


if __name__ == "__main__":
    sys.exit(main())
