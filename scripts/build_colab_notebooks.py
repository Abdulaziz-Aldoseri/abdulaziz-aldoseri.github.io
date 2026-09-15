"""Build delivery editions without changing frozen scientific notebooks/packages."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "Abdulaziz-Aldoseri/abdulaziz-aldoseri.github.io"
STUDIES = {
    "energy": ("reference_study", "energy-flexibility"),
    "mobility": ("mobility_rebalancing", "mobility-rebalancing"),
    "retail": ("retail_allocation", "retail-allocation"),
    "airline": ("airline_fleet", "airline-fleet"),
    "telecom": ("telecom_staff", "telecom-staff"),
}


def source(cell: dict) -> str:
    return "".join(cell["source"])


def set_source(cell: dict, text: str) -> None:
    cell["source"] = text.splitlines(keepends=True)


def bootstrap(study: str, archive_url: str, archive_hash: str, size: int) -> str:
    extractor = (
        "return prepare_colab_archive(payload, target)"
        if study == "energy"
        else """if target.exists():
        verify_package(target)
        return target
    return safe_extract_package(payload, target)"""
    )
    return f'''
# Delivery-only setup. The scientific package remains the frozen original.
import os
import tempfile
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

STUDY_ID = {study!r}
PACKAGE_URL = {archive_url!r}
PACKAGE_SHA256 = {archive_hash!r}
PACKAGE_BYTES = {size}


def load_study_package(package_url=PACKAGE_URL, destination=None):
    """Fetch the complete pinned package; verify before extraction or imports.

    The optional URL/directory arguments permit local delivery verification.
    Analysis inputs and expected archive bytes are never inferred from a URL.
    """
    from hashlib import sha256
    try:
        with urlopen(package_url, timeout=30) as response:
            payload = response.read(PACKAGE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise RuntimeError(
            "The study package could not be retrieved. Check the connection and "
            "rerun this cell. An unpublished preview becomes available after its "
            "GitHub release. No study code has been imported."
        ) from error
    if len(payload) != PACKAGE_BYTES or sha256(payload).hexdigest() != PACKAGE_SHA256:
        raise ValueError("The study package failed its pinned size/SHA-256 check. Nothing was extracted.")
    target = Path(destination) if destination is not None else (
        Path(tempfile.gettempdir()) / ("decision-lab-" + STUDY_ID + "-" + PACKAGE_SHA256[:16])
    )
    if target.exists():
        # Bind cached verification to the freshly pinned archive, never to a
        # mutable local manifest. Reject extra modules that could shadow imports.
        from io import BytesIO
        from zipfile import ZipFile
        if target.is_symlink() or not target.is_dir():
            raise ValueError("The cached study directory is unsafe.")
        prefix = "energy-flexibility/" if STUDY_ID == "energy" else ""
        manifest_name = "PACKAGE_MANIFEST.json" if STUDY_ID == "energy" else "package_manifest.json"
        with ZipFile(BytesIO(payload)) as pinned:
            trusted_manifest = pinned.read(prefix + manifest_name)
            allowed_roots = {{name[len(prefix):].split("/", 1)[0] for name in pinned.namelist()}}
        local_manifest = target / manifest_name
        if local_manifest.is_symlink() or not local_manifest.is_file() or local_manifest.read_bytes() != trusted_manifest:
            raise ValueError("The cached manifest differs from the pinned study package.")
        allowed_generated = {{"__pycache__"}}
        if STUDY_ID == "airline":
            allowed_generated.add("notebook_reproduction")
        if STUDY_ID == "mobility":
            allowed_generated.update({{"local-source-downloads", "reproduced-aggregates"}})
        for entry in target.iterdir():
            if entry.is_symlink():
                raise ValueError("A cached study entry is a symlink.")
            working_notebook = entry.is_file() and entry.suffix.lower() == ".ipynb"
            if entry.name not in allowed_roots | allowed_generated and not working_notebook:
                raise ValueError("Unexpected cached study entry could shadow code: " + entry.name)
    {extractor}
'''


def delivery_instructions() -> str:
    return """## Open the complete study

Run the cells in order in a fresh CPU runtime. Setup automatically retrieves the complete, frozen study package and verifies its exact size and SHA-256 before extracting or importing project code. Data, model code, source attribution, tests and full evaluated results are included; no separate file download, upload or Drive access is needed. Prepared or aggregate data retains the scope documented below and in the source register; it is not a claim that every publisher's raw export is redistributed.

Google Colab setup installs this study's pinned requirements where required. For local Jupyter, install the package requirements first. The acquisition and extraction path has been tested locally, including corruption, retrieval failure and rerun checks. Hosted Colab execution has not been verified. An unpublished website preview's Colab link becomes available when the notebook is published to GitHub.

This delivery edition changes setup only. The original scientific notebook, code, data, evaluation protocol and results remain in the unchanged reproduction package. The setup cell exposes the exact package URL and checksum for inspection.
"""


def build() -> dict:
    entries = {}
    for study, (notebook_name, package_name) in STUDIES.items():
        folder = ROOT / "public/files" / study
        original = folder / f"{notebook_name}.ipynb"
        archive = folder / f"{package_name}-reproducibility.zip"
        raw = archive.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        url = f"https://raw.githubusercontent.com/{REPOSITORY}/master/public/files/{study}/{archive.name}"
        original_document = json.loads(original.read_text(encoding="utf-8"))
        document = copy.deepcopy(original_document)
        helper_index, setup_index = (1, 1) if study == "energy" else (2, 3)
        helper = source(document["cells"][helper_index])
        helper = helper.replace(
            "Obtain the archive from the study's own download link and compare its published\narchive checksum when available.",
            "The delivery setup pins the complete archive by size and SHA-256 before this\nhelper runs.",
        ).replace(
            "Use the reproduction ZIP downloaded alongside this notebook.",
            "The delivery setup verifies the pinned archive before calling this helper.",
        ).replace(
            "Upload the complete energy-flexibility reproduction ZIP.",
            "The retrieved package is incomplete or is not the energy study.",
        )
        if study == "energy":
            helper = helper.split("# Optional setup: only this branch imports Google Colab.")[0]
            setup = '''import importlib.util
import subprocess
import sys
try:
    IN_COLAB = importlib.util.find_spec("google.colab") is not None
except (ImportError, ModuleNotFoundError):
    IN_COLAB = False
PROJECT = load_study_package()
if IN_COLAB:
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(PROJECT / "requirements.txt")], check=True)
    for package, expected_version in [("numpy", "2.3.5"), ("scipy", "1.16.3")]:
        already_loaded = sys.modules.get(package)
        if already_loaded is not None and getattr(already_loaded, "__version__", None) != expected_version:
            raise RuntimeError("A dependency was already loaded at another version. Restart the Colab runtime and rerun setup.")
os.chdir(PROJECT)
print("Complete study verified and ready. Continue with the analysis cells below.")
'''
            set_source(document["cells"][1], helper + bootstrap(study, url, digest, len(raw)) + "\n# Start the study\n" + setup)
            intro = source(document["cells"][0]).split("**Local Jupyter:**")[0]
            set_source(document["cells"][0], intro + delivery_instructions())
        else:
            set_source(document["cells"][helper_index], helper + bootstrap(study, url, digest, len(raw)))
            original_setup = source(document["cells"][setup_index])
            tail = original_setup[original_setup.index("sys.path.insert"):]
            imports = "import importlib.util\nimport subprocess\nimport sys\n"
            if study == "telecom":
                imports += "import tempfile\nimport html\n"
            setup = imports + '''try:
    IN_COLAB = importlib.util.find_spec("google.colab") is not None
except (ImportError, ModuleNotFoundError):
    IN_COLAB = False
PROJECT = load_study_package()
verified_files = verify_package(PROJECT)
'''
            if study != "telecom":
                setup += '''if IN_COLAB:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "-r", str(PROJECT / "requirements.txt")])
'''
            setup += "os.chdir(PROJECT)\n" + tail
            set_source(document["cells"][setup_index], setup)
            set_source(document["cells"][1], delivery_instructions())

        changed = {0, 1} if study == "energy" else {1, 2, 3}
        for i, cell in enumerate(document["cells"]):
            if i not in changed:
                assert cell == original_document["cells"][i], f"Scientific cell changed: {study}:{i}"
            if cell["cell_type"] == "code":
                compile(source(cell), f"{study}:cell-{i}", "exec")
        document.setdefault("metadata", {})["decision_lab_delivery"] = {
            "version": "1.0.0", "scientific_notebook_sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
            "package_sha256": digest, "hosted_colab_execution_verified": False,
        }
        target = ROOT / "public/notebooks" / f"{study}.ipynb"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        entries[study] = {
            "colabUrl": f"https://colab.research.google.com/github/{REPOSITORY}/blob/master/public/notebooks/{study}.ipynb",
            "notebookPath": f"/notebooks/{study}.ipynb", "notebookSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "packageUrl": url, "packagePath": f"/files/{study}/{archive.name}",
            "packageBytes": len(raw), "packageSha256": digest,
            "scientificNotebookPath": f"/files/{study}/{original.name}",
            "scientificNotebookSha256": hashlib.sha256(original.read_bytes()).hexdigest(),
            "deliveryVersion": "1.0.0", "hostedColabExecutionVerified": False,
        }
    (ROOT / "src/data/colab-notebooks.json").write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8", newline="\n")
    return entries


if __name__ == "__main__":
    print(json.dumps({"built": list(build()), "scientificAssetsChanged": False}))
