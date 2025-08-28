# 🧹 Avatar Cleanup: Remove Only Unnecessary File

## 📋 概要
不要なファイル1個のみを削除し、必須30ファイル（既存10＋新規20）をすべて保護

## ✅ 必須30ファイル（削除対象から除外）

### 既存10ファイル（すべて存在✅）
```
✅ smaichan.png          # ベース版 - 常に保持
✅ smaichan_happy.png
✅ smaichan_excited.png
✅ smaichan_surprised.png
✅ smaichan_confused.png
✅ smaichan_thinking.png
✅ smaichan_sleepy.png
✅ smaichan_wink.png
✅ smaichan_shy.png
✅ smaichan_motivated.png
```

### 新規20ファイル（アップロード待ち）
```
❌ smaichan_laughing.png    ❌ smaichan_cool.png
✅ smaichan_angry.png       ❌ smaichan_sad.png
❌ smaichan_love.png        ❌ smaichan_star_eyes.png
❌ smaichan_peace.png       ❌ smaichan_determined.png
❌ smaichan_playful.png     ❌ smaichan_worried.png
❌ smaichan_proud.png       ❌ smaichan_curious.png
❌ smaichan_grateful.png    ❌ smaichan_confident.png
❌ smaichan_focused.png     ❌ smaichan_embarrassed.png
❌ smaichan_relaxed.png     ❌ smaichan_mischievous.png
❌ smaichan_supportive.png  ❌ smaichan_sparkle.png
```

## 🗑️ 削除ファイル (1ファイルのみ)
- `ChatGPT Image 2025年8月24日 21_47_50.png` - 不適切な命名のファイル

## 🛡️ セーフティガード
- ✅ `smaichan.png` は常に保護（ハードコード）
- ✅ 必須30ファイルは削除対象から自動除外
- ✅ PRに必須ファイルが含まれている場合は `do-not-merge` ラベルを追加

## 🔍 検証スクリプト（30ファイル版）

デプロイ後、ブラウザコンソールで実行：

```javascript
// 30 Required Files Verification
(async function verifyAvatars() {
  const REQUIRED = [
    // Existing 10
    'smaichan.png', 'smaichan_happy.png', 'smaichan_excited.png',
    'smaichan_surprised.png', 'smaichan_confused.png', 'smaichan_thinking.png',
    'smaichan_sleepy.png', 'smaichan_wink.png', 'smaichan_shy.png', 'smaichan_motivated.png',
    // New 20
    'smaichan_laughing.png', 'smaichan_cool.png', 'smaichan_angry.png',
    'smaichan_sad.png', 'smaichan_love.png', 'smaichan_star_eyes.png',
    'smaichan_peace.png', 'smaichan_determined.png', 'smaichan_playful.png',
    'smaichan_worried.png', 'smaichan_proud.png', 'smaichan_curious.png',
    'smaichan_grateful.png', 'smaichan_confident.png', 'smaichan_focused.png',
    'smaichan_embarrassed.png', 'smaichan_relaxed.png', 'smaichan_mischievous.png',
    'smaichan_supportive.png', 'smaichan_sparkle.png'
  ];
  
  console.log(`🔍 Checking ${REQUIRED.length} required files...`);
  const results = await Promise.all(
    REQUIRED.map(async f => {
      const r = await fetch(`${location.origin}/logo/${f}`, {method:'HEAD'});
      return {
        File: f,
        Status: r.status,
        Result: r.ok ? '✅' : '❌',
        Category: [
          'smaichan.png', 'smaichan_happy.png', 'smaichan_excited.png',
          'smaichan_surprised.png', 'smaichan_confused.png', 'smaichan_thinking.png',
          'smaichan_sleepy.png', 'smaichan_wink.png', 'smaichan_shy.png', 'smaichan_motivated.png'
        ].includes(f) ? 'Existing' : 'New'
      };
    })
  );
  
  console.table(results);
  
  const existing = results.filter(r => r.Category === 'Existing');
  const newFiles = results.filter(r => r.Category === 'New');
  
  console.log('\n📊 Summary:');
  console.log(`Existing: ${existing.filter(r => r.Result === '✅').length}/10`);
  console.log(`New: ${newFiles.filter(r => r.Result === '✅').length}/20`);
  console.log(`Total: ${results.filter(r => r.Result === '✅').length}/30`);
  
  if (results.filter(r => r.Result === '✅').length === 30) {
    console.log('🎉 All 30 required files present!');
  } else {
    const missing = results.filter(r => r.Result === '❌');
    console.log(`\n❌ Missing ${missing.length} files:`);
    missing.forEach(r => console.log(`  - ${r.File}`));
  }
})();
```

## 📝 チェックリスト
- [x] 不要ファイル（ChatGPT Image）の削除
- [x] 必須30ファイルの保護確認
- [x] セーフティガードの実装
- [ ] Deploy Previewでの動作確認
- [ ] 検証スクリプトの実行（30ファイル基準）

## 🔧 管理スクリプト
```bash
# 現在の状態確認（30ファイル基準）
./scripts/avatar-management.sh check

# セーフティチェック
./scripts/avatar-management.sh safety

# 検証スクリプト表示
./scripts/avatar-management.sh verify
```

## 📌 注意事項
- このPRは必須ファイルを削除しないことを確認済み
- `do-not-merge` ラベルは不要（必須ファイルが含まれていないため）
- 新規20ファイルはWeb UIでアップロード後に追加予定