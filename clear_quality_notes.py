#!/usr/bin/env python3
"""
clear_quality_notes.py

Wipes every Quality Note (and its attached evidence files) from the app,
via the real backend API. Requires an ADMIN account, since this endpoint
is destructive and irreversible.

USAGE
-----
    pip install requests
    python clear_quality_notes.py --url http://localhost --username admin --password yourpassword

    # or set environment variables instead of flags:
    export PWS_API_URL=http://localhost
    export PWS_USERNAME=admin
    export PWS_PASSWORD=yourpassword
    python clear_quality_notes.py

You will be asked to confirm before anything is deleted.
"""

import argparse
import os
import sys

try:
    import requests
except ImportError:
    sys.exit("Missing dependency. Run: pip install requests")


def login(base_url, username, password):
    resp = requests.post(
        f"{base_url}/api/auth/token",
        data={"username": username, "password": password},
    )
    if resp.status_code != 200:
        sys.exit(f"Login failed ({resp.status_code}): {resp.text}")
    return resp.json()["access_token"]


def main():
    parser = argparse.ArgumentParser(description="Clear all Quality Notes via the live API.")
    parser.add_argument("--url", default=os.environ.get("PWS_API_URL", "http://localhost"),
                         help="Backend base URL (default: http://localhost or $PWS_API_URL)")
    parser.add_argument("--username", default=os.environ.get("PWS_USERNAME"),
                         help="Admin login username (or set $PWS_USERNAME)")
    parser.add_argument("--password", default=os.environ.get("PWS_PASSWORD"),
                         help="Admin login password (or set $PWS_PASSWORD)")
    parser.add_argument("--yes", action="store_true",
                         help="Skip the confirmation prompt")
    args = parser.parse_args()

    if not args.username or not args.password:
        sys.exit(
            "Missing credentials. Pass --username/--password, or set "
            "$PWS_USERNAME / $PWS_PASSWORD environment variables. "
            "Must be an admin account."
        )

    base_url = args.url.rstrip("/")
    print(f"Target API: {base_url}")
    token = login(base_url, args.username, args.password)
    print(f"Logged in as '{args.username}'")

    if not args.yes:
        confirm = input(
            "\nThis will permanently delete ALL quality notes and their "
            "attached evidence files. Type 'yes' to continue: "
        )
        if confirm.strip().lower() != "yes":
            print("Cancelled. Nothing was deleted.")
            return

    resp = requests.delete(
        f"{base_url}/api/quality/notes",
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.status_code == 403:
        sys.exit("Forbidden: this action requires an admin account.")
    if resp.status_code >= 400:
        sys.exit(f"Failed to clear quality notes ({resp.status_code}): {resp.text}")

    data = resp.json()
    print(f"\nDeleted {data.get('deleted_count', 0)} quality note(s). Evidence files removed.")


if __name__ == "__main__":
    main()