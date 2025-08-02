/**
 * 月相計算器インターフェース
 * SuperSerena Development - SPARC Architecture
 * Jean Meeusアルゴリズム実装仕様
 */

import { MoonPhase } from '../../shared/types';

/**
 * 月相計算器インターフェース
 * 高精度な月相計算を提供
 */
export interface IMoonPhaseCalculator {
  /**
   * 指定日時の月相を計算
   * @param date 計算対象日時（JST）
   * @returns 月相情報
   * @throws {Error} 無効な日付、計算エラーの場合
   */
  calculateMoonPhase(date: Date): Promise<MoonPhase>;

  /**
   * 月齢を計算
   * @param date 計算対象日時（JST）
   * @returns 月齢（0.0〜29.5日）
   */
  calculateMoonAge(date: Date): Promise<number>;

  /**
   * 照度パーセンテージを計算
   * @param moonAge 月齢
   * @returns 照度（0〜100%）
   */
  calculateIllumination(moonAge: number): number;

  /**
   * 月相名を取得
   * @param moonAge 月齢
   * @param language 言語（'ja' | 'en'）
   * @returns 月相名
   */
  getMoonPhaseName(moonAge: number, language: 'ja' | 'en'): string;

  /**
   * 次の満月日時を計算
   * @param fromDate 基準日時
   * @returns 次の満月日時
   */
  getNextFullMoon(fromDate: Date): Promise<Date>;

  /**
   * 次の新月日時を計算
   * @param fromDate 基準日時
   * @returns 次の新月日時
   */
  getNextNewMoon(fromDate: Date): Promise<Date>;

  /**
   * 計算精度を検証
   * @param calculatedDate 計算結果日時
   * @param actualDate 実際の日時
   * @returns 精度許容範囲内かどうか
   */
  validateAccuracy(calculatedDate: Date, actualDate: Date): boolean;
}

/**
 * 月相計算設定オプション
 */
export interface MoonCalculatorOptions {
  /** タイムゾーン（デフォルト: 'Asia/Tokyo'） */
  timezone?: string;
  /** 計算精度許容誤差（日数、デフォルト: 0.5） */
  tolerance?: number;
  /** キャッシュ有効化フラグ */
  enableCache?: boolean;
  /** パフォーマンス最適化レベル */
  optimizationLevel?: 'fast' | 'accurate' | 'balanced';
}

/**
 * 月相計算エラー
 */
export class MoonCalculationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MoonCalculationError';
  }
}

/**
 * パフォーマンス計測結果
 */
export interface CalculationPerformance {
  /** 計算開始時刻 */
  startTime: number;
  /** 計算終了時刻 */
  endTime: number;
  /** 計算時間（ミリ秒） */
  duration: number;
  /** メモリ使用量（バイト） */
  memoryUsage: number;
}