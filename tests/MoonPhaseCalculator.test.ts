import { MoonPhaseCalculator } from '../src/core/moon-calculator/MoonPhaseCalculator';
import { MoonPhase } from '../src/core/moon-calculator/types';

describe('MoonPhaseCalculator', () => {
  let calculator: MoonPhaseCalculator;

  beforeEach(() => {
    calculator = new MoonPhaseCalculator();
  });

  describe('calculateMoonPhase', () => {
    it('should calculate moon phase for a given date', () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      const result = calculator.calculateMoonPhase(testDate);

      expect(result).toBeDefined();
      expect(typeof result.moonAge).toBe('number');
      expect(typeof result.phaseName).toBe('string');
      expect(typeof result.phaseNameEn).toBe('string');
      expect(typeof result.illumination).toBe('number');
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should return values within expected ranges', () => {
      const testDate = new Date('2024-06-15T12:00:00Z');
      const result = calculator.calculateMoonPhase(testDate);

      expect(result.moonAge).toBeGreaterThanOrEqual(0);
      expect(result.moonAge).toBeLessThan(29.53059);
      expect(result.illumination).toBeGreaterThanOrEqual(0);
      expect(result.illumination).toBeLessThanOrEqual(100);
      expect(result.phaseName).toBeTruthy();
      expect(result.phaseNameEn).toBeTruthy();
    });

    it('should provide Japanese and English phase names', () => {
      const testDate = new Date('2024-01-15T12:00:00Z');
      const result = calculator.calculateMoonPhase(testDate);

      const validJapanesePhases = ['新月', '三日月', '上弦', '十三夜', '満月', '寝待月', '下弦', '二十六夜'];
      const validEnglishPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

      expect(validJapanesePhases).toContain(result.phaseName);
      expect(validEnglishPhases).toContain(result.phaseNameEn);
    });
  });

  describe('caching functionality', () => {
    it('should cache results for the same date', () => {
      const testDate = new Date('2024-03-20T12:00:00Z');
      
      const result1 = calculator.calculateMoonPhase(testDate);
      const result2 = calculator.calculateMoonPhase(testDate);

      expect(result1).toEqual(result2);
      expect(result1.calculatedAt).toEqual(result2.calculatedAt);
    });

    it('should return different results for different dates', () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = new Date('2024-07-01T12:00:00Z');
      
      const result1 = calculator.calculateMoonPhase(date1);
      const result2 = calculator.calculateMoonPhase(date2);

      expect(result1.moonAge).not.toEqual(result2.moonAge);
    });

    it('should provide cache statistics', () => {
      const testDate = new Date('2024-04-10T12:00:00Z');
      calculator.calculateMoonPhase(testDate);

      const stats = calculator.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.entries).toBeGreaterThan(0);
    });

    it('should clear expired cache entries', () => {
      const testDate = new Date('2024-05-01T12:00:00Z');
      calculator.calculateMoonPhase(testDate);

      expect(calculator.getCacheStats().size).toBeGreaterThan(0);
      
      calculator.clearExpiredCache();
      // Cache should still exist as it's not expired
      expect(calculator.getCacheStats().size).toBeGreaterThan(0);
    });
  });

  describe('type safety', () => {
    it('should return a properly typed MoonPhase object', () => {
      const testDate = new Date('2024-08-01T12:00:00Z');
      const result: MoonPhase = calculator.calculateMoonPhase(testDate);

      // TypeScript compilation will fail if types don't match
      expect(result.moonAge).toBeDefined();
      expect(result.phaseName).toBeDefined();
      expect(result.phaseNameEn).toBeDefined();
      expect(result.illumination).toBeDefined();
      expect(result.calculatedAt).toBeDefined();
    });

    it('should handle edge cases without type errors', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00Z');
      const yearEndDate = new Date('2024-12-31T23:59:59Z');
      
      expect(() => calculator.calculateMoonPhase(leapYearDate)).not.toThrow();
      expect(() => calculator.calculateMoonPhase(yearEndDate)).not.toThrow();
    });
  });

  describe('moon phase accuracy', () => {
    it('should calculate new moon correctly', () => {
      // Test with a known new moon date approximation
      const newMoonDate = new Date('2024-01-11T11:57:00Z');
      const result = calculator.calculateMoonPhase(newMoonDate);

      // New moon should have low illumination
      expect(result.illumination).toBeLessThan(10);
      expect(['新月', 'New Moon']).toContain(result.phaseName || result.phaseNameEn);
    });

    it('should calculate full moon correctly', () => {
      // Test with a known full moon date approximation
      const fullMoonDate = new Date('2024-01-25T17:54:00Z');
      const result = calculator.calculateMoonPhase(fullMoonDate);

      // Full moon should have high illumination
      expect(result.illumination).toBeGreaterThan(90);
    });
  });
});