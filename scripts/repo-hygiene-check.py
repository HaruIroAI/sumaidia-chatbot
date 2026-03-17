#!/usr/bin/env python3
"""Classify dirty worktree items and enforce repo hygiene follow-ups."""

from __future__ import annotations

import argparse
import ast
import fnmatch
import json
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_FOLLOWUPS_REL = Path(".claude/state/repo-hygiene-followups.json")
DEFAULT_HINTS_REL = Path(".claude/state/cleanup-hints.json")


@dataclass
class HygieneItem:
    status: str
    path: str
    category: str
    action: str
    blocking: bool
    covered_by_followup: bool
    followup_owner: str | None = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repo hygiene classifier and gate.")
    parser.add_argument(
        "--format",
        choices=("summary", "json"),
        default="summary",
        help="Output format.",
    )
    parser.add_argument(
        "--config",
        default=None,
        help="Path to repo hygiene rules JSON.",
    )
    parser.add_argument(
        "--followups",
        default=None,
        help="Path to repo hygiene follow-up JSON.",
    )
    parser.add_argument(
        "--write-cleanup-hints",
        action="store_true",
        help="Write summary to .claude/state/cleanup-hints.json.",
    )
    parser.add_argument(
        "--require-clean-or-followup",
        action="store_true",
        help="Exit non-zero if unresolved dirty items remain.",
    )
    return parser.parse_args()


def run_git(repo_root: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(repo_root), *args],
        text=True,
        stderr=subprocess.DEVNULL,
    )


def detect_repo_root() -> Path:
    output = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
    return Path(output)


def load_json(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_config_path(repo_root: Path, raw_path: str | None) -> Path:
    if raw_path:
        return Path(raw_path).resolve()

    candidates = [
        Path(__file__).resolve().parent.parent / "config/repo-hygiene-rules.json",
        repo_root / "config/repo-hygiene-rules.json",
        repo_root / "projects/automated-dev-system/config/repo-hygiene-rules.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("repo-hygiene-rules.json")


def resolve_followups_path(repo_root: Path, raw_path: str | None) -> Path:
    if raw_path:
        return Path(raw_path).resolve()
    return repo_root / DEFAULT_FOLLOWUPS_REL


def resolve_hints_path(repo_root: Path) -> Path:
    return repo_root / DEFAULT_HINTS_REL


def normalize_status_path(raw_path: str) -> str:
    path = raw_path.split(" -> ", 1)[1] if " -> " in raw_path else raw_path
    if path.startswith('"') and path.endswith('"'):
        decoded = ast.literal_eval(path)
        try:
            return decoded.encode("latin-1", "surrogateescape").decode("utf-8", "surrogateescape")
        except UnicodeError:
            return decoded
    return path


def parse_status(repo_root: Path) -> list[tuple[str, str]]:
    output = run_git(repo_root, "status", "--short", "--ignore-submodules=none", "--untracked-files=all")
    items: list[tuple[str, str]] = []
    for line in output.splitlines():
        if not line:
            continue
        status = line[:2]
        path = normalize_status_path(line[3:])
        items.append((status, path))
    return items


def matches_any(path: str, patterns: list[str]) -> bool:
    for pattern in patterns:
        if fnmatch.fnmatch(path, pattern):
            return True
        if pattern.startswith("**/") and fnmatch.fnmatch(path, pattern[3:]):
            return True
    return False


def is_prefix_match(path: str, prefixes: list[str]) -> bool:
    for prefix in prefixes:
        cleaned = prefix.rstrip("/")
        if path == cleaned or path.startswith(cleaned + "/"):
            return True
    return False


def is_gitlink_deleted(repo_root: Path, path: str, status: str) -> bool:
    if "D" not in status:
        return False
    try:
        entry = run_git(repo_root, "ls-tree", "HEAD", path).strip()
    except subprocess.CalledProcessError:
        return False
    return entry.startswith("160000 ")


def load_followups(path: Path) -> list[dict[str, Any]]:
    data = load_json(path, {"followups": []})
    followups = data.get("followups", [])
    if not isinstance(followups, list):
        return []
    return [item for item in followups if isinstance(item, dict)]


def covered_by_followup(path: str, followups: list[dict[str, Any]]) -> tuple[bool, str | None]:
    for followup in followups:
        followup_path = str(followup.get("path", "")).rstrip("/")
        if not followup_path:
            continue
        if str(followup.get("status", "open")) == "closed":
            continue
        if path == followup_path or path.startswith(followup_path + "/"):
            return True, str(followup.get("owner", "")) or None
    return False, None


def action_for_category(category: str) -> str:
    return {
        "local_artifact": "ignore_or_delete",
        "tracked_local_artifact": "decouple_or_revert",
        "delegated_repo_state": "delegate_with_followup",
        "repo_structure_issue": "fix_repo_structure",
        "unclassified_dirty_state": "decide_commit_or_revert",
    }[category]


def classify_items(
    repo_root: Path,
    rules: dict[str, Any],
    followups: list[dict[str, Any]],
) -> list[HygieneItem]:
    items: list[HygieneItem] = []
    local_patterns = [str(x) for x in rules.get("local_artifact_patterns", [])]
    non_blocking_local_patterns = [str(x) for x in rules.get("non_blocking_local_artifact_patterns", [])]
    tracked_patterns = [str(x) for x in rules.get("tracked_local_artifact_patterns", [])]
    delegated_roots = [str(x) for x in rules.get("delegated_repo_roots", [])]
    repo_structure_paths = [str(x) for x in rules.get("repo_structure_paths", [])]

    for status, path in parse_status(repo_root):
        if is_gitlink_deleted(repo_root, path, status) or is_prefix_match(path, repo_structure_paths):
            category = "repo_structure_issue"
        elif is_prefix_match(path, delegated_roots):
            category = "delegated_repo_state"
        elif matches_any(path, tracked_patterns):
            category = "tracked_local_artifact"
        elif matches_any(path, local_patterns):
            category = "local_artifact"
        else:
            category = "unclassified_dirty_state"

        blocking = not (
            category == "local_artifact" and matches_any(path, non_blocking_local_patterns)
        )
        covered, owner = covered_by_followup(path, followups)
        items.append(
            HygieneItem(
                status=status,
                path=path,
                category=category,
                action=action_for_category(category),
                blocking=blocking,
                covered_by_followup=covered,
                followup_owner=owner,
            )
        )

    return items


def build_payload(repo_root: Path, items: list[HygieneItem], followups: list[dict[str, Any]]) -> dict[str, Any]:
    category_counts = Counter(item.category for item in items)
    unresolved = [item for item in items if item.blocking and not item.covered_by_followup]
    non_blocking = [item for item in items if not item.blocking]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo_root": str(repo_root),
        "summary": {
            "total_items": len(items),
            "unresolved_items": len(unresolved),
            "non_blocking_items": len(non_blocking),
            "by_category": dict(category_counts),
        },
        "items": [asdict(item) for item in items],
        "followups": followups,
    }


def write_cleanup_hints(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def format_summary(payload: dict[str, Any]) -> str:
    total = int(payload["summary"]["total_items"])
    unresolved = int(payload["summary"]["unresolved_items"])
    non_blocking = int(payload["summary"].get("non_blocking_items", 0))
    if total == 0:
        return "Repo hygiene: CLEAN"

    lines = [
        f"Repo hygiene: OPEN ({unresolved} unresolved / {total} total)",
    ]
    by_category = payload["summary"]["by_category"]
    for category in sorted(by_category):
        lines.append(f"- {category}: {by_category[category]}")
    if non_blocking > 0:
        lines.append(f"- non_blocking_local_state: {non_blocking}")

    items = payload["items"]
    unresolved_items = [item for item in items if item["blocking"] and not item["covered_by_followup"]]
    if unresolved_items:
        lines.append("- unresolved:")
        for item in unresolved_items[:5]:
            lines.append(f"  - {item['path']} [{item['category']}] -> {item['action']}")
    else:
        lines.append("- all blocking dirty items are covered by follow-up or policy")

    return "\n".join(lines)


def main() -> int:
    args = parse_args()

    try:
        repo_root = detect_repo_root()
        config_path = resolve_config_path(repo_root, args.config)
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"Repo hygiene: unable to initialize ({exc})", file=sys.stderr)
        return 2

    rules = load_json(config_path, {})
    followups_path = resolve_followups_path(repo_root, args.followups)
    followups = load_followups(followups_path)
    items = classify_items(repo_root, rules, followups)
    payload = build_payload(repo_root, items, followups)

    if args.write_cleanup_hints:
        write_cleanup_hints(resolve_hints_path(repo_root), payload)

    if args.format == "json":
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        print(format_summary(payload))

    if args.require_clean_or_followup and payload["summary"]["unresolved_items"] > 0:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
