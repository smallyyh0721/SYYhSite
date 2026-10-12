"""Build the consolidated plan, validate local references, and package the handoff.

Only reads project design sources and writes handoff documentation/archive outputs.
No website dependencies, Blender scenes, credentials, or Git state are changed.
"""
from __future__ import annotations

import hashlib
import json
import re
import struct
import subprocess
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = ROOT / "docs" / "agent-handoff"
PARTS = ["README.md", "07-phased-plan.md", "01-design.md", "02-implementation.md",
         "03-assets.md", "04-collaboration.md", "05-taskboard.md", "06-development-deployment.md"]


def read_json(name: str):
    return json.loads((HANDOFF / name).read_text(encoding="utf-8"))


def write_json(path: Path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def demote_headings(text: str) -> str:
    in_code = False
    lines = []
    for line in text.splitlines():
        if line.startswith("```"):
            in_code = not in_code
        if not in_code and re.match(r"^#{1,5} ", line):
            line = "#" + line
        lines.append(line)
    return "\n".join(lines)


class LocalLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []

    def handle_starttag(self, tag, attrs):
        self.targets.extend(v for k, v in attrs if k in {"href", "src"} and v)


def validate_target(source: Path, target: str, errors: list):
    target = target.strip("<>").split("#", 1)[0]
    if not target or target.startswith(("https:", "http:", "mailto:", "data:")):
        return
    # Windows drive paths are absolute filesystem references, not URI schemes.
    if re.match(r"^[A-Za-z]:[/\\]", target):
        dest = Path(unquote(target))
    elif urlsplit(target).scheme:
        return
    else:
        dest = source.parent / unquote(target)
    if not dest.exists():
        errors.append({"source": str(source.relative_to(ROOT)), "target": target})


def main():
    phases = read_json("phases.json")
    active = next(p for p in phases["phases"] if p["id"] == phases["currentPhase"])
    merged = ["# SYYH Signal · 完整设计、实施、素材与部署方案（五阶段合订本）",
              "版本：2026-10-12 / handoff-v2。部署正文已合并；先读五阶段计划，再按当前阶段查设计/架构/素材/协作/任务与部署。分册修改后运行 `python scripts/build-agent-handoff.py`。",
              f"阶段1 draft → 阶段2 修正完善 → 阶段3 素材完善 → 阶段4 正式建设 → 阶段5 正式修补。当前 {active['id']}：{active['status']}。实际实施、验证及部署事实见 [P1交接](../agent-work/phases/P1/handoff.md)。历史设计正文与当前执行事实分开记录。\n"]
    for name in PARTS:
        merged.append(demote_headings((HANDOFF / name).read_text(encoding="utf-8")))
    (HANDOFF / "complete-plan.md").write_text("\n\n---\n\n".join(merged) + "\n", encoding="utf-8")

    assets = read_json("asset-manifest.json")
    for asset in assets["assets"]:
        source = asset.get("sourcePath")
        if source and source.endswith(".png"):
            path = ROOT / source
            raw = path.read_bytes()
            if raw[:8] != b"\x89PNG\r\n\x1a\n":
                raise ValueError(f"Invalid PNG: {source}")
            width, height = struct.unpack(">II", raw[16:24])
            asset["measurements"] = {"width": width, "height": height, "bytes": len(raw)}
            asset["sha256"] = hashlib.sha256(raw).hexdigest()
    write_json(HANDOFF / "asset-manifest.json", assets)

    decisions = read_json("decisions.json")
    read_json("deployment-facts.json")
    phases = read_json("phases.json")
    tasks = read_json("tasks.json")["tasks"]
    ids = [t["id"] for t in tasks]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate task id")
    phase_ids = [phase["id"] for phase in phases["phases"]]
    assert phase_ids == ["P1", "P2", "P3", "P4", "P5"]
    phase_tasks = [tid for phase in phases["phases"] for tid in phase["tasks"]]
    assert len(phase_tasks) == len(set(phase_tasks)) and set(phase_tasks) == set(ids)
    for phase in phases["phases"]:
        assert phase["status"] in phases["statusVocabulary"]
        assert all(t["phaseId"] == phase["id"] for t in tasks if t["id"] in phase["tasks"])

    def dependencies(task):
        return set(task["dependsOn"]) | {d["id"] for d in task.get("conditionalDependsOn", [])}
    accepted = set()
    remaining = list(tasks)
    while remaining:
        ready = [t for t in remaining if dependencies(t) <= accepted]
        if not ready:
            raise ValueError("Task graph contains a cycle or a missing dependency")
        accepted.update(t["id"] for t in ready)
        remaining = [t for t in remaining if t not in ready]
    assert isinstance(decisions["productionImplementationStarted"], bool)
    known_statuses = set(read_json("tasks.json")["statusVocabulary"])
    assert all(t["status"] in known_statuses for t in tasks), "Unknown task status"

    errors = []
    link_count = 0
    docs = sorted(HANDOFF.rglob("*.md")) + [ROOT / "README.md", ROOT / "AGENTS.md"]
    for source in docs:
        targets = re.findall(r"(?<!!)\[[^\]\n]+\]\(([^\)\n]+)\)", source.read_text(encoding="utf-8"))
        for target in targets:
            link_count += 1
            validate_target(source, target, errors)
    for source in HANDOFF.rglob("*.html"):
        parser = LocalLinks()
        parser.feed(source.read_text(encoding="utf-8"))
        for target in parser.targets:
            link_count += 1
            validate_target(source, target, errors)
    for asset in assets["assets"]:
        for field in ["sourcePath", "runtimePath", "posterPath"]:
            if asset.get(field):
                validate_target(ROOT / "asset-manifest-root.txt", asset[field], errors)
    if errors:
        raise ValueError(json.dumps(errors, ensure_ascii=False, indent=2))

    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "handoff-documents-and-source-assets-only",
        "jsonParse": "passed", "taskDag": "passed", "taskCount": len(tasks),
        "phaseCount": len(phase_ids), "phaseTaskConsistency": "passed",
        "queueStatuses": sorted({t["status"] for t in tasks}),
        "localReferenceCheck": "passed", "referencesChecked": link_count,
        "islandPngMetadataAndHashes": "passed",
        "brokenReferences": errors,
        "websiteBuildRun": False, "browserInteractionTestsRun": False,
        "newBlenderAssetTestsRun": False,
        "runtimeEvidence": "docs/agent-work/phases/P1/handoff.md",
        "limitations": ["This generator validates documentation and source references only. Runtime results are recorded separately in the phase handoff."]
    }
    write_json(HANDOFF / "validation.json", report)

    tracked = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT,
                             capture_output=True, check=True).stdout.decode("utf-8").split("\0")
    files = {ROOT / p for p in tracked if p and (ROOT / p).is_file() and (ROOT / p).suffix != ".zip"}
    files.add(ROOT / "AGENTS.md")
    files.add(Path(__file__).resolve())
    for folder in [ROOT / "docs", ROOT / "design" / "review-v1", ROOT / "design" / "review-v2"]:
        files.update(p for p in folder.rglob("*") if p.is_file() and p.suffix != ".zip"
                     and "__pycache__" not in p.parts)
    # This is a source/design handoff, never an image release or secret backup.
    def excluded(path: Path) -> bool:
        name = path.name.lower()
        suffix = path.suffix.lower()
        return (suffix in {".pem", ".key", ".db", ".sqlite", ".sqlite3", ".tar", ".gz"}
                or "logs" in path.relative_to(ROOT).parts
                or name.endswith(".local.md") or name == "grok-p1-local.log"
                or "references" in path.relative_to(ROOT).parts
                or name in {"id_rsa", "id_ed25519"}
                or ((name.startswith(".env") or name.endswith(".env")) and not name.endswith(".example"))
                or name.endswith((".db-wal", ".db-shm", ".sqlite-wal", ".sqlite-shm")))
    files = {p for p in files if not excluded(p)}
    # Manifest excludes itself to avoid a self-referential hash.
    package_manifest = HANDOFF / "package-files.json"
    files.discard(package_manifest)
    checksums = [{"path": p.relative_to(ROOT).as_posix(), "bytes": p.stat().st_size,
                  "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                 for p in sorted(files)]
    write_json(package_manifest, {"version": 2, "package": "syyh-agent-handoff-v2.zip",
                                 "note": "Draft source, design and phase docs; not a Docker image release. Dependencies, databases, logs and credentials excluded. External Blender skill referenced in place.",
                                 "files": checksums})
    files.add(package_manifest)
    archive = ROOT / "syyh-agent-handoff-v2.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(files):
            z.write(p, p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        for item in checksums:
            assert hashlib.sha256(z.read(item["path"])).hexdigest() == item["sha256"]
    print(json.dumps({"completePlan": str(HANDOFF / "complete-plan.md"),
                      "validation": report, "archive": str(archive),
                      "archiveBytes": archive.stat().st_size, "archiveFiles": len(files),
                      "archiveIntegrity": "passed"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
