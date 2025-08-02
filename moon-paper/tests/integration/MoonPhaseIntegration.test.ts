/**
 * 月相計算器統合テスト
 * SuperSerena Development - SPARC TDD
 * 実際の天文データとの照合テスト
 */

import { MoonPhaseCalculator } from '../../src/core/moon-calculator/MoonPhaseCalculator';
import { MOON_PHASE_NAMES, MOON_CONSTANTS } from '../../src/shared/constants';

describe('MoonPhaseCalculator Integration Tests', () => {
  let calculator: MoonPhaseCalculator;

  beforeEach(() => {
    calculator = new MoonPhaseCalculator();
  });

  afterEach(() => {
    calculator.clearCache();
  });

  describe('実データ照合テスト', () => {
    test('2025年の既知の月相データとの照合', async () => {
      // 実際の天文データとの照合
      const knownMoonPhases = [
        { 
          date: new Date('2025-01-13T22:27:00+09:00'), 
          type: 'full',
          expectedName: MOON_PHASE_NAMES.ja.FULL_MOON,
          minIllumination: 95
        },
        { 
          date: new Date('2025-01-29T12:36:00+09:00'), 
          type: 'new',
          expectedName: MOON_PHASE_NAMES.ja.NEW_MOON,
          maxIllumination: 5
        },
        { 
          date: new Date('2025-02-12T14:53:00+09:00'), 
          type: 'full',
          expectedName: MOON_PHASE_NAMES.ja.FULL_MOON,
          minIllumination: 95
        },
        { 
          date: new Date('2025-02-28T09:45:00+09:00'), 
          type: 'new',
          expectedName: MOON_PHASE_NAMES.ja.NEW_MOON,
          maxIllumination: 5
        },
        { 
          date: new Date('2025-03-14T07:55:00+09:00'), 
          type: 'full',
          expectedName: MOON_PHASE_NAMES.ja.FULL_MOON,
          minIllumination: 95
        },
      ];

      for (const known of knownMoonPhases) {
        const moonPhase = await calculator.calculateMoonPhase(known.date);
        
        expect(moonPhase.phaseName).toBe(known.expectedName);
        
        if (known.type === 'full') {
          expect(moonPhase.illumination).toBeGreaterThan(known.minIllumination);
        } else if (known.type === 'new') {
          expect(moonPhase.illumination).toBeLessThan(known.maxIllumination);
        }
      }
    });

    test('上弦・下弦の月の精度確認', async () => {
      const quarterMoons = [
        { 
          date: new Date('2025-01-06T23:56:00+09:00'), // 上弦
          type: 'first_quarter',
          expectedName: MOON_PHASE_NAMES.ja.FIRST_QUARTER,
          expectedIllumination: { min: 45, max: 55 }
        },
        { 
          date: new Date('2025-01-21T22:31:00+09:00'), // 下弦
          type: 'last_quarter',
          expectedName: MOON_PHASE_NAMES.ja.LAST_QUARTER,
          expectedIllumination: { min: 45, max: 55 }
        },
      ];

      for (const quarter of quarterMoons) {
        const moonPhase = await calculator.calculateMoonPhase(quarter.date);
        
        expect(moonPhase.phaseName).toBe(quarter.expectedName);
        expect(moonPhase.illumination).toBeGreaterThan(quarter.expectedIllumination.min);
        expect(moonPhase.illumination).toBeLessThan(quarter.expectedIllumination.max);
      }
    });
  });

  describe('長期精度テスト', () => {
    test('1年間の月相サイクル整合性', async () => {
      const startDate = new Date('2025-01-01T00:00:00+09:00');
      const endDate = new Date('2025-12-31T23:59:59+09:00');
      
      const cycle = await calculator.calculateLunarCycle(startDate, endDate, 24 * 7); // 1週間ごと
      
      // 年間の統計
      const fullMoons = cycle.filter(p => p.phaseName === MOON_PHASE_NAMES.ja.FULL_MOON);
      const newMoons = cycle.filter(p => p.phaseName === MOON_PHASE_NAMES.ja.NEW_MOON);
      
      // 年間約13回の新月と満月（週間サンプリングなので少ない）
      expect(fullMoons.length).toBeGreaterThan(5);
      expect(fullMoons.length).toBeLessThan(16);
      expect(newMoons.length).toBeGreaterThan(5);
      expect(newMoons.length).toBeLessThan(16);
      
      // 月齢の連続性チェック
      for (let i = 1; i < cycle.length; i++) {
        const prev = cycle[i - 1];
        const curr = cycle[i];
        
        // 1週間後の月齢差は約7日（ただし月末で巻き戻りがある場合もある）
        let ageDiff = curr.moonAge - prev.moonAge;
        // 月末の巻き戻りを考慮
        if (ageDiff < 0) {
          ageDiff += MOON_CONSTANTS.SYNODIC_MONTH;
        }
        expect(ageDiff).toBeGreaterThan(5);
        expect(ageDiff).toBeLessThan(10);
      }
    });

    test('複数年にわたる計算精度', async () => {
      const testYears = [2023, 2024, 2025, 2026, 2027];
      
      for (const year of testYears) {
        // 各年の中間点で計算
        const midYear = new Date(`${year}-07-01T12:00:00+09:00`);
        const moonPhase = await calculator.calculateMoonPhase(midYear);
        
        expect(moonPhase.moonAge).toBeGreaterThanOrEqual(0);
        expect(moonPhase.moonAge).toBeLessThan(30);
        expect(moonPhase.illumination).toBeGreaterThanOrEqual(0);
        expect(moonPhase.illumination).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('極端ケーステスト', () => {
    test('計算範囲境界での精度', async () => {
      const boundaryDates = [
        new Date('1800-01-01T00:00:00+09:00'), // 計算範囲の開始
        new Date('2200-12-31T23:59:59+09:00'), // 計算範囲の終了
      ];

      for (const date of boundaryDates) {
        const moonPhase = await calculator.calculateMoonPhase(date);
        
        expect(moonPhase.moonAge).toBeGreaterThanOrEqual(0);
        expect(moonPhase.moonAge).toBeLessThan(30);
        expect(moonPhase.phaseName).toBeDefined();
        expect(Object.values(MOON_PHASE_NAMES.ja)).toContain(moonPhase.phaseName);
      }
    });

    test('タイムゾーン跨ぎでの一貫性', async () => {
      // 同じ瞬間の異なるタイムゾーン表現
      const utcDate = new Date('2025-06-15T15:00:00Z');
      const jstDate = new Date('2025-06-16T00:00:00+09:00'); // 同じ瞬間
      
      const utcMoonPhase = await calculator.calculateMoonPhase(utcDate);
      const jstMoonPhase = await calculator.calculateMoonPhase(jstDate);
      
      // 月齢は同じはず（小数点以下の誤差許容）
      expect(Math.abs(utcMoonPhase.moonAge - jstMoonPhase.moonAge)).toBeLessThan(0.01);
      expect(utcMoonPhase.phaseName).toBe(jstMoonPhase.phaseName);
    });

    test('高頻度計算での安定性', async () => {
      const baseDate = new Date('2025-06-15T12:00:00+09:00');
      const results: number[] = [];
      
      // 1分間隔で24時間分計算
      for (let minute = 0; minute < 24 * 60; minute++) {
        const testDate = new Date(baseDate.getTime() + minute * 60 * 1000);
        const moonAge = await calculator.calculateMoonAge(testDate);
        results.push(moonAge);
      }
      
      // 24時間での月齢変化は約0.8日
      const minAge = Math.min(...results);
      const maxAge = Math.max(...results);
      const ageRange = maxAge - minAge;
      
      expect(ageRange).toBeGreaterThan(0.7);
      expect(ageRange).toBeLessThan(1.0);
      
      // 単調増加（または月末での巻き戻り）
      let monotonic = true;
      for (let i = 1; i < results.length; i++) {
        const diff = results[i] - results[i - 1];
        if (diff < -20 && diff > -30) {
          // 月末の巻き戻しは正常
          continue;
        }
        if (diff < 0) {
          monotonic = false;
          break;
        }
      }
      expect(monotonic).toBe(true);
    });
  });

  describe('パフォーマンス統合テスト', () => {
    test('大量計算のメモリ効率性', async () => {
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      // 1000回の計算
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 1000; i++) {
        const testDate = new Date(2025, 0, 1 + i);
        promises.push(calculator.calculateMoonAge(testDate));
      }
      
      await Promise.all(promises);
      
      // ガベージコレクション
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // 10MB以内の増加
      expect(memoryIncrease).toBeLessThan(10);
    });

    test('キャッシュ効率性', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      // 初回計算（キャッシュなし）
      const start1 = performance.now();
      await calculator.calculateMoonPhase(testDate);
      const duration1 = performance.now() - start1;
      
      // 2回目計算（キャッシュ使用）
      const start2 = performance.now();
      await calculator.calculateMoonPhase(testDate);
      const duration2 = performance.now() - start2;
      
      // キャッシュにより高速化
      expect(duration2).toBeLessThan(duration1 * 0.5);
    });

    test('並列計算での性能', async () => {
      const concurrency = 50;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, (_, i) => {
        const testDate = new Date(2025, 0, 1 + i);
        return calculator.calculateMoonPhase(testDate);
      });
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrency);
      expect(totalTime).toBeLessThan(5000); // 5秒以内
      
      // 全結果が有効
      results.forEach(result => {
        expect(result.moonAge).toBeGreaterThanOrEqual(0);
        expect(result.moonAge).toBeLessThan(30);
      });
    });
  });

  describe('エラー回復テスト', () => {
    test('部分的な計算失敗からの回復', async () => {
      // 有効な日付と無効な日付を混在
      const dates = [
        new Date('2025-01-01T00:00:00+09:00'), // 有効
        new Date('invalid'), // 無効
        new Date('2025-01-02T00:00:00+09:00'), // 有効
        new Date('2025-01-03T00:00:00+09:00'), // 有効
      ];
      
      const results = await Promise.allSettled(
        dates.map(date => calculator.calculateMoonPhase(date))
      );
      
      // 有効な日付の計算は成功
      expect(results[0].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('fulfilled');
      
      // 無効な日付の計算は失敗
      expect(results[1].status).toBe('rejected');
    });

    test('設定変更による影響の分離', () => {
      const calculator1 = new MoonPhaseCalculator({ enableCache: true });
      const calculator2 = new MoonPhaseCalculator({ enableCache: false });
      
      expect(calculator1.getStatistics().cacheSize).toBe(0);
      expect(calculator2.getStatistics().cacheSize).toBe(0);
      
      // 設定が独立していることを確認
      const stats1 = calculator1.getStatistics();
      const stats2 = calculator2.getStatistics();
      
      expect(typeof stats1.cacheSize).toBe('number');
      expect(typeof stats2.cacheSize).toBe('number');
    });
  });

  describe('API互換性テスト', () => {
    test('非同期APIの一貫性', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      
      // 全ての非同期メソッドがPromiseを返す
      expect(calculator.calculateMoonPhase(testDate)).toBeInstanceOf(Promise);
      expect(calculator.calculateMoonAge(testDate)).toBeInstanceOf(Promise);
      expect(calculator.getNextFullMoon(testDate)).toBeInstanceOf(Promise);
      expect(calculator.getNextNewMoon(testDate)).toBeInstanceOf(Promise);
    });

    test('同期APIの一貫性', () => {
      const testMoonAge = 15.5;
      
      // 同期メソッドは即座に結果を返す
      const illumination = calculator.calculateIllumination(testMoonAge);
      const phaseNameJa = calculator.getMoonPhaseName(testMoonAge, 'ja');
      const phaseNameEn = calculator.getMoonPhaseName(testMoonAge, 'en');
      
      expect(typeof illumination).toBe('number');
      expect(typeof phaseNameJa).toBe('string');
      expect(typeof phaseNameEn).toBe('string');
    });

    test('結果オブジェクトの構造一貫性', async () => {
      const testDate = new Date('2025-06-15T12:00:00+09:00');
      const moonPhase = await calculator.calculateMoonPhase(testDate);
      
      // 必須プロパティの存在確認
      expect(moonPhase).toHaveProperty('moonAge');
      expect(moonPhase).toHaveProperty('phaseName');
      expect(moonPhase).toHaveProperty('phaseNameEn');
      expect(moonPhase).toHaveProperty('illumination');
      expect(moonPhase).toHaveProperty('calculatedAt');
      expect(moonPhase).toHaveProperty('nextFullMoon');
      expect(moonPhase).toHaveProperty('nextNewMoon');
      
      // 型の確認
      expect(typeof moonPhase.moonAge).toBe('number');
      expect(typeof moonPhase.phaseName).toBe('string');
      expect(typeof moonPhase.phaseNameEn).toBe('string');
      expect(typeof moonPhase.illumination).toBe('number');
      expect(moonPhase.calculatedAt).toBeInstanceOf(Date);
      expect(moonPhase.nextFullMoon).toBeInstanceOf(Date);
      expect(moonPhase.nextNewMoon).toBeInstanceOf(Date);
    });
  });
});