---
name: gate1-review-request
description: ExecPlan の Gate 1 review request issue を create/update する
---

# Gate 1 Review Request

ExecPlan 向けの Gate 1 review issue を生成または更新する: **$ARGUMENTS**

## Purpose

- ExecPlan から review issue 本文を自動生成する
- Round 数と shared review contract を issue 本文に埋め込む
- 人手で review protocol をコピペしない

## Usage

```bash
./scripts/create-gate1-review-request.sh $ARGUMENTS
```

## Examples

```bash
./scripts/create-gate1-review-request.sh plans/active/TASK-0035-orchestration-evolution.md --dry-run
./scripts/create-gate1-review-request.sh plans/active/TASK-0035-orchestration-evolution.md --issue 169
```
