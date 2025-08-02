#!/usr/bin/env node

/**
 * 月相壁紙アプリ 簡易CLIデモ（修正版）
 * SuperSerena Development - 安全な実装
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

// 簡略化された月相計算器
class SimpleMoonCalculator {
    constructor() {
        this.stats = { calculations: 0, times: [] };
    }

    calculateMoonPhase(date) {
        const startTime = performance.now();
        
        try {
            // ユリウス日変換
            const jd = this.dateToJulianDay(date);
            
            // 月齢計算（簡略化）
            const moonAge = this.calculateMoonAge(jd);
            
            // 照度計算
            const illumination = this.calculateIllumination(moonAge);
            
            // 月相名取得
            const phaseName = this.getMoonPhaseName(moonAge);
            
            const endTime = performance.now();
            const calcTime = endTime - startTime;
            
            this.stats.calculations++;
            this.stats.times.push(calcTime);
            
            return {
                moonAge,
                phaseName: phaseName.ja,
                phaseNameEn: phaseName.en,
                illumination,
                emoji: phaseName.emoji,
                calculationTime: calcTime,
                calculatedAt: new Date()
            };
            
        } catch (error) {
            console.error(colors.red + `計算エラー: ${error.message}` + colors.reset);
            return null;
        }
    }

    dateToJulianDay(date) {
        const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
        const y = date.getFullYear() + 4800 - a;
        const m = (date.getMonth() + 1) + 12 * a - 3;
        
        return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
               Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
               (date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600) / 24;
    }

    calculateMoonAge(jd) {
        // 簡略化されたアルゴリズム
        const referenceNewMoon = 2451550.1; // 2000年1月6日の新月
        const synodicMonth = 29.530588861;
        
        const daysSinceReference = jd - referenceNewMoon;
        const cycles = daysSinceReference / synodicMonth;
        const fractionalCycle = cycles - Math.floor(cycles);
        
        return fractionalCycle * synodicMonth;
    }

    calculateIllumination(moonAge) {
        // 位相角に変換（0度=新月、180度=満月）
        const phaseAngle = (moonAge / 29.530588861) * 360;
        const radians = (phaseAngle * Math.PI) / 180;
        return Math.max(0, Math.min(100, (1 - Math.cos(radians)) / 2 * 100));
    }

    getMoonPhaseName(moonAge) {
        const phases = [
            { limit: 1.85, ja: "新月", en: "New Moon", emoji: "🌑" },
            { limit: 5.54, ja: "三日月", en: "Waxing Crescent", emoji: "🌒" },
            { limit: 9.23, ja: "上弦の月", en: "First Quarter", emoji: "🌓" },
            { limit: 12.92, ja: "十三夜", en: "Waxing Gibbous", emoji: "🌔" },
            { limit: 16.62, ja: "満月", en: "Full Moon", emoji: "🌕" },
            { limit: 20.31, ja: "十八夜", en: "Waning Gibbous", emoji: "🌖" },
            { limit: 24.00, ja: "下弦の月", en: "Last Quarter", emoji: "🌗" },
            { limit: 27.69, ja: "有明月", en: "Waning Crescent", emoji: "🌘" }
        ];

        for (const phase of phases) {
            if (moonAge < phase.limit) {
                return phase;
            }
        }
        return { ja: "新月", en: "New Moon", emoji: "🌑" };
    }

    getStatistics() {
        const avgTime = this.stats.times.length > 0 ? 
            this.stats.times.reduce((a, b) => a + b, 0) / this.stats.times.length : 0;
        
        return {
            calculations: this.stats.calculations,
            averageTime: avgTime
        };
    }
}

// ASCII Art月表示
function generateMoonArt(illumination, phaseName) {
    const moon = [
        "     ███████     ",
        "   ███████████   ",
        "  █████████████  ",
        " ███████████████ ",
        "█████████████████",
        "█████████████████",
        "█████████████████",
        " ███████████████ ",
        "  █████████████  ",
        "   ███████████   ",
        "     ███████     "
    ];

    const illuminatedPercent = illumination / 100;
    
    return moon.map(line => {
        if (phaseName.includes('Waxing') || phaseName === 'First Quarter') {
            // 右から照らす
            const visibleChars = Math.floor(line.length * illuminatedPercent);
            const darkPart = ' '.repeat(line.length - visibleChars);
            const lightPart = line.slice(-visibleChars);
            return colors.dim + darkPart + colors.yellow + lightPart + colors.reset;
        } else if (phaseName.includes('Waning') || phaseName === 'Last Quarter') {
            // 左から照らす
            const visibleChars = Math.floor(line.length * illuminatedPercent);
            const lightPart = line.slice(0, visibleChars);
            const darkPart = ' '.repeat(line.length - visibleChars);
            return colors.yellow + lightPart + colors.dim + darkPart + colors.reset;
        } else if (phaseName === 'Full Moon') {
            return colors.yellow + line + colors.reset;
        } else {
            return colors.dim + line + colors.reset;
        }
    }).join('\n');
}

function displayHeader() {
    console.log(colors.cyan + colors.bright + "🌙 月相壁紙アプリ - 簡易CLIデモ" + colors.reset);
    console.log(colors.cyan + "SuperSerena Development - 安全な実装" + colors.reset);
    console.log("=".repeat(50));
}

function displayMoonPhase(moonPhase, date) {
    if (!moonPhase) {
        console.log(colors.red + "月相計算に失敗しました" + colors.reset);
        return;
    }

    console.log();
    console.log(colors.bright + `📅 ${date.toLocaleDateString('ja-JP')} (${date.toLocaleDateString('en-US', { weekday: 'long' })})` + colors.reset);
    console.log();
    
    // ASCII Moon Art
    console.log(generateMoonArt(moonPhase.illumination, moonPhase.phaseNameEn));
    console.log();
    
    // Moon Phase Information
    console.log(colors.yellow + colors.bright + `${moonPhase.emoji} ${moonPhase.phaseName}` + colors.reset + 
                colors.dim + ` (${moonPhase.phaseNameEn})` + colors.reset);
    console.log();
    
    // Detailed Information
    console.log(colors.green + "📊 詳細情報:" + colors.reset);
    console.log(`   月齢: ${colors.cyan}${moonPhase.moonAge.toFixed(2)}日${colors.reset}`);
    console.log(`   照度: ${colors.yellow}${moonPhase.illumination.toFixed(1)}%${colors.reset}`);
    console.log(`   計算時間: ${colors.magenta}${moonPhase.calculationTime.toFixed(3)}ms${colors.reset}`);
    console.log(`   計算日時: ${colors.dim}${moonPhase.calculatedAt.toLocaleString('ja-JP')}${colors.reset}`);
}

function runPerformanceTest() {
    console.log(colors.green + colors.bright + "🚀 性能テスト実行中..." + colors.reset);
    
    const calculator = new SimpleMoonCalculator();
    const iterations = 100; // 安全のため100回に削減
    
    console.log(`${iterations}回の計算を実行...`);
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        const randomTime = Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000;
        const testDate = new Date(randomTime);
        calculator.calculateMoonPhase(testDate);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    const stats = calculator.getStatistics();
    
    console.log();
    console.log(colors.green + "📊 性能テスト結果:" + colors.reset);
    console.log(`   総計算回数: ${colors.cyan}${stats.calculations}回${colors.reset}`);
    console.log(`   総実行時間: ${colors.yellow}${totalTime.toFixed(2)}ms${colors.reset}`);
    console.log(`   平均計算時間: ${colors.magenta}${stats.averageTime.toFixed(3)}ms${colors.reset}`);
    console.log(`   1回あたり: ${colors.cyan}${(totalTime / iterations).toFixed(3)}ms${colors.reset}`);
    
    // Performance Analysis
    const target = 100; // 100ms target
    if (stats.averageTime < target) {
        console.log(`   ${colors.green}✅ 性能目標達成${colors.reset} (目標: <${target}ms)`);
    } else {
        console.log(`   ${colors.red}❌ 性能目標未達成${colors.reset} (目標: <${target}ms)`);
    }
}

function displayHelp() {
    console.log(colors.green + colors.bright + "🌙 月相壁紙アプリ 簡易CLIヘルプ" + colors.reset);
    console.log();
    console.log("使用方法:");
    console.log(`  ${colors.cyan}node simple-cli-demo.js${colors.reset}                今日の月相表示`);
    console.log(`  ${colors.cyan}node simple-cli-demo.js 2025-12-25${colors.reset}     指定日の月相表示`);
    console.log(`  ${colors.cyan}node simple-cli-demo.js --performance${colors.reset}  性能テスト実行`);
    console.log(`  ${colors.cyan}node simple-cli-demo.js --help${colors.reset}         このヘルプを表示`);
    console.log();
    console.log("機能:");
    console.log("  ✅ 簡略化月相計算アルゴリズム");
    console.log("  ✅ ASCII アート月表示");
    console.log("  ✅ 性能テスト機能");
    console.log("  ✅ 安全なエラーハンドリング");
    console.log("  ✅ 日本語・英語対応");
}

// メイン処理
function main() {
    displayHeader();
    
    const args = process.argv.slice(2);
    const calculator = new SimpleMoonCalculator();
    
    try {
        if (args.length === 0) {
            // 今日の月相
            const today = new Date();
            const moonPhase = calculator.calculateMoonPhase(today);
            displayMoonPhase(moonPhase, today);
            
        } else if (args[0] === '--help' || args[0] === '-h') {
            displayHelp();
            
        } else if (args[0] === '--performance' || args[0] === '-p') {
            runPerformanceTest();
            
        } else {
            // 指定日の月相
            const inputDate = new Date(args[0]);
            if (isNaN(inputDate.getTime())) {
                throw new Error(`無効な日付形式: ${args[0]}`);
            }
            
            const moonPhase = calculator.calculateMoonPhase(inputDate);
            displayMoonPhase(moonPhase, inputDate);
        }
        
        // 統計情報表示
        const stats = calculator.getStatistics();
        if (stats.calculations > 0) {
            console.log();
            console.log(colors.dim + `📊 セッション統計: ${stats.calculations}回計算, 平均${stats.averageTime.toFixed(2)}ms` + colors.reset);
        }
        
    } catch (error) {
        console.error(colors.red + `❌ エラー: ${error.message}` + colors.reset);
        console.log();
        console.log("ヘルプを表示するには: node simple-cli-demo.js --help");
        process.exit(1);
    }
}

// 実行
if (require.main === module) {
    main();
}

module.exports = { SimpleMoonCalculator, generateMoonArt };