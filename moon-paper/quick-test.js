const { MeusAlgorithm, JulianDay } = require("./src/shared/utils/astronomical-utils");

console.log("🚀 Testing Optimized Moon Calculation Performance");

const testDate = new Date();
const jd = JulianDay.fromDate(testDate);

// Test 1000 calculations
const iterations = 1000;
const times = [];

console.log(`Running ${iterations} phase angle calculations...`);

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  const phaseAngle = MeusAlgorithm.calculatePhaseAngle(jd);
  const end = performance.now();
  times.push(end - start);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const totalTime = times.reduce((a, b) => a + b, 0);

console.log("📊 Optimization Results:");
console.log(`  Total calculations: ${iterations}`);
console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
console.log(`  Average per calculation: ${avgTime.toFixed(3)}ms`);
console.log(`  Target: <0.1ms per calculation`);

if (avgTime < 0.1) {
  console.log("✅ EXCELLENT: Calculation speed target achieved\!");
  console.log(`🎯 Performance improvement: ${((11650 - avgTime) / 11650 * 100).toFixed(1)}% vs original`);
} else if (avgTime < 1) {
  console.log("✅ GOOD: Significant improvement achieved");
} else {
  console.log("⚠️  Still needs optimization");
}

// Test moon age calculation
console.log("\nTesting moon age calculation...");
const moonAgeStart = performance.now();
const syndicMonth = 29.530588861;
const phaseAngle = MeusAlgorithm.calculatePhaseAngle(jd);
const moonAge = MeusAlgorithm.phaseAngleToMoonAge(phaseAngle, syndicMonth);
const moonAgeEnd = performance.now();

console.log(`Moon age calculation: ${(moonAgeEnd - moonAgeStart).toFixed(3)}ms`);
console.log(`Calculated moon age: ${moonAge.toFixed(2)} days`);

console.log("\n🏆 Performance Optimization Summary:");
console.log(`- Calculation speed: ${avgTime < 0.1 ? "OPTIMIZED" : "NEEDS WORK"}`);
console.log(`- Target achievement: ${avgTime < 0.1 ? "100%" : ((0.1 / avgTime) * 100).toFixed(1) + "%"}`);
