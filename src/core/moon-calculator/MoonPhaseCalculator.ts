import { MoonPhase, CacheEntry, CalculationType, CacheKey } from './types';

/**
 * Calculator for moon phases with caching functionality
 */
export class MoonPhaseCalculator {
  private cache = new Map<CacheKey, CacheEntry<MoonPhase>>();
  private readonly cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Calculate moon phase for a given date
   */
  calculateMoonPhase(date: Date): MoonPhase {
    const cached = this.getCachedResult(date, 'moonPhase');
    if (cached) return cached;

    const moonPhase = this.computeMoonPhase(date);
    this.setCachedResult(date, 'moonPhase', moonPhase);
    
    return moonPhase;
  }

  /**
   * Get cached result with proper type safety
   */
  private getCachedResult(date: Date, type: CalculationType): MoonPhase | null {
    const key = this.generateCacheKey(date, type);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Validate the cached data structure
    if (!this.isValidMoonPhase(entry.data)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached result
   */
  private setCachedResult(date: Date, type: CalculationType, data: MoonPhase): void {
    const key = this.generateCacheKey(date, type);
    const expiresAt = new Date(Date.now() + this.cacheExpiryMs);
    
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      expiresAt
    });
  }

  /**
   * Type guard to validate MoonPhase structure
   */
  private isValidMoonPhase(obj: any): obj is MoonPhase {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.moonAge === 'number' &&
      typeof obj.phaseName === 'string' &&
      typeof obj.phaseNameEn === 'string' &&
      typeof obj.illumination === 'number' &&
      obj.calculatedAt instanceof Date
    );
  }

  /**
   * Generate cache key for date and calculation type
   */
  private generateCacheKey(date: Date, type: CalculationType): CacheKey {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return `${type}:${dateStr}`;
  }

  /**
   * Compute moon phase for given date
   */
  private computeMoonPhase(date: Date): MoonPhase {
    // Moon phase calculation based on astronomical formulas
    const daysSinceNewMoon = this.calculateDaysSinceNewMoon(date);
    const moonAge = daysSinceNewMoon % 29.53059; // Synodic month length
    
    const illumination = this.calculateIllumination(moonAge);
    const { phaseName, phaseNameEn } = this.getPhaseName(moonAge);

    return {
      moonAge,
      phaseName,
      phaseNameEn,
      illumination,
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate days since known new moon
   */
  private calculateDaysSinceNewMoon(date: Date): number {
    // Known new moon: January 6, 2000, 18:14 UTC
    const knownNewMoon = new Date(2000, 0, 6, 18, 14, 0, 0);
    const timeDiff = date.getTime() - knownNewMoon.getTime();
    return timeDiff / (1000 * 60 * 60 * 24); // Convert to days
  }

  /**
   * Calculate illumination percentage
   */
  private calculateIllumination(moonAge: number): number {
    // Simplified illumination calculation
    const phase = (moonAge / 29.53059) * 2 * Math.PI;
    const illumination = (1 - Math.cos(phase)) / 2;
    return Math.round(illumination * 100);
  }

  /**
   * Get phase name based on moon age
   */
  private getPhaseName(moonAge: number): { phaseName: string; phaseNameEn: string } {
    if (moonAge < 1.84566) {
      return { phaseName: '新月', phaseNameEn: 'New Moon' };
    } else if (moonAge < 5.53699) {
      return { phaseName: '三日月', phaseNameEn: 'Waxing Crescent' };
    } else if (moonAge < 9.22831) {
      return { phaseName: '上弦', phaseNameEn: 'First Quarter' };
    } else if (moonAge < 12.91963) {
      return { phaseName: '十三夜', phaseNameEn: 'Waxing Gibbous' };
    } else if (moonAge < 16.61096) {
      return { phaseName: '満月', phaseNameEn: 'Full Moon' };
    } else if (moonAge < 20.30228) {
      return { phaseName: '寝待月', phaseNameEn: 'Waning Gibbous' };
    } else if (moonAge < 23.99361) {
      return { phaseName: '下弦', phaseNameEn: 'Last Quarter' };
    } else if (moonAge < 27.68493) {
      return { phaseName: '二十六夜', phaseNameEn: 'Waning Crescent' };
    } else {
      return { phaseName: '新月', phaseNameEn: 'New Moon' };
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size
    };
  }
}