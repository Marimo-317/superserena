# 🐛 TypeScript型エラー: MoonPhaseCalculator.tsでMoonPhase型プロパティ不足

## 問題概要
`MoonPhaseCalculator.ts:60` でTypeScript型エラーが発生しています。

## エラー詳細
```
src/core/moon-calculator/MoonPhaseCalculator.ts(60,21): error TS2739: Type '{}' is missing the following properties from type 'MoonPhase': moonAge, phaseName, phaseNameEn, illumination, calculatedAt
```

## 発生箇所
```typescript
// line 59-60
const cached = this.getCachedResult(date, 'moonPhase');
if (cached) return cached; // ← ここで型エラー
```

## 原因分析
`getCachedResult` メソッドが空オブジェクト `{}` を返している可能性があります。
- `cache.get(key)` の戻り値が不正
- `MoonPhase` インターフェースの必須プロパティが不足

## 修正方針
1. `getCachedResult` メソッドの型安全性向上
2. キャッシュデータの検証機能追加
3. `MoonPhase` 型ガードの実装

## 環境情報
- TypeScript: 5.1.3
- Node.js: 24.4.1
- 影響範囲: 月相計算エンジンのキャッシュ機能

## 優先度
🔥 **High** - コンパイルエラーによりビルドが失敗

## 受け入れ基準
- [ ] TypeScriptコンパイルエラーの解消
- [ ] `npm run type-check` が成功
- [ ] 既存テストの通過維持
- [ ] キャッシュ機能の正常動作確認