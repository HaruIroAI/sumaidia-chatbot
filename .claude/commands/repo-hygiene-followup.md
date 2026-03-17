---
name: repo-hygiene-followup
description: repo hygiene の follow-up を登録または close する
---

# Repo Hygiene Follow-up

repo hygiene の委譲状態を更新する: **$ARGUMENTS**

## Purpose

- 別セッション / 別 repo に委譲した dirty state を明示的に残す
- review request 前の hygiene gate を unblock する
- 放置された dirty state を session start で再表示できるようにする

## Usage

```bash
./scripts/repo-hygiene-followup.sh $ARGUMENTS
```

## Examples

```bash
./scripts/repo-hygiene-followup.sh status
./scripts/repo-hygiene-followup.sh add projects/haruiroai-lp --kind delegated_repo_state --owner haruiroai-lp-session --reason "別セッションで整理"
./scripts/repo-hygiene-followup.sh close projects/haruiroai-lp
```
