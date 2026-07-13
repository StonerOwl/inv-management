#!/usr/bin/env python3
"""
generate_test_data.py

Populates the Inventory & Workflow Management app with realistic, varied
test data for the Project -> Workflow -> Stage -> Process hierarchy, via
the real backend API (no direct DB access, so it works exactly like the
UI would).

WHAT IT CREATES
----------------
- 5 Projects, each with a product, category, and a mix of timelines:
    - some LIVE (started, not yet finished)
    - some FINISHED (both dates in the past)
    - some PLANNING (both dates in the future, not started yet)
- Each project gets 1-3 Workflows (varied), plain names, no IDs/tags
- Each workflow gets 2-4 Stages (varied)
- Each stage gets 1-3 Processes (varied), each with a random subset of
  image upload types checked (Visual, NIR, Thermal, X-Ray, Spectral,
  Ultrasonic) -- some processes are left with none checked, meaning
  "allow all", to mirror real usage.
- All parent/child links are created via /api/pws/assignments so the
  hierarchy shows up correctly in the Tree and Manage views.

USAGE
-----
    pip install requests
    python generate_test_data.py --url http://localhost --username admin --password yourpassword

    # or set environment variables instead of flags:
    export PWS_API_URL=http://localhost
    export PWS_USERNAME=admin
    export PWS_PASSWORD=yourpassword
    python generate_test_data.py

Re-running the script creates a fresh batch of projects/workflows/etc each
time (it does not touch or delete existing data).
"""

import argparse
import os
import random
import sys
import time
import uuid
from datetime import datetime, timedelta

try:
    import requests
except ImportError:
    sys.exit("Missing dependency. Run: pip install requests")


# ---------------------------------------------------------------------------
# Test data pools -- edit here to change the "flavor" of generated data
# ---------------------------------------------------------------------------

PROJECT_TEMPLATES = [
    {"name": "Organic Tomato Supply Chain", "product": "Fresh Organic Tomatoes", "category": "Agriculture"},
    {"name": "Textile Manufacturing Delta", "product": "Cotton T-Shirts", "category": "Textiles"},
    {"name": "Chemical Processing Unit Zeta", "product": "Industrial Cleaning Solution", "category": "Chemicals"},
    {"name": "Cold Chain Seafood Distribution", "product": "Frozen Atlantic Salmon", "category": "Food & Beverage"},
    {"name": "Precision Electronics Assembly", "product": "PCB Control Modules", "category": "Electronics"},
    {"name": "Pharmaceutical Batch Line 7", "product": "Ibuprofen 200mg Tablets", "category": "Pharmaceuticals"},
    {"name": "Automotive Parts Fabrication", "product": "Brake Caliper Assemblies", "category": "Automotive"},
    {"name": "Dairy Processing Facility North", "product": "Pasteurized Whole Milk", "category": "Food & Beverage"},
]

WORKFLOW_NAME_POOL = [
    "Intake & Receiving", "Quality Assurance Line", "Packaging & Labeling",
    "Cold Storage Handling", "Final Inspection", "Raw Material Prep",
    "Assembly Line A", "Assembly Line B", "Export Compliance",
]

STAGE_NAME_POOL = [
    "Initial Screening", "Visual Inspection", "Weight Verification",
    "Contaminant Testing", "Temperature Check", "Batch Sampling",
    "Defect Sorting", "Moisture Analysis", "Pressure Testing",
    "Final Sign-off",
]

PROCESS_NAME_POOL = [
    "Surface Scan", "Core Sample Extraction", "Density Measurement",
    "Seal Integrity Check", "Label Verification", "Weight Calibration",
    "Foreign Object Detection", "Color Consistency Check",
    "Dimensional Tolerance Check", "Residue Screening",
]

IMAGE_TYPES = ["Visual", "NIR", "Thermal", "X-Ray", "Spectral", "Ultrasonic"]

# Timeline mix for generated projects (weighted list -- adjust freely)
TIMELINE_MIX = ["live", "live", "finished", "planning"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def date_str(days_from_today):
    return (datetime.now() + timedelta(days=days_from_today)).strftime("%Y-%m-%d")


def rand_project_dates():
    """
    Returns (start_date, target_date, status_label) with a realistic mix:
      - live:     started in the past, target still in the future
      - finished: both start and target are in the past
      - planning: both start and target are in the future (not started yet)
    """
    status = random.choice(TIMELINE_MIX)
    if status == "live":
        start = date_str(-random.randint(10, 90))
        target = date_str(random.randint(10, 120))
    elif status == "finished":
        start = date_str(-random.randint(120, 300))
        target = date_str(-random.randint(5, 60))
    else:  # planning
        start = date_str(random.randint(5, 30))
        target = date_str(random.randint(60, 200))
    return start, target, status


def rand_image_types():
    """
    ~40% chance of no restriction (empty list = 'allow all'),
    otherwise a random subset of 1-4 image types.
    """
    if random.random() < 0.4:
        return []
    k = random.randint(1, 4)
    return random.sample(IMAGE_TYPES, k)


def new_id(prefix="pws"):
    # Internal record id only -- never shown as part of the item's name.
    return f"{prefix}_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"


class PWSClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self._login(username, password)

    def _login(self, username, password):
        resp = self.session.post(
            f"{self.base_url}/api/auth/token",
            data={"username": username, "password": password},
        )
        if resp.status_code != 200:
            sys.exit(f"Login failed ({resp.status_code}): {resp.text}")
        token = resp.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"Logged in as '{username}'")

    def create_item(self, item_type, name, **kwargs):
        payload = {"id": new_id(item_type[:1]), "type": item_type, "name": name}
        payload.update({k: v for k, v in kwargs.items() if v is not None})
        resp = self.session.post(f"{self.base_url}/api/pws/items", json=payload)
        if resp.status_code >= 400:
            raise RuntimeError(f"Failed to create {item_type} '{name}': {resp.status_code} {resp.text}")
        return resp.json()

    def assign(self, parent_id, child_id):
        resp = self.session.post(
            f"{self.base_url}/api/pws/assignments",
            json={"parent_id": parent_id, "child_id": child_id},
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Failed to assign {child_id} -> {parent_id}: {resp.status_code} {resp.text}")
        return resp.json()


# ---------------------------------------------------------------------------
# Main generation logic
# ---------------------------------------------------------------------------

def generate(client: PWSClient, num_projects: int):
    templates = PROJECT_TEMPLATES.copy()
    random.shuffle(templates)
    chosen = [templates[i % len(templates)] for i in range(num_projects)]

    summary = {"projects": 0, "workflows": 0, "stages": 0, "processes": 0,
               "live": 0, "finished": 0, "planning": 0}

    for tmpl in chosen:
        start_date, target_date, status = rand_project_dates()

        project = client.create_item(
            "project",
            tmpl["name"],
            product=tmpl["product"],
            category=tmpl["category"],
            start_date=start_date,
            target_date=target_date,
        )
        summary["projects"] += 1
        summary[status] += 1
        print(f"\n[PROJECT: {status.upper()}] {project['name']}  "
              f"({start_date} -> {target_date}, code={project.get('project_code')})")

        num_workflows = random.randint(1, 3)
        workflow_names = random.sample(WORKFLOW_NAME_POOL, num_workflows)

        for wf_name in workflow_names:
            workflow = client.create_item("workflow", wf_name)
            client.assign(project["id"], workflow["id"])
            summary["workflows"] += 1
            print(f"  [WORKFLOW] {workflow['name']}  (batch={workflow.get('batch_id')})")

            num_stages = random.randint(2, 4)
            stage_names = random.sample(STAGE_NAME_POOL, num_stages)

            for st_name in stage_names:
                stage = client.create_item("stage", st_name)
                client.assign(workflow["id"], stage["id"])
                summary["stages"] += 1
                print(f"    [STAGE] {stage['name']}")

                num_processes = random.randint(1, 3)
                process_names = random.sample(PROCESS_NAME_POOL, num_processes)

                for pr_name in process_names:
                    img_types = rand_image_types()
                    process = client.create_item(
                        "process",
                        pr_name,
                        allowed_image_types=img_types,
                    )
                    client.assign(stage["id"], process["id"])
                    summary["processes"] += 1
                    label = ", ".join(img_types) if img_types else "ALL TYPES"
                    print(f"      [PROCESS] {process['name']}  [{label}]")

    return summary


def main():
    parser = argparse.ArgumentParser(description="Generate PWS test data via the live API.")
    parser.add_argument("--url", default=os.environ.get("PWS_API_URL", "http://localhost"),
                         help="Backend base URL (default: http://localhost or $PWS_API_URL). "
                              "Use the same host/port your app runs on -- e.g. http://localhost "
                              "if served through the frontend's Nginx on port 80.")
    parser.add_argument("--username", default=os.environ.get("PWS_USERNAME"),
                         help="Login username (or set $PWS_USERNAME)")
    parser.add_argument("--password", default=os.environ.get("PWS_PASSWORD"),
                         help="Login password (or set $PWS_PASSWORD)")
    parser.add_argument("--projects", type=int, default=5,
                         help="Number of projects to generate (default: 5)")
    parser.add_argument("--seed", type=int, default=None,
                         help="Random seed, for reproducible test data")
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    if not args.username or not args.password:
        sys.exit(
            "Missing credentials. Pass --username/--password, or set "
            "$PWS_USERNAME / $PWS_PASSWORD environment variables."
        )

    print(f"Target API: {args.url}")
    client = PWSClient(args.url, args.username, args.password)

    summary = generate(client, args.projects)

    print("\n" + "=" * 50)
    print("DONE")
    print(f"  Projects:  {summary['projects']}  "
          f"(live={summary['live']}, finished={summary['finished']}, planning={summary['planning']})")
    print(f"  Workflows: {summary['workflows']}")
    print(f"  Stages:    {summary['stages']}")
    print(f"  Processes: {summary['processes']}")
    print("=" * 50)


if __name__ == "__main__":
    main()