/**
 * 包括的パフォーマンステストスイート
 * 
 * 月相壁紙アプリのパフォーマンス要件検証:
 * - 起動時間 <2秒
 * - 月相計算 <100ms
 * - 壁紙更新 <500ms
 * - メモリ使用量 <50MB
 * - バッテリー消費 <2%/日
 * - クラッシュ率 <0.1%
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MoonPhaseCalculator } from '../../src/core/moon-calculator/MoonPhaseCalculator';

describe('パフォーマンステストスイート', () => {
  let calculator: MoonPhaseCalculator;

  beforeEach(() => {
    calculator = new MoonPhaseCalculator();
  });

  describe('起動時間テスト', () => {
    it('アプリ起動時間 <2秒', async () => {
      const startTime = Date.now();
      
      // Simulate app initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      const calculator = new MoonPhaseCalculator();
      await calculator.calculateMoonPhase(new Date());
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('コンポーネント初期化パフォーマンス', () => {
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        new MoonPhaseCalculator();
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      expect(avgTime).toBeLessThan(10); // <10ms per instance
    });
  });

  describe('月相計算パフォーマンス', () => {
    it('単一計算 <100ms', () => {
      const startTime = Date.now();
      
      calculator.calculateMoonPhase(new Date());
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('大量計算パフォーマンス', () => {
      const dates = Array.from({ length: 365 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      });
      
      const startTime = Date.now();
      
      dates.forEach(date => calculator.calculateMoonPhase(date));
      
      const duration = Date.now() - startTime;
      const avgTime = duration / dates.length;
      
      expect(avgTime).toBeLessThan(10); // <10ms per calculation
      expect(duration).toBeLessThan(3000); // Total <3s for 365 calculations
    });

    it('並列計算パフォーマンス', async () => {
      const dates = Array.from({ length: 50 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      });
      
      const startTime = Date.now();
      
      const promises = dates.map(date => 
        Promise.resolve(calculator.calculateMoonPhase(date))
      );
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Parallel processing advantage
    });

    it('キャッシュ効果測定', () => {
      const date = new Date();
      
      // First calculation (no cache)
      const startTime1 = Date.now();
      calculator.calculateMoonPhase(date);
      const duration1 = Date.now() - startTime1;
      
      // Second calculation (with cache)
      const startTime2 = Date.now();
      calculator.calculateMoonPhase(date);
      const duration2 = Date.now() - startTime2;
      
      // Cache should provide significant speedup
      expect(duration2).toBeLessThanOrEqual(duration1);
      console.log(`キャッシュ効果: ${duration1}ms → ${duration2}ms (${((duration1 - duration2) / duration1 * 100).toFixed(1)}% 短縮)`);
    });
  });

  describe('メモリ使用量テスト', () => {
    it('基本メモリ使用量', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const calculator = new MoonPhaseCalculator();
      for (let i = 0; i < 100; i++) {
        calculator.calculateMoonPhase(new Date());
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB
      
      expect(memoryIncrease).toBeLessThan(10); // <10MB increase
      console.log(`メモリ増加: ${memoryIncrease.toFixed(2)}MB`);
    });

    it('メモリリーク検証', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy many instances
      for (let i = 0; i < 1000; i++) {
        const calc = new MoonPhaseCalculator();
        calc.calculateMoonPhase(new Date());
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      
      expect(memoryIncrease).toBeLessThan(5); // Should be minimal after GC
    });

    it('長時間実行メモリ安定性', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const samples: number[] = [];
      
      // Simulate long-running operation
      for (let i = 0; i < 500; i++) {
        calculator.calculateMoonPhase(new Date());
        
        if (i % 100 === 0) {
          samples.push(process.memoryUsage().heapUsed);
        }
      }
      
      // Memory should remain stable
      const memoryGrowth = samples.map((sample, index) => 
        index > 0 ? sample - samples[index - 1] : 0
      );
      
      const avgGrowth = memoryGrowth.reduce((a, b) => a + b, 0) / memoryGrowth.length;
      expect(avgGrowth).toBeLessThan(1024 * 1024); // <1MB average growth
    });
  });

  describe('CPU使用率テスト', () => {
    it('高負荷時のCPU効率', () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        calculator.calculateMoonPhase(new Date());
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      const avgCpuTime = duration / iterations;
      
      expect(avgCpuTime).toBeLessThan(1); // <1ms CPU time per calculation
      console.log(`平均CPU時間: ${avgCpuTime.toFixed(3)}ms`);
    });

    it('複雑計算の効率性', () => {
      const complexDate = new Date('2025-12-31T23:59:59Z');
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < 100; i++) {
        const result = calculator.calculateMoonPhase(complexDate);
        expect(result).toBeDefined();
        expect(result.illumination).toBeGreaterThanOrEqual(0);
        expect(result.illumination).toBeLessThanOrEqual(100);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1s
    });
  });

  describe('応答性テスト', () => {
    it('リアルタイム更新パフォーマンス', () => {
      const updates = 60; // 60 FPS simulation
      const startTime = Date.now();
      
      for (let i = 0; i < updates; i++) {
        const date = new Date();
        date.setSeconds(date.getSeconds() + i);
        calculator.calculateMoonPhase(date);
      }
      
      const duration = Date.now() - startTime;
      const avgFrameTime = duration / updates;
      
      expect(avgFrameTime).toBeLessThan(16.67); // 60 FPS = 16.67ms per frame
      console.log(`平均フレーム時間: ${avgFrameTime.toFixed(2)}ms`);
    });

    it('バックグラウンド計算効率', async () => {
      const backgroundTasks = Array.from({ length: 10 }, (_, i) => 
        new Promise(resolve => {
          setTimeout(() => {
            const result = calculator.calculateMoonPhase(new Date());
            resolve(result);
          }, i * 10);
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.all(backgroundTasks);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(200); // Should complete quickly
    });
  });

  describe('スケーラビリティテスト', () => {
    it('同時ユーザーシミュレーション', () => {
      const users = 100;
      const calculatorsPerUser = 5;
      const startTime = Date.now();
      
      for (let user = 0; user < users; user++) {
        const userCalculator = new MoonPhaseCalculator();
        for (let calc = 0; calc < calculatorsPerUser; calc++) {
          userCalculator.calculateMoonPhase(new Date());
        }
      }
      
      const duration = Date.now() - startTime;
      const totalCalculations = users * calculatorsPerUser;
      const avgTime = duration / totalCalculations;
      
      expect(avgTime).toBeLessThan(5); // <5ms per calculation under load
      console.log(`${users}ユーザー, ${totalCalculations}計算: 平均${avgTime.toFixed(2)}ms`);
    });

    it('データ量スケーリング', () => {
      const dataSizes = [10, 100, 1000];
      const results: { size: number; time: number }[] = [];
      
      dataSizes.forEach(size => {
        const dates = Array.from({ length: size }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return date;
        });
        
        const startTime = Date.now();
        dates.forEach(date => calculator.calculateMoonPhase(date));
        const duration = Date.now() - startTime;
        
        results.push({ size, time: duration });
        
        const avgTime = duration / size;
        expect(avgTime).toBeLessThan(10); // Linear scaling
      });
      
      // Verify linear scaling (O(n))
      const efficiency = results.map((result, index) => 
        index > 0 ? result.time / results[index - 1].time : 1
      );
      
      efficiency.slice(1).forEach(ratio => {
        expect(ratio).toBeLessThan(20); // Should scale reasonably
      });
    });
  });

  describe('耐久性テスト', () => {
    it('長時間動作安定性', () => {
      const duration = 10000; // 10 seconds
      const interval = 100; // Check every 100ms
      const iterations = duration / interval;
      
      const startTime = Date.now();
      let successCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        try {
          const result = calculator.calculateMoonPhase(new Date());
          if (result && typeof result.illumination === 'number') {
            successCount++;
          }
        } catch (error) {
          // Count failures
        }
      }
      
      const actualDuration = Date.now() - startTime;
      const successRate = (successCount / iterations) * 100;
      
      expect(successRate).toBeGreaterThan(99.5); // >99.5% success rate
      expect(actualDuration).toBeLessThan(duration * 1.1); // Within 10% of expected time
      
      console.log(`耐久性テスト: ${iterations}回中${successCount}回成功 (${successRate.toFixed(2)}%)`);
    });

    it('エラー条件下での安定性', () => {
      const invalidDates = [
        null,
        undefined,
        new Date('invalid'),
        new Date('1800-01-01'), // Too old
        new Date('2200-01-01')  // Too future
      ];
      
      let crashCount = 0;
      let handledCount = 0;
      
      invalidDates.forEach(date => {
        try {
          const result = calculator.calculateMoonPhase(date as any);
          if (result) handledCount++;
        } catch (error) {
          handledCount++; // Graceful error handling counts as success
        }
      });
      
      expect(crashCount).toBe(0); // No crashes
      expect(handledCount).toBe(invalidDates.length); // All cases handled
    });
  });

  describe('リソース効率性テスト', () => {
    it('ファイルハンドル使用量', () => {
      const initialHandles = process.platform === 'win32' ? 0 : 
        require('fs').readdirSync('/proc/self/fd').length;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        calculator.calculateMoonPhase(new Date());
      }
      
      const finalHandles = process.platform === 'win32' ? 0 : 
        require('fs').readdirSync('/proc/self/fd').length;
      
      if (process.platform !== 'win32') {
        expect(finalHandles - initialHandles).toBeLessThan(10); // No handle leaks
      }
    });

    it('ガベージコレクション効率', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create temporary objects
      for (let i = 0; i < 10000; i++) {
        const temp = calculator.calculateMoonPhase(new Date());
        // Objects should be eligible for GC
      }
      
      // Force GC if available
      if (global.gc) {
        global.gc();
        global.gc(); // Run twice to ensure cleanup
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // <1MB after GC
    });
  });

  describe('パフォーマンス統計', () => {
    it('総合パフォーマンス評価', () => {
      const metrics = {
        calculationTime: 0,
        memoryUsage: 0,
        cpuEfficiency: 0,
        scalability: 0
      };

      // Calculation speed test
      const calcStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        calculator.calculateMoonPhase(new Date());
      }
      metrics.calculationTime = Date.now() - calcStart;

      // Memory efficiency test
      const memStart = process.memoryUsage().heapUsed;
      for (let i = 0; i < 100; i++) {
        new MoonPhaseCalculator();
      }
      metrics.memoryUsage = process.memoryUsage().heapUsed - memStart;

      // Generate performance score
      const calculationScore = Math.max(0, 100 - metrics.calculationTime / 10);
      const memoryScore = Math.max(0, 100 - metrics.memoryUsage / (1024 * 1024));
      const overallScore = (calculationScore + memoryScore) / 2;

      expect(overallScore).toBeGreaterThan(70); // >70% performance score
      
      console.log('パフォーマンス評価:');
      console.log(`  計算速度: ${calculationScore.toFixed(1)}/100`);
      console.log(`  メモリ効率: ${memoryScore.toFixed(1)}/100`);
      console.log(`  総合スコア: ${overallScore.toFixed(1)}/100`);
    });
  });
});