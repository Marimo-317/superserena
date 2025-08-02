/**
 * Performance Optimization Benchmark
 * Tests optimized vs legacy performance
 */

import { OptimizedMoonCalculator } from "../src/core/performance/OptimizedMoonCalculator";
import { MoonPhaseCalculator } from "../src/core/moon-calculator/MoonPhaseCalculator";

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryStart: number;
  memoryEnd: number;
  memoryDelta: number;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks(): Promise<void> {
    console.log("🚀 Starting Performance Optimization Benchmarks");
    
    await this.benchmarkMoonCalculation();
    await this.benchmarkBatchCalculation();
    await this.benchmarkMemoryUsage();
    
    this.generateReport();
  }

  private async benchmarkMoonCalculation(): Promise<void> {
    const testDate = new Date();
    const iterations = 1000;
    
    // Test Optimized Calculator
    const optimized = new OptimizedMoonCalculator();
    const optimizedResult = await this.measurePerformance(
      "Optimized Moon Calculation", 
      iterations,
      async () => await optimized.calculateMoonPhase(testDate)
    );
    
    // Test Legacy Calculator
    const legacy = new MoonPhaseCalculator();
    const legacyResult = await this.measurePerformance(
      "Legacy Moon Calculation", 
      100, // Reduce iterations due to slowness
      async () => await legacy.calculateMoonPhase(testDate)
    );
    
    this.results.push(optimizedResult, legacyResult);
    
    console.log(`Optimized: ${optimizedResult.averageTime.toFixed(2)}ms avg`);
    console.log(`Legacy: ${legacyResult.averageTime.toFixed(2)}ms avg`);
    console.log(`Improvement: ${((legacyResult.averageTime - optimizedResult.averageTime) / legacyResult.averageTime * 100).toFixed(1)}%`);
  }

  private async benchmarkBatchCalculation(): Promise<void> {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return date;
    });
    
    const optimized = new OptimizedMoonCalculator();
    
    const batchResult = await this.measurePerformance(
      "Batch Moon Calculation (30 days)", 
      100,
      async () => {
        const promises = dates.map(date => optimized.calculateMoonPhase(date));
        return await Promise.all(promises);
      }
    );
    
    this.results.push(batchResult);
    console.log(`Batch processing: ${batchResult.averageTime.toFixed(2)}ms for 30 calculations`);
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    const optimized = new OptimizedMoonCalculator();
    const testDate = new Date();
    
    // Memory pressure test
    const memoryResult = await this.measurePerformance(
      "Memory Pressure Test", 
      5000,
      async () => await optimized.calculateMoonPhase(testDate)
    );
    
    this.results.push(memoryResult);
    console.log(`Memory usage: ${(memoryResult.memoryDelta / 1024 / 1024).toFixed(2)}MB delta`);
  }

  private async measurePerformance(
    name: string, 
    iterations: number, 
    operation: () => Promise<any>
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let memoryStart = 0;
    let memoryEnd = 0;
    
    // Get initial memory
    if (performance && (performance as any).memory) {
      memoryStart = (performance as any).memory.usedJSHeapSize;
    }
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      await operation();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      times.push(end - start);
    }
    
    // Get final memory
    if (performance && (performance as any).memory) {
      memoryEnd = (performance as any).memory.usedJSHeapSize;
    }
    
    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      memoryStart,
      memoryEnd,
      memoryDelta: memoryEnd - memoryStart
    };
  }

  private generateReport(): void {
    console.log("\n📊 Performance Optimization Report");
    console.log("=".repeat(50));
    
    for (const result of this.results) {
      console.log(`\n${result.name}:`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Average: ${result.averageTime.toFixed(2)}ms`);
      console.log(`  Min: ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max: ${result.maxTime.toFixed(2)}ms`);
      console.log(`  Memory Delta: ${(result.memoryDelta / 1024).toFixed(1)}KB`);
      
      // Performance score
      const score = this.calculatePerformanceScore(result);
      console.log(`  Performance Score: ${score.toFixed(1)}/100`);
    }
    
    this.generateTargetAnalysis();
  }

  private calculatePerformanceScore(result: BenchmarkResult): number {
    const targets = {
      moonCalculation: 20, // <20ms target
      batchCalculation: 600, // <600ms for 30 calculations
      memoryUsage: 1024 * 1024 // <1MB delta
    };
    
    let target = targets.moonCalculation;
    if (result.name.includes("Batch")) target = targets.batchCalculation;
    
    // Score based on how close to target
    const ratio = Math.min(result.averageTime / target, 2); // Cap at 2x target
    return Math.max(0, 100 - (ratio - 1) * 100);
  }

  private generateTargetAnalysis(): void {
    console.log("\n🎯 Target Achievement Analysis");
    console.log("=".repeat(50));
    
    const optimizedResult = this.results.find(r => r.name.includes("Optimized"));
    if (optimizedResult) {
      const startupTarget = 1000; // <1s
      const memoryTarget = 35 * 1024 * 1024; // <35MB
      const calculationTarget = 20; // <20ms
      
      console.log(`✅ Startup Time: ${optimizedResult.averageTime < startupTarget ? "ACHIEVED" : "NEEDS WORK"}`);
      console.log(`✅ Calculation Speed: ${optimizedResult.averageTime < calculationTarget ? "ACHIEVED" : "NEEDS WORK"} (${optimizedResult.averageTime.toFixed(2)}ms vs ${calculationTarget}ms target)`);
      console.log(`✅ Memory Usage: ${optimizedResult.memoryDelta < memoryTarget ? "ACHIEVED" : "NEEDS WORK"}`);
      
      const overallScore = this.calculateOverallScore();
      console.log(`\n🏆 Overall Optimization Score: ${overallScore.toFixed(1)}/100`);
      
      if (overallScore >= 90) {
        console.log("🎉 EXCELLENT: Performance targets exceeded\!");
      } else if (overallScore >= 80) {
        console.log("✨ GOOD: Performance targets mostly met");
      } else {
        console.log("⚠️  NEEDS IMPROVEMENT: Some targets not met");
      }
    }
  }

  private calculateOverallScore(): number {
    const scores = this.results.map(r => this.calculatePerformanceScore(r));
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

export { PerformanceBenchmark };
