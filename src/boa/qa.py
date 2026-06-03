"""Local QA helpers for resetting Boa release data."""

from __future__ import annotations

import argparse
from pathlib import Path

from boa.storage import BoaStorage


DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "boa.db"


def reset_release_data(db_path: Path = DEFAULT_DB_PATH) -> int:
    """Delete all releases and cascading runtime data from the local QA database."""
    storage = BoaStorage(db_path)
    storage.initialize()
    with storage.connect() as connection:
        connection.execute("DELETE FROM releases")
        connection.execute(
            """
            DELETE FROM sqlite_sequence
            WHERE name IN ('releases', 'milestones', 'milestone_ack', 'bug_snapshot', 'notification_log')
            """
        )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Boa local QA helpers")
    parser.add_argument(
        "command",
        choices=["reset"],
        help="Reset the local QA database so the next manual test run starts clean.",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to the SQLite database (default: {DEFAULT_DB_PATH})",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "reset":
        return reset_release_data(args.db)

    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
