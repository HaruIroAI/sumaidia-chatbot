---
name: repo-hygiene-status
description: 現在の repo hygiene 状態と未解決 dirty state を表示する
---

# Repo Hygiene Status

現在の repo hygiene 状態を確認する: **$ARGUMENTS**

## Purpose

- local artifact と実作業差分を分離する
- follow-up 未登録の dirty state を見つける
- review / close 前の hygiene gate を事前確認する

## Usage

```bash
python3 ./scripts/repo-hygiene-check.py $ARGUMENTS
```

## Examples

```bash
python3 ./scripts/repo-hygiene-check.py --format summary
python3 ./scripts/repo-hygiene-check.py --format json --write-cleanup-hints
```
