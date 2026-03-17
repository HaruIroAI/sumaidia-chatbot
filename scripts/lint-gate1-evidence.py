#!/usr/bin/env python3
"""Lint Gate 1 evidence blocks in ExecPlans.

This guard catches the specific review-loop pattern where relationship-heavy
predicates are "proven" with grep/jq style existence checks instead of a
verify script or smoke test.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


RELATION_KEYWORDS = (
    "same payload",
    "同一 payload",
    "同一ペイロード",
    "return payload",
    "返却 payload",
    "retry",
    "same branch",
    "同一 branch",
    "同一分岐",
    "side effect",
    "behavior",
    "振る舞い",
)

SIMPLE_EVIDENCE_PATTERN = re.compile(r"\b(grep|rg|jq|yq)\b")
SCRIPT_EVIDENCE_PATTERN = re.compile(
    r"(bash|sh|node|python|pytest|npm|pnpm|yarn|go test|cargo test|scripts/|/scripts/|test-|smoke)",
    re.IGNORECASE,
)
DOD_PATTERN = re.compile(r"^\*\*(D-\d+[A-Z]?)\*\*\s+—\s+(.*)$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lint Gate 1 evidence blocks.")
    parser.add_argument("path", help="ExecPlan markdown path")
    return parser.parse_args()


def normalize_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.exists():
        return path
    cwd_path = Path.cwd() / raw_path
    if cwd_path.exists():
        return cwd_path
    raise FileNotFoundError(raw_path)


def extract_code_block(lines: list[str], start: int, end: int) -> str:
    in_code = False
    code_lines: list[str] = []
    for idx in range(start, end):
        line = lines[idx]
        if line.strip().startswith("```"):
            if in_code:
                break
            in_code = True
            continue
        if in_code:
            code_lines.append(line.rstrip("\n"))
    return "\n".join(code_lines).strip()


def iter_dod_blocks(lines: list[str]) -> list[dict[str, object]]:
    blocks: list[dict[str, object]] = []
    idx = 0
    while idx < len(lines):
        match = DOD_PATTERN.match(lines[idx].strip())
        if not match:
            idx += 1
            continue

        label = match.group(1)
        predicate = match.group(2).strip()
        start = idx
        idx += 1

        while idx < len(lines):
            next_match = DOD_PATTERN.match(lines[idx].strip())
            if next_match:
                break
            idx += 1

        code = extract_code_block(lines, start, idx)
        blocks.append(
            {
                "label": label,
                "predicate": predicate,
                "code": code,
                "line_number": start + 1,
            }
        )

    return blocks


def is_relation_heavy(predicate: str) -> bool:
    lower = predicate.lower()
    return any(keyword.lower() in lower for keyword in RELATION_KEYWORDS)


def uses_simple_evidence(command: str) -> bool:
    return bool(SIMPLE_EVIDENCE_PATTERN.search(command))


def uses_script_evidence(command: str) -> bool:
    return bool(SCRIPT_EVIDENCE_PATTERN.search(command))


def lint_file(path: Path) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    errors: list[str] = []

    for block in iter_dod_blocks(lines):
        predicate = str(block["predicate"])
        command = str(block["code"])
        label = str(block["label"])
        line_number = int(block["line_number"])

        if not is_relation_heavy(predicate):
            continue

        if not command:
            errors.append(
                f"{label} line {line_number}: relation-heavy predicate has no evidence command."
            )
            continue

        if uses_simple_evidence(command):
            errors.append(
                f"{label} line {line_number}: relation-heavy predicate uses grep/jq style evidence. "
                "Use a verify script or smoke test."
            )
            continue

        if not uses_script_evidence(command):
            errors.append(
                f"{label} line {line_number}: relation-heavy predicate is not backed by a verify script "
                "or smoke test command."
            )

    return errors


def main() -> int:
    args = parse_args()
    try:
        path = normalize_path(args.path)
    except FileNotFoundError:
        print(f"Gate 1 lint: file not found: {args.path}", file=sys.stderr)
        return 2

    errors = lint_file(path)
    if not errors:
        print(f"Gate 1 lint PASS: {path}")
        return 0

    print(f"Gate 1 lint FAIL: {path}")
    for error in errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
