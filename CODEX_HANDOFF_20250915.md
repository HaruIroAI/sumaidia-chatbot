# 🔄 Codex ハンドオフドキュメント
**日付**: 2025年9月15日
**From**: Claude Code
**To**: Codex
**プロジェクト**: SUMAIDIA HR評価システム

## 📌 現在の状況

### 石光社長からのフィードバック（9/15受領）
1. ✅ **実装したいことは実現できていそう** → 実データで確認したい
2. ✅ **評価者と被評価者で見れる内容を分ける** → 権限システム実装済み
3. ✅ **Web化で利便性向上** → 自動保存等の機能追加済み

### 9/17(水) 18:00 デモ予定
- 実データ（匿名2名分）での動作確認
- Excel計算結果との一致確認
- 3つのロール切替デモ

## 🎯 Codexへの依頼事項

### 1. ドメイン設計（最優先）

#### 評価エンティティ
```typescript
// 必要な型定義
interface Member {
  id: string;
  name: string;
  department: Department; // 9部門の一般職 or 7部門の管理職
  role: PositionRole; // KJ, KN等の役職
  evaluations: Evaluation[];
}

interface Evaluation {
  id: string;
  period: string; // "2024-09" ~ "2025-02"
  type: 'self' | 'superior' | 'peer';
  scores: EvaluationScore[];
  status: 'draft' | 'submitted' | 'locked';
}

interface EvaluationScore {
  categoryId: string; // 規律性、責任感等
  score: number; // 1-5
  comment?: string;
}
```

#### 配分ルール（重要）
```typescript
// KJ/KN役職の特殊計算
interface DistributionRule {
  role: 'KJ' | 'KN' | 'その他';
  baseScore: number;
  multiplier: number;
  monthlyAdjustment: number;
}

// 部門別の重み付け
interface DepartmentWeight {
  department: string;
  categories: {
    [categoryName: string]: number; // 重み
  };
}
```

### 2. Excel互換性の確保

#### 提供データの場所
```bash
# Excelファイル
/projects/sumaidia/SUMAIDIA提供データ/人事評価シート（集計用・ダミー用）.xlsx

# 解析済みJSON
/projects/sumaidia/hr-evaluation-system/data/
├── evaluation_structure.json  # 構造データ
├── evaluation_items.json      # 評価項目詳細
└── excel_analysis_result.json # 完全な解析結果
```

#### 必須テストケース
```typescript
describe('Excel互換性', () => {
  test('一般職員（営業部）の計算が一致', () => {
    // ダミーデータ1名目
    const input = loadExcelData('営業', 'member1');
    const result = calculateEvaluation(input);
    expect(result.total).toBe(excelExpectedValue);
  });

  test('管理職（TGL）の計算が一致', () => {
    // ダミーデータ2名目
    const input = loadExcelData('管理職_TGL', 'manager1');
    const result = calculateManagerEvaluation(input);
    expect(result.weighted).toBe(excelExpectedValue);
  });
});
```

### 3. 失敗ドメイン設計

#### 必須のエラーケース
```typescript
// domain/errors/evaluation-errors.ts
export enum EvaluationErrorCode {
  // 権限系
  PERMISSION_DENIED = 'E001',
  ROLE_MISMATCH = 'E002',
  
  // データ系
  INVALID_SCORE_RANGE = 'E101', // 1-5以外
  MISSING_REQUIRED_FIELD = 'E102',
  
  // 状態系
  ALREADY_LOCKED = 'E201',
  CONCURRENT_UPDATE = 'E202',
  
  // 計算系
  EXCEL_MISMATCH = 'E301', // Excel結果と不一致
  CALCULATION_OVERFLOW = 'E302',
}

// エラーからの復旧方法も定義
interface ErrorRecovery {
  code: EvaluationErrorCode;
  recoverable: boolean;
  suggestion: string;
  fallback?: () => void;
}
```

## 📂 利用可能なリソース

### Claude作成済みファイル
```
hr-evaluation-system/
├── types/user-roles.ts          # ロール定義（参考）
├── lib/auth-context.tsx         # 認証（UIレイヤー）
├── components/
│   ├── data/excel-import.tsx    # Excel UI（参考）
│   └── layout/role-switcher.tsx # ロール切替UI
└── app/data-management/page.tsx # データ管理画面
```

### データ解析結果
- **一般職**: 9部門 × 評価項目63種類
- **管理職**: 7シート × 大項目6カテゴリ
- **評価者**: 石田、辻の2名体制

## 🚀 作業手順

### Step 1: ブランチ作成
```bash
cd /Users/kamikoyuuichi/kamiko-independence/projects/sumaidia/hr-evaluation-system
git checkout main
git pull origin main
git checkout -b feature/arch-codex/hr-domain
```

### Step 2: ディレクトリ構造
```bash
mkdir -p src/domain/entities
mkdir -p src/domain/value-objects
mkdir -p src/domain/errors
mkdir -p src/domain/services
mkdir -p src/usecases
mkdir -p src/__tests__/domain
mkdir -p src/__tests__/usecases
```

### Step 3: 実装順序
1. エンティティ定義（Member, Evaluation）
2. 値オブジェクト（Score, Period）
3. エラー定義（全異常系）
4. 計算サービス（Excel互換ロジック）
5. ユースケース（配分計算、ロック処理）
6. テスト作成（2名分のExcel一致）

## ✅ 完了条件

### Definition of Done
- [ ] 型定義完了（no any型）
- [ ] 失敗ケース網羅（10種類以上）
- [ ] Excel計算一致（2名分）
- [ ] テストカバレッジ80%以上
- [ ] TSCエラー0
- [ ] Lintエラー0

### ハンドオフ時の成果物
```typescript
HANDOFF:: from=codex; to=claude;
  branch=feature/arch-codex/hr-domain;
  completed=[
    'ドメインモデル（10ファイル）',
    'Excel互換計算ロジック',
    '失敗ドメイン（15種類）',
    'ユニットテスト（20ケース）'
  ];
  todo=[
    'UIとドメインの接続',
    'エラー表示の実装',
    '非同期処理の追加'
  ];
  tests={
    unit: 20,
    excelCompatibility: 2,
    coverage: '82%'
  };
```

## 📞 質問・確認事項

不明点があれば以下を参照：
1. `CHANGES_LOG_20250915.md` - 本日の全変更内容
2. `data/evaluation_structure.json` - 評価構造
3. `DEMO_PREPARATION_0917.md` - デモ要件

---

**期限**: 9/16 午前中までにドメイン設計完了
**優先度**: Excel互換性 > 異常系 > その他