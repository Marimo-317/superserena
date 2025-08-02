/**
 * テストセットアップファイル
 * SuperSerena Development - SPARC TDD
 */

// グローバルテスト設定
global.gc = global.gc || (() => {});

// タイムゾーン設定
process.env.TZ = 'Asia/Tokyo';

// Jest設定
jest.setTimeout(30000);

// エラーハンドリング設定
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// パフォーマンス監視
if (typeof global.performance === 'undefined') {
  global.performance = require('perf_hooks').performance;
}

// メモリ使用量ヘルパー
global.getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  return { heapUsed: 0, heapTotal: 0 };
};

// テスト前後の共通処理
beforeEach(() => {
  // キャッシュクリア等
});

afterEach(() => {
  // リソースクリーンアップ
});