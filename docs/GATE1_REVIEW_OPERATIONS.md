# Gate 1 レビュー運用ルール

作成日: 2026-03-17
対象: Option C の Gate 1（ExecPlan 計画レビュー）

## 目的

Gate 1 が「設計レビュー」から「Evidence の書き方レビュー」へ崩れて、
同じ指摘が複数ラウンド続く事態を防ぐ。

## 適用範囲

- `ExecPlan` を Codex がレビューする Gate 1
- `Validation & Acceptance` の DoD / Evidence 設計
- 自動開発システム本体と、その運用ルールを継承する全プロジェクト

## レビュー契約

1. Gate 1 では「設計の妥当性」と「証明方法の妥当性」を分けて扱う。
2. Round 1-2 はギャップ指摘を許容する。
3. Round 3 以降、blocking が Evidence formulation だけなら、レビューアは抽象指摘で止めず、差し替え案レベルまで書く。
4. Round 3 以降、作成者は `grep` のバリエーション追加で逃げず、必要なら verify script / smoke test に切り替える。
5. Round 5 を超えて unresolved が残る場合は、個別 ExecPlan だけで解かず、この共有ルールかテンプレートを先に更新する。

## Evidence 選定ルール

| 証明したいもの                         | 推奨手段                            | `grep` の可否 |
| -------------------------------------- | ----------------------------------- | ------------- |
| ファイルの存在、登録、単純な文字列存在 | `ls`, `grep`, `jq`                  | 可            |
| 削除・置換済みの確認                   | 正/負の `grep`, `git log -- <path>` | 可            |
| JSON/YAML の構造、必須フィールド       | `jq`, `yq`                          | 条件付きで可  |
| 同一 payload 内の共存                  | verify script / parser              | 不可          |
| 同一分岐・同一ブロック内の制御         | smoke test / verify script          | 不可          |
| retry, callback, dispatch, side effect | smoke test / verify script          | 不可          |
| 後方互換や代表ケースの成功             | smoke test + log                    | 不可          |

## Path Freeze ルール

1. 各 DoD は対象実装ファイルまたは対象スクリプトのパスを固定する。
2. 要件自体が repo-wide でない限り、repo 全体の走査はしない。
3. 実装パスが未定なら、Step 側に「正とするパス」を先に書く。

## Atomic DoD ルール

1. 1 DoD = 1 predicate に分割する。
2. `A かつ B かつ C` が必要なら `D-04A`, `D-04B`, `D-04C` に分ける。
3. 各 DoD には以下を必ず持たせる。
   - 条件文
   - 証拠コマンド
   - Pass 基準

## ループ防止ルール

1. same payload / same branch / behavior を証明したいのに `grep` しか出てこない時点で、reviewer は script 化を要求する。
2. reviewer は Round 3 以降、「false positive の恐れがある」だけではなく、置換後の Evidence 形式を指定する。
3. author は Round 3 以降、repo-wide grep を細工して延命しない。
4. 争点が「実装の正しさ」ではなく「証明方法」だけになったら、review contract 問題として扱う。

## レビュー結果の SSOT

1. Gate 1 のレビュー結果は **GitHub Issue コメント** を正本とする。
2. `レビュー結果をプッシュ` / `共有` / `キャッシュ` / `Claude Code に見える形で残す` の既定動作は、Evidence 付きの `gh issue comment` 投稿とする。
3. ローカルファイルや `.codex/memories` への保存は補助 artifact としてのみ許可する。Issue コメントの代替にはしない。
4. レビューコメントには findings、必要な修正方針、Evidence コマンドまたはその結果要約を含める。
5. レビュー完了後の報告は comment URL を返す。GitHub 投稿に失敗した場合のみ、失敗理由とローカル退避先を返す。

## Gate 1 完了条件

- In-Scope の全項目が Step / DoD / Evidence に対応している
- 各 Evidence が証明タイプに合っている
- blocking 指摘が shared review contract に反していない

## 実装反映先

- 共有標準: `/Users/kamikoyuuichi/.claude/rules/execplan-standards.md`
- ExecPlan テンプレート: `projects/automated-dev-system/plans/templates/execplan-template.md`
- Claude 向け workflow: `projects/automated-dev-system/.claude/skills/execplan-workflow/SKILL.md`
- ガイド: `projects/automated-dev-system/docs/CLAUDE_CODE_CODEX_AUTO_DEV_GUIDE.md`
