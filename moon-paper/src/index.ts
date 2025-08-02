/**
 * 月相壁紙アプリ メインエクスポート
 * SuperSerena Development - SPARC Architecture
 */

// コアモジュール
export * from './core';

// 共有モジュール
export * from './shared';

// サーバーモジュール（今後実装予定）
// export * from './server';

// モバイルモジュール（今後実装予定）
// export * from './mobile';

// デフォルトエクスポート（月相計算器）
export { MoonPhaseCalculator as default } from './core/moon-calculator';