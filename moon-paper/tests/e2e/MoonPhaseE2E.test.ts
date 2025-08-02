/**
 * 月相計算器 E2Eテスト
 * SuperSerena Development - SPARC TDD
 * エンドツーエンドシナリオテスト
 */

import { MoonPhaseCalculator } from '../../src/core/moon-calculator/MoonPhaseCalculator';
import { MOON_PHASE_NAMES, PERFORMANCE_TARGETS } from '../../src/shared/constants';
import { MoonPhase } from '../../src/shared/types';

describe('MoonPhaseCalculator E2E Tests', () => {
  let calculator: MoonPhaseCalculator;

  beforeEach(() => {
    calculator = new MoonPhaseCalculator();
  });

  afterEach(() => {
    calculator.clearCache();
  });

  describe('ユーザーシナリオテスト', () => {
    test('シナリオ1: 今日の月相を調べる', async () => {
      // ユーザーが今日の月相を調べる一般的なフロー
      const today = new Date();
      
      const moonPhase = await calculator.calculateMoonPhase(today);
      
      // 結果が完全に取得できること
      expect(moonPhase).toBeDefined();
      expect(moonPhase.phaseName).toBeDefined();
      expect(moonPhase.phaseNameEn).toBeDefined();
      expect(moonPhase.illumination).toBeGreaterThanOrEqual(0);
      expect(moonPhase.illumination).toBeLessThanOrEqual(100);
      expect(moonPhase.nextFullMoon).toBeInstanceOf(Date);
      expect(moonPhase.nextNewMoon).toBeInstanceOf(Date);
      
      // 次の満月と新月が未来であること
      expect(moonPhase.nextFullMoon.getTime()).toBeGreaterThan(today.getTime());
      expect(moonPhase.nextNewMoon.getTime()).toBeGreaterThan(today.getTime());
      
      console.log(`今日の月相: ${moonPhase.phaseName} (${moonPhase.phaseNameEn})`);
      console.log(`照度: ${moonPhase.illumination.toFixed(1)}%`);
      console.log(`次の満月: ${moonPhase.nextFullMoon.toLocaleDateString('ja-JP')}`);
      console.log(`次の新月: ${moonPhase.nextNewMoon.toLocaleDateString('ja-JP')}`);
    });

    test('シナリオ2: 特定の日の月相を調べる', async () => {
      // ユーザーが誕生日などの特定の日の月相を調べる
      const specialDate = new Date('2025-12-25T00:00:00+09:00'); // クリスマス
      
      const moonPhase = await calculator.calculateMoonPhase(specialDate);
      
      expect(moonPhase).toBeDefined();
      expect(Object.values(MOON_PHASE_NAMES.ja)).toContain(moonPhase.phaseName);
      expect(Object.values(MOON_PHASE_NAMES.en)).toContain(moonPhase.phaseNameEn);
      
      console.log(`2025年クリスマスの月相: ${moonPhase.phaseName}`);
    });

    test('シナリオ3: 次の満月がいつか調べる', async () => {
      // ユーザーが次の満月の日程を調べる
      const today = new Date();
      
      const nextFullMoon = await calculator.getNextFullMoon(today);
      const moonPhaseAtFullMoon = await calculator.calculateMoonPhase(nextFullMoon);
      
      expect(nextFullMoon).toBeInstanceOf(Date);
      expect(nextFullMoon.getTime()).toBeGreaterThan(today.getTime());
      expect(moonPhaseAtFullMoon.phaseName).toBe(MOON_PHASE_NAMES.ja.FULL_MOON);
      expect(moonPhaseAtFullMoon.illumination).toBeGreaterThan(95);
      
      const daysUntilFullMoon = Math.ceil((nextFullMoon.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`次の満月まで: ${daysUntilFullMoon}日`);
    });

    test('シナリオ4: 1ヶ月間の月相変化を追跡', async () => {
      // ユーザーが1ヶ月間の月相変化を追跡する
      const startDate = new Date('2025-06-01T00:00:00+09:00');
      const endDate = new Date('2025-06-30T23:59:59+09:00');
      
      const lunarCycle = await calculator.calculateLunarCycle(startDate, endDate, 24);
      
      expect(lunarCycle.length).toBeGreaterThan(25); // 30日分
      expect(lunarCycle.length).toBeLessThanOrEqual(30);
      
      // 新月から満月への変化を確認
      const newMoons = lunarCycle.filter(p => p.phaseName === MOON_PHASE_NAMES.ja.NEW_MOON);
      const fullMoons = lunarCycle.filter(p => p.phaseName === MOON_PHASE_NAMES.ja.FULL_MOON);
      
      expect(newMoons.length + fullMoons.length).toBeGreaterThan(0);
      
      console.log(`6月の新月: ${newMoons.length}回, 満月: ${fullMoons.length}回`);
    });

    test('シナリオ5: 年間の主要月相予測', async () => {
      // ユーザーが1年間の主要月相イベントを予測
      const startOfYear = new Date('2025-01-01T00:00:00+09:00');
      
      const majorPhases = await calculator.predictMajorPhases(startOfYear, 48); // 1年分
      
      expect(majorPhases.length).toBe(48);
      
      // 各月相タイプが均等に含まれること
      const phaseTypes = majorPhases.map(p => p.phase);
      const newMoons = phaseTypes.filter(p => p === 'new').length;
      const fullMoons = phaseTypes.filter(p => p === 'full').length;
      
      expect(newMoons).toBe(12); // 年間12回の新月
      expect(fullMoons).toBe(12); // 年間12回の満月
      
      console.log(`2025年の新月・満月予測完了: 新月${newMoons}回, 満月${fullMoons}回`);
    });
  });

  describe('パフォーマンスシナリオテスト', () => {
    test('リアルタイム計算シナリオ', async () => {
      // アプリがリアルタイムで月相を表示するシナリオ
      const startTime = performance.now();
      
      const currentMoonPhase = await calculator.calculateMoonPhase(new Date());
      
      const calculationTime = performance.now() - startTime;
      
      // パフォーマンス要件を満たすこと
      expect(calculationTime).toBeLessThan(PERFORMANCE_TARGETS.MAX_CALCULATION_TIME);
      
      // 結果が完全であること
      expect(currentMoonPhase).toBeDefined();
      expect(currentMoonPhase.moonAge).toBeGreaterThanOrEqual(0);
      expect(currentMoonPhase.moonAge).toBeLessThan(30);
      
      console.log(`リアルタイム計算時間: ${calculationTime.toFixed(2)}ms`);
    });

    test('大量データ処理シナリオ', async () => {
      // アプリが大量の日付データを処理するシナリオ
      const dates: Date[] = [];
      for (let i = 0; i < 365; i++) {
        dates.push(new Date(2025, 0, 1 + i));
      }
      
      const startTime = performance.now();
      const results = await calculator.calculateMoonPhaseBatch(dates);
      const totalTime = performance.now() - startTime;
      
      expect(results.length).toBe(365);
      expect(totalTime).toBeLessThan(10000); // 10秒以内
      
      // 全結果が有効であること
      results.forEach(result => {
        expect(result.moonAge).toBeGreaterThanOrEqual(0);
        expect(result.moonAge).toBeLessThan(30);
      });
      
      const avgTime = totalTime / dates.length;
      console.log(`大量処理: 365日分を${totalTime.toFixed(2)}ms (平均${avgTime.toFixed(2)}ms/件)`);
    });

    test('キャッシュ活用シナリオ', async () => {
      // 同じ日付を複数回計算するシナリオ（キャッシュ効果）
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      // 初回計算
      const start1 = performance.now();
      const result1 = await calculator.calculateMoonPhase(testDate);
      const time1 = performance.now() - start1;
      
      // 2回目計算（キャッシュヒット）
      const start2 = performance.now();
      const result2 = await calculator.calculateMoonPhase(testDate);
      const time2 = performance.now() - start2;
      
      // 結果が同一であること
      expect(result1.moonAge).toBeCloseTo(result2.moonAge, 10);
      expect(result1.phaseName).toBe(result2.phaseName);
      
      // キャッシュにより高速化されること
      expect(time2).toBeLessThan(time1 * 0.8);
      
      console.log(`キャッシュ効果: ${time1.toFixed(2)}ms → ${time2.toFixed(2)}ms (${((1 - time2/time1) * 100).toFixed(1)}% 短縮)`);
    });
  });

  describe('エラーシナリオテスト', () => {
    test('無効な入力でのエラーハンドリング', async () => {
      // ユーザーが無効な日付を入力した場合
      const invalidInputs = [
        null,
        undefined,
        new Date('invalid'),
        new Date(''),
        new Date(NaN),
      ];
      
      for (const input of invalidInputs) {
        await expect(calculator.calculateMoonPhase(input as any))
          .rejects.toThrow();
      }
    });

    test('範囲外日付でのエラーハンドリング', async () => {
      // 計算範囲外の日付
      const outOfRangeDates = [
        new Date('1700-01-01T00:00:00+09:00'), // 過去すぎる
        new Date('2300-01-01T00:00:00+09:00'), // 未来すぎる
      ];
      
      for (const date of outOfRangeDates) {
        await expect(calculator.calculateMoonPhase(date))
          .rejects.toThrow();
      }
    });

    test('ネットワーク問題シミュレーション', async () => {
      // 実際にはローカル計算なので常に成功するはず
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      const result = await calculator.calculateMoonPhase(testDate);
      expect(result).toBeDefined();
      expect(result.moonAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('設定シナリオテスト', () => {
    test('高精度モードシナリオ', async () => {
      // 高精度計算が必要なシナリオ
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      const highPrecisionResult = await calculator.calculateMoonPhaseHighPrecision(testDate);
      
      expect(highPrecisionResult).toHaveProperty('accuracy');
      expect(highPrecisionResult.accuracy).toBeGreaterThan(0.9);
      expect(highPrecisionResult.moonAge).toBeGreaterThanOrEqual(0);
      expect(highPrecisionResult.moonAge).toBeLessThan(30);
      
      console.log(`高精度モード: 精度${(highPrecisionResult.accuracy * 100).toFixed(2)}%`);
    });

    test('詳細情報付き計算シナリオ', async () => {
      // デバッグや詳細情報が必要なシナリオ
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      const detailedResult = await calculator.calculateMoonPhaseWithDetails(testDate);
      
      expect(detailedResult).toHaveProperty('moonPhase');
      expect(detailedResult).toHaveProperty('performance');
      expect(detailedResult).toHaveProperty('julianDay');
      expect(detailedResult).toHaveProperty('phaseAngle');
      
      expect(detailedResult.performance.duration).toBeLessThan(PERFORMANCE_TARGETS.MAX_CALCULATION_TIME);
      expect(detailedResult.julianDay).toBeGreaterThan(2000000); // 現代のユリウス日
      expect(detailedResult.phaseAngle).toBeGreaterThanOrEqual(0);
      expect(detailedResult.phaseAngle).toBeLessThan(360);
      
      console.log(`詳細計算: ${detailedResult.performance.duration.toFixed(2)}ms, JD=${detailedResult.julianDay.toFixed(2)}`);
    });

    test('カスタム設定での計算シナリオ', async () => {
      // ユーザーがカスタム設定で計算する
      const customCalculator = new MoonPhaseCalculator({
        timezone: 'UTC',
        tolerance: 0.25,
        enableCache: false,
        optimizationLevel: 'accurate',
      });
      
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      const result = await customCalculator.calculateMoonPhase(testDate);
      
      expect(result).toBeDefined();
      expect(result.moonAge).toBeGreaterThanOrEqual(0);
      expect(result.moonAge).toBeLessThan(30);
      
      // 設定が反映されていることを確認
      const stats = customCalculator.getStatistics();
      expect(stats.cacheSize).toBe(0); // キャッシュ無効
      
      customCalculator.clearCache();
    });
  });

  describe('多言語対応シナリオテスト', () => {
    test('日本語表示シナリオ', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      const moonPhase = await calculator.calculateMoonPhase(testDate);
      
      // 日本語の月相名が正しく取得できること
      expect(Object.values(MOON_PHASE_NAMES.ja)).toContain(moonPhase.phaseName);
      
      // 日本語月相名の形式チェック
      const japanesePhaseNames = [
        '新月', '三日月', '上弦の月', '十三夜月',
        '満月', '十八夜月', '下弦の月', '有明月'
      ];
      expect(japanesePhaseNames).toContain(moonPhase.phaseName);
    });

    test('英語表示シナリオ', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      const moonPhase = await calculator.calculateMoonPhase(testDate);
      
      // 英語の月相名が正しく取得できること
      expect(Object.values(MOON_PHASE_NAMES.en)).toContain(moonPhase.phaseNameEn);
      
      // 英語月相名の形式チェック
      const englishPhaseNames = [
        'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'
      ];
      expect(englishPhaseNames).toContain(moonPhase.phaseNameEn);
    });

    test('多言語一貫性シナリオ', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      const moonAge = await calculator.calculateMoonAge(testDate);
      
      const japanesePhase = calculator.getMoonPhaseName(moonAge, 'ja');
      const englishPhase = calculator.getMoonPhaseName(moonAge, 'en');
      
      // 同じ月齢に対して対応する月相名が取得されること
      const phaseMapping: Record<string, string> = {
        [MOON_PHASE_NAMES.ja.NEW_MOON]: MOON_PHASE_NAMES.en.NEW_MOON,
        [MOON_PHASE_NAMES.ja.WAXING_CRESCENT]: MOON_PHASE_NAMES.en.WAXING_CRESCENT,
        [MOON_PHASE_NAMES.ja.FIRST_QUARTER]: MOON_PHASE_NAMES.en.FIRST_QUARTER,
        [MOON_PHASE_NAMES.ja.WAXING_GIBBOUS]: MOON_PHASE_NAMES.en.WAXING_GIBBOUS,
        [MOON_PHASE_NAMES.ja.FULL_MOON]: MOON_PHASE_NAMES.en.FULL_MOON,
        [MOON_PHASE_NAMES.ja.WANING_GIBBOUS]: MOON_PHASE_NAMES.en.WANING_GIBBOUS,
        [MOON_PHASE_NAMES.ja.LAST_QUARTER]: MOON_PHASE_NAMES.en.LAST_QUARTER,
        [MOON_PHASE_NAMES.ja.WANING_CRESCENT]: MOON_PHASE_NAMES.en.WANING_CRESCENT,
      };
      
      expect(phaseMapping[japanesePhase]).toBe(englishPhase);
    });
  });

  describe('統計・監視シナリオテスト', () => {
    test('使用統計取得シナリオ', () => {
      const stats = calculator.getStatistics();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageCalculationTime');
      
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
      expect(typeof stats.averageCalculationTime).toBe('number');
      
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
      
      console.log(`統計情報: キャッシュサイズ=${stats.cacheSize}, 平均計算時間=${stats.averageCalculationTime.toFixed(2)}ms`);
    });

    test('メモリ使用量監視シナリオ', async () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // 大量計算実行
      const dates = Array.from({ length: 100 }, (_, i) => new Date(2025, 0, 1 + i));
      await calculator.calculateMoonPhaseBatch(dates);
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ使用量が許容範囲内であること
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
      
      console.log(`メモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});