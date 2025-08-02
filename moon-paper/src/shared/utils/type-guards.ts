/**
 * 型ガード関数集
 * SuperSerena Development - TypeScript型安全性向上
 */

import { MoonPhase } from '../types';

/**
 * MoonPhase型ガード
 * オブジェクトがMoonPhase型の要件を満たしているかチェック
 */
export function isMoonPhase(obj: any): obj is MoonPhase {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.moonAge === 'number' &&
    typeof obj.phaseName === 'string' &&
    typeof obj.phaseNameEn === 'string' &&
    typeof obj.illumination === 'number' &&
    obj.calculatedAt instanceof Date &&
    obj.moonAge >= 0 &&
    obj.moonAge <= 29.6 &&
    obj.illumination >= 0 &&
    obj.illumination <= 100
  );
}

/**
 * Date型ガード
 * オブジェクトが有効なDate型かチェック
 */
export function isValidDate(obj: any): obj is Date {
  return obj instanceof Date && !isNaN(obj.getTime());
}

/**
 * 数値範囲チェック
 */
export function isNumberInRange(value: any, min: number, max: number): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * 文字列の空チェック
 */
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}