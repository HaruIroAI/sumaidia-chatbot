# TASK-XXXX: [タイトル]

**Created**: YYYY-MM-DD
**Assignee**: @username | codex | claude
**Primary Owner**: codex
**Review Owner**: claude
**Human Approval**: required / not_required

---

## Purpose / Big Picture

**ユーザー価値**:

- [このタスクがユーザーに提供する価値]

**背景**:

- [なぜこのタスクが必要か]

---

## Discovery（該当する場合のみ）

> 新規機能・大規模変更の場合、ExecPlan 作成前に Discovery を実施する。
> 成果物は ExecPlan の根拠として参照する。

| 調査種別             | コマンド               | 成果物                                   | 実施済み |
| -------------------- | ---------------------- | ---------------------------------------- | -------- |
| PRD / 機能仕様       | `/write-spec`          | `docs/specs/TASK-XXXX-spec.md`           | [ ]      |
| ユーザーリサーチ統合 | `/synthesize-research` | `docs/research/TASK-XXXX-research.md`    | [ ]      |
| 競合分析             | `/competitive-brief`   | `docs/research/TASK-XXXX-competitive.md` | [ ]      |
| ブレインストーミング | `/brainstorm`          | Decision Log に記録                      | [ ]      |

---

## Appetite（このタスクに使う最大時間）

**XX 時間以内**で完結させる。超えそうなら範囲を削る。

---

## Scope

### In Scope (やること)

- [ ] Item 1
- [ ] Item 2

### No-Gos（このタスクでは絶対やらないこと）

> スコープ膨張を防ぐための明示的な境界線。「やらないこと」を先に決める。

- NG: Item A（理由: スコープ外 / 次タスクで対応）
- NG: Item B（理由: リスクが大きく別途検討が必要）

### Rabbit Holes（落とし穴・ハマりやすい箇所）

> 実装前に想定される落とし穴を列挙する。対策も書く。

- [ ] 落とし穴1 → 対策: ...
- [ ] 落とし穴2 → 対策: ...

---

## Tech Stack（技術選定・バージョンロック）

> **このセクションは技術スタックを新規採用・追加するタスクにのみ記載する。既存スタックのみ使用するタスクは省略可。**
>
> **調査日時**: YYYY-MM-DD HH:MM JST
>
> ⚠️ 記載前に必ず以下の順序で実行すること（AIメモリ禁止）:
>
> 1. **MCP優先**: `mcp__context7__resolve-library-id` → `mcp__context7__query-docs` で最新ドキュメント取得
> 2. **MCP補完**: package-version-check MCP で最新安定版バージョンを照会
> 3. **フォールバック**: 上記で取得できない場合のみ WebSearch（`"<pkg> latest stable version YYYY"`）

| 技術    | 採用バージョン | 調査時の最新 | 確認方法 | LTS/EOL | 既知問題 |
| ------- | -------------- | ------------ | -------- | ------- | -------- |
| Example | 1.2.3          | 1.2.3        | context7 | LTS     | なし     |

**バージョンロックルール**:

- このテーブルのバージョンが「プロジェクト内の真実」。実装中にAIが別バージョンを提案しても、このテーブルを優先する
- 変更時: 再調査 + Decision Log に記録必須
- **鮮度管理**: ExecPlan着手時に調査日を確認し、**4週間以上**経過している場合は再調査を実施してから着手する

---

## Plan of Work

### Step 1: [ステップ名]

- [ ] 詳細タスク 1
- [ ] 詳細タスク 2

### Step 2: [ステップ名]

- [ ] 詳細タスク 1

---

## State Transitions（状態遷移がある場合のみ）

> 予約・決済・ステータス管理など状態遷移を伴う設計では必須。
> TASK-0005（予約並行制御）で 3R、TASK-0006（チケット消化タイミング）で 2R を要した原因は、
> 状態遷移を最初から表形式で書いていなかったこと。

| 現在の状態  | アクション   | 次の状態    | 副作用       | 備考      |
| ----------- | ------------ | ----------- | ------------ | --------- |
| `draft`     | `confirm()`  | `confirmed` | メール送信   |           |
| `confirmed` | `cancel()`   | `cancelled` | 返金処理     | 24h前まで |
| `confirmed` | `complete()` | `completed` | チケット消化 |           |

---

## External API Failure Cases（外部 API 呼び出しがある場合のみ）

> 外部 API を呼ぶ Step がある場合、失敗ケースの分岐を事前に列挙すること。
> TASK-0006 Gate 2 で「課金済みチケット未発行」が High で 3R かかった原因は、
> 失敗ケースの分岐を十分に列挙していなかったこと。

| ステップ     | 失敗箇所                          | DB 状態                  | Provider 状態   | 補償アクション       |
| ------------ | --------------------------------- | ------------------------ | --------------- | -------------------- |
| Step 3: 決済 | Stripe API タイムアウト           | `payment_status=pending` | charge 未作成   | リトライ（最大3回）  |
| Step 3: 決済 | Stripe API 成功 → DB 書き込み失敗 | `payment_status=pending` | charge 作成済み | Stripe refund + ログ |

---

## Progress

### YYYY-MM-DD (Actor)

- 進捗メモ

---

## Decision Log

### YYYY-MM-DD (Actor)

**判断**: [何を決めたか]

**根拠**: [なぜそうしたか]

**Drawbacks（このアプローチのデメリット）**:

- デメリット1
- デメリット2

**Unresolved Questions（未解決の論点）**:

- [ ] 論点1（次タスクで解決予定）
- [ ] 論点2

---

## Validation & Acceptance

### DoD 一覧（Atomic Predicate 形式）

> 1 DoD = 1 predicate。各 DoD に「条件文 / 証拠コマンド / Pass 基準」を必ず持たせる。
>
> Gate 1 ルール:
>
> - 存在・登録・単純文字列確認は `grep` / `ls` / `jq` でよい
> - `同一 payload` / `同一分岐` / `retry` / `callback` / `side effect` は `grep` 禁止
> - 上記は verify script または smoke test に切り替える

**D-01** — [状態で書く。例: `config.json` に `feature_x` が `true` で定義されている]

証拠コマンド:

```bash
# 例:
# jq -e '.feature_x == true' /abs/path/to/config.json
```

Pass 基準: exit code 0

---

**D-02** — [別の predicate を 1 つだけ書く]

証拠コマンド:

```bash
# 例:
# bash /abs/path/to/scripts/test-feature-x-smoke.sh
```

Pass 基準: exit code 0

### Evidence 選定メモ

- 存在証明: `ls`, `grep`, `jq`
- 削除・置換証明: 正/負の `grep`, `git log -- <path>`
- 構造証明: `jq`, `yq`
- same payload / same branch / behavior 証明: verify script / smoke test
- repo-wide 走査は、要件自体が repo-wide の時だけ許可

### テストコマンド

```bash
# テスト実行コマンド
```

### 提出前セルフチェック

```text
[ ] 1. 全 DoD 条件に Evidence コマンドが 1 対 1 で紐付いている
[ ] 2. Evidence コマンドが絶対パスで、false positive を起こしにくい
[ ] 3. 条件に主観語が残っていない
[ ] 4. 複数条件を 1 文に束ねていない
[ ] 5. Scope の In Scope 全項目が Step・DoD・Evidence に対応している
[ ] 6. same payload / same branch / behavior は grep ではなく script で証明している
```

---

## Manual Operations（手動操作依存順序）

> **このセクションは外部サービス連携・ユーザー操作を含むタスクにのみ記載する。全自動タスクは省略可。**
>
> ルール:
>
> - 受信側（Webhook/ログ/DB）→ 設定（URL登録・環境変数）→ 送信側（ユーザーアクション）の順で番号を振る
> - `[⚠️ 1回限り]` の操作は、受信側が稼働するまで実行させてはならない
> - Claude 実装タスク（Worker デプロイ等）は、手動操作の案内より前に完了させること

| 順序 | 操作                 | 実行者 | 前提    | 備考                          |
| ---- | -------------------- | ------ | ------- | ----------------------------- |
| 1    | [受信側セットアップ] | Claude | なし    | 受信側を先に立てる            |
| 2    | [設定・登録]         | 人間   | 1完了後 |                               |
| 3    | [ユーザーアクション] | 人間   | 2完了後 | [⚠️ 1回限り] ← 該当時のみ付与 |

---

## Risks & Mitigations

| リスク | 影響度 | 対策         |
| ------ | ------ | ------------ |
| Risk 1 | High   | Mitigation 1 |

---

## Notes

追加メモ
