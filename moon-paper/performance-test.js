/**
 * Quick Performance Test - 最適化効果の測定
 */

const { MoonPhaseCalculator } = require("./dist/core/moon-calculator/MoonPhaseCalculator");

async function performanceTest() {
  console.log("🚀 Performance Test Starting...");
  
  const calculator = new MoonPhaseCalculator();
  const testDate = new Date();
  const iterations = 100;
  
  const times = [];
  
  // Warm up
  for (let i = 0; i < 5; i++) {
    try {
      await calculator.calculateMoonPhase(testDate);
    } catch (error) {
      console.warn("Warmup failed:", error.message);
    }
  }
  
  // Actual test
  console.log(`Testing ${iterations} calculations...`);
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await calculator.calculateMoonPhase(testDate);
      const end = performance.now();
      times.push(end - start);
    } catch (error) {
      console.warn(`Calculation ${i} failed:`, error.message);
      times.push(0); // Record as 0 for failed calculations
    }
  }
  
  // Results
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const successfulCalcs = times.filter(t => t > 0).length;
  
  console.log("📊 Results:");
  console.log(`  Average time: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min time: ${minTime.toFixed(2)}ms`);
  console.log(`  Max time: ${maxTime.toFixed(2)}ms`);
  console.log(`  Successful calculations: ${successfulCalcs}/${iterations}`);
  console.log(`  Success rate: ${(successfulCalcs/iterations*100).toFixed(1)}%`);
  
  // Target analysis
  const target = 100; // <100ms target
  if (avgTime < target) {
    console.log(`✅ PASSED: Average time (${avgTime.toFixed(2)}ms) under target (${target}ms)`);
  } else {
    console.log(`❌ FAILED: Average time (${avgTime.toFixed(2)}ms) exceeds target (${target}ms)`);
  }
  
  // Performance score
  const score = Math.max(0, 100 - (avgTime - target));
  console.log(`🏆 Performance Score: ${score.toFixed(1)}/100`);
}

performanceTest().catch(console.error);
