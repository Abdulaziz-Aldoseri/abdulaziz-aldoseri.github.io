"""Build the reproduction package and Colab notebook for a flagship case.

Only files on the case's public allowlist are packaged (for the export case,
the eligible list in ``materials/projects/export-logistics/PUBLIC_PACKAGE.md``).
The package is a deterministic ZIP committed under ``public/files/<case>/``;
the notebook fetches that committed snapshot from the website repository,
verifies its size and SHA-256 and never calls a data portal.

The summer-peak case is deliberately absent: its publication is held until
the licence for the monthly regional load data is confirmed.

Usage (from the repository root)::

    python scripts/build_case_packages.py [--cases PATH_TO_materials/projects]
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CASES = ROOT.parents[2] / "projects"
REPOSITORY = "Abdulaziz-Aldoseri/abdulaziz-aldoseri.github.io"
BRANCH = "master"
FIXED_TIME = (2026, 10, 16, 0, 0, 0)

# Paths that must never enter a public package, whatever the allowlist says.
FORBIDDEN = (
    "private", "comtrade", "crosscheck", "data/raw/portwatch",
    "GATE_REPORT", "REVIEW_RECORD", "data/raw/MANIFEST.json", "use_policy",
)

EXPORT_PROCESSED = [
    "gastat_polymer_exports_tidy.csv",
    "market_groups.csv",
    "group_volume_history.csv",
    "market_demand.csv",
    "sama_seaport_exports.csv",
    "sea_distances.csv",
    "chokepoint_monthly.csv",
    "port_monthly.csv",
    "port_group_monthly.csv",
    "scenario_calibration.json",
    "port_capacity_proxy.json",
    "build_summary.json",
    "README.md",
]


def export_allowlist(case: Path) -> list[Path]:
    files: list[Path] = []
    files += sorted((case / "src").glob("*.py"))
    files += sorted((case / "tests").glob("*.py"))
    files += [case / "requirements.txt", case / "requirements-lock.txt"]
    files += [case / "data/raw/MANIFEST_PUBLIC.json"]
    files += sorted((case / "data/raw/open").glob("*.csv"))
    files += sorted((case / "data/raw/open").glob("*.meta.json"))
    files += [case / "data/processed" / name for name in EXPORT_PROCESSED]
    files += sorted(p for p in (case / "outputs").iterdir() if p.is_file())
    files += [case / "MEMO_DRAFT.md", case / "WALKTHROUGH.md", case / "data/SOURCES.md"]
    return files


CASES = {
    "export-routing": {
        "folder": "export-logistics",
        "notebook_key": "exportRouting",
        "allowlist": export_allowlist,
        "title": "How much export shipping capacity should be committed while a key route is disrupted?",
        "tests": "tests/test_model.py",
        "attribution": [
            "Source: General Authority for Statistics (GASTAT), Exports According to Commodities, via KAPSARC Data Portal. Modified by the author; not official GASTAT statistics.",
            "Sources: Kpler; UN Global Platform; IMF PortWatch (portwatch.imf.org). Monthly aggregation by the author.",
            "Context only: Saudi Central Bank (SAMA), Volume of Seaports Exports, via KAPSARC Data Portal.",
            "Sea distances: searoute (Apache-2.0).",
        ],
        "results": ["decision_rule.csv", "policy_comparison.csv", "coast_split.csv", "gulf_exit_extension.csv"],
        "figures": ["hedge_vs_probability.png", "hedge_composition.png", "saving_vs_probability.png"],
        "rerun": "python src/run_all.py --rule-only",
        "rerun_check": "decision_rule.csv",
    },
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_zip(case: Path, files: list[Path]) -> bytes:
    manifest = {}
    entries = []
    for path in files:
        rel = path.relative_to(case).as_posix()
        if any(token in rel for token in FORBIDDEN):
            raise ValueError(f"Refusing to package a non-public file: {rel}")
        if not path.is_file():
            raise FileNotFoundError(rel)
        data = path.read_bytes()
        manifest[rel] = {"bytes": len(data), "sha256": sha256(data)}
        entries.append((rel, data))
    manifest_bytes = (json.dumps({"files": manifest}, indent=1, sort_keys=True) + "\n").encode()
    entries.append(("package_manifest.json", manifest_bytes))

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(entries):
            info = zipfile.ZipInfo(name, date_time=FIXED_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    return buffer.getvalue()


def markdown(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(keepends=True)}


def code(text: str) -> dict:
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": text.strip("\n").splitlines(keepends=True)}


def build_notebook(spec: dict, url: str, digest: str, size: int, case_id: str) -> dict:
    attribution = "\n".join(f"- {line}" for line in spec["attribution"])
    cells = [
        markdown(f"""
# {spec['title']}

**An independent case study on public data by Abdulaziz Aldoseri.** This notebook reproduces the published case from a committed snapshot of its public package: model code, tests, open-licence inputs, monthly aggregates and every evaluated output.

{attribution}
"""),
        markdown("""
## Open the complete case

Run the cells in order in a fresh CPU runtime. The setup cell downloads the committed package from the website repository, checks its exact size and SHA-256, extracts it safely and checks every file against the package manifest before any project code is imported. It never calls a data portal or API.

Hosted Colab execution has not been verified. The package pins the versions used for the published run; if a pinned version is unavailable in your runtime, install the nearest available versions and compare the reproduced decision rule with the published one (the final cell does this).
"""),
        code(f'''
import hashlib, io, json, subprocess, sys, tempfile, zipfile
from pathlib import Path
from urllib.request import urlopen

PACKAGE_URL = {url!r}
PACKAGE_SHA256 = {digest!r}
PACKAGE_BYTES = {size}


def load_case_package(target=None):
    with urlopen(PACKAGE_URL, timeout=60) as response:
        payload = response.read(PACKAGE_BYTES + 1)
    if len(payload) != PACKAGE_BYTES or hashlib.sha256(payload).hexdigest() != PACKAGE_SHA256:
        raise ValueError("The package failed its pinned size/SHA-256 check. Nothing was extracted.")
    target = Path(target or tempfile.gettempdir()) / ("{case_id}-" + PACKAGE_SHA256[:16])
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for name in archive.namelist():
            if name.startswith("/") or ".." in Path(name).parts:
                raise ValueError("Unsafe path in package: " + name)
        archive.extractall(target)
    manifest = json.loads((target / "package_manifest.json").read_text())["files"]
    for rel, meta in manifest.items():
        data = (target / rel).read_bytes()
        if len(data) != meta["bytes"] or hashlib.sha256(data).hexdigest() != meta["sha256"]:
            raise ValueError("Manifest check failed for " + rel)
    return target


PROJECT = load_case_package()
print("Package verified:", PROJECT)
try:
    import google.colab  # noqa: F401
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(PROJECT / "requirements.txt")], check=False)
except ImportError:
    pass
sys.path.insert(0, str(PROJECT / "src"))
'''),
        markdown("## Run the model tests"),
        code(f'''
subprocess.run([sys.executable, "-m", "pytest", "-q", "{spec['tests']}"], cwd=PROJECT, check=False)
'''),
        markdown("## The published results"),
        code(f'''
import pandas as pd
from IPython.display import Image, display

for name in {spec['results']!r}:
    print(name)
    display(pd.read_csv(PROJECT / "outputs" / name))
for name in {spec['figures']!r}:
    display(Image(filename=str(PROJECT / "outputs" / name)))
'''),
        markdown("## Reproduce the decision rule\n\nThis re-solves the model and compares the result with the published table. The full run (every table) is `python src/run_all.py` and takes 30–40 minutes."),
        code(f'''
import shutil
published = pd.read_csv(PROJECT / "outputs" / "{spec['rerun_check']}")
shutil.copytree(PROJECT / "outputs", PROJECT / "outputs_published", dirs_exist_ok=True)
subprocess.run({spec['rerun'].split()!r}, cwd=PROJECT, check=True)
reproduced = pd.read_csv(PROJECT / "outputs" / "{spec['rerun_check']}")
pd.testing.assert_frame_equal(published, reproduced, check_exact=False, rtol=1e-6)
print("Reproduced {spec['rerun_check']} matches the published table.")
'''),
    ]
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    args = parser.parse_args()
    registry_path = ROOT / "src/data/colab-notebooks.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))

    for case_id, spec in CASES.items():
        case = args.cases / spec["folder"]
        payload = build_zip(case, spec["allowlist"](case))
        digest = sha256(payload)
        folder = ROOT / "public/files" / case_id
        folder.mkdir(parents=True, exist_ok=True)
        archive_name = f"{case_id}-package.zip"
        (folder / archive_name).write_bytes(payload)
        url = f"https://raw.githubusercontent.com/{REPOSITORY}/{BRANCH}/public/files/{case_id}/{archive_name}"

        notebook = build_notebook(spec, url, digest, len(payload), case_id)
        notebook_bytes = (json.dumps(notebook, indent=1, ensure_ascii=False) + "\n").encode("utf-8")
        notebook_path = ROOT / "public/notebooks" / f"{case_id}.ipynb"
        notebook_path.write_bytes(notebook_bytes)

        registry[spec["notebook_key"]] = {
            "colabUrl": f"https://colab.research.google.com/github/{REPOSITORY}/blob/{BRANCH}/public/notebooks/{case_id}.ipynb",
            "notebookPath": f"/notebooks/{case_id}.ipynb",
            "notebookSha256": sha256(notebook_bytes),
            "packageUrl": url,
            "packagePath": f"/files/{case_id}/{archive_name}",
            "packageBytes": len(payload),
            "packageSha256": digest,
            "deliveryVersion": "1.0.0",
            "hostedColabExecutionVerified": False,
        }
        print(f"{case_id}: {len(payload):,} bytes, sha256 {digest[:16]}…")

    registry_path.write_bytes((json.dumps(registry, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))


if __name__ == "__main__":
    main()
