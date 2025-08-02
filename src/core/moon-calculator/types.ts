/**
 * Moon phase calculation types and interfaces
 */

export interface MoonPhase {
  moonAge: number;
  phaseName: string;
  phaseNameEn: string;
  illumination: number;
  calculatedAt: Date;
}

export type CacheKey = string;

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export type CalculationType = 'moonPhase' | 'illumination' | 'age';