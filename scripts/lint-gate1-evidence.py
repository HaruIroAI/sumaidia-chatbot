#!/usr/bin/env python3
"""Lint Gate 1 evidence blocks in ExecPlans.

Guards:
  1. relation-heavy predicates must use verify script / smoke test (not grep/jq)
  2. RTM: every DoD must have an evidence command
  3. subjective language in DoD predicates (warning)
  4. relative paths in evidence commands (warning)
  5. compound conditions in DoD predicates (warning)
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


SUBJECTIVE_WORDS = re.compile(
    r"(適切に|確認できる|更新されている|正しく|十分に|適切な|きちんと|うまく|良い形で)",
    re.IGNORECASE,
)
COMPOUND_WORDS = re.compile(r"(かつ|および|ならびに|\band\b|\bAND\b)")
RELATIVE_PATH_PATTERN = re.compile(r'(?:^|\s|["\'])(\.{1,2}/\S+)')

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


Finding = dict[str, object]


def _finding(severity: str, label: str, line_number: int, message: str) -> Finding:
    return {"severity": severity, "label": label, "line": line_number, "message": message}


def lint_file(path: Path) -> list[Finding]:
    lines = path.read_text(encoding="utf-8").splitlines()
    findings: list[Finding] = []

    for block in iter_dod_blocks(lines):
        predicate = str(block["predicate"])
        command = str(block["code"])
        label = str(block["label"])
        line_number = int(block["line_number"])

        # --- RTM: every DoD must have an evidence command (error) ---
        if not command:
            findings.append(_finding(
                "error", label, line_number,
                "RTM violation: DoD has no evidence command."
            ))
            continue

        # --- relation-heavy predicate checks (existing, error) ---
        if is_relation_heavy(predicate):
            if uses_simple_evidence(command):
                findings.append(_finding(
                    "error", label, line_number,
                    "relation-heavy predicate uses grep/jq style evidence. Use a verify script or smoke test."
                ))
            elif not uses_script_evidence(command):
                findings.append(_finding(
                    "error", label, line_number,
                    "relation-heavy predicate is not backed by a verify script or smoke test command."
                ))

        # --- subjective language in predicate (warning) ---
        if SUBJECTIVE_WORDS.search(predicate):
            findings.append(_finding(
                "warning", label, line_number,
                f"subjective language in predicate: {SUBJECTIVE_WORDS.search(predicate).group(0)!r}. "
                "Use state-based wording only."
            ))

        # --- relative path in evidence command (warning) ---
        if RELATIVE_PATH_PATTERN.search(command):
            findings.append(_finding(
                "warning", label, line_number,
                "relative path in evidence command. Use absolute path instead."
            ))

        # --- compound condition in predicate (warning) ---
        if COMPOUND_WORDS.search(predicate):
            findings.append(_finding(
                "warning", label, line_number,
                f"compound condition in predicate: {COMPOUND_WORDS.search(predicate).group(0)!r}. "
                "Split into separate DoD entries."
            ))

    return findings


def main() -> int:
    args = parse_args()
    try:
        path = normalize_path(args.path)
    except FileNotFoundError:
        print(f"Gate 1 lint: file not found: {args.path}", file=sys.stderr)
        return 2

    findings = lint_file(path)
    errors = [f for f in findings if f["severity"] == "error"]
    warnings = [f for f in findings if f["severity"] == "warning"]

    if not findings:
        print(f"Gate 1 lint PASS: {path}")
        return 0

    if warnings:
        print(f"Gate 1 lint WARNINGS ({len(warnings)}): {path}")
        for w in warnings:
            print(f"  [warning] {w['label']} line {w['line']}: {w['message']}")

    if errors:
        print(f"Gate 1 lint FAIL ({len(errors)} error(s)): {path}")
        for e in errors:
            print(f"  [error]   {e['label']} line {e['line']}: {e['message']}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
