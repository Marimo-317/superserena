/**
 * 日付ユーティリティ
 * SuperSerena Development - SPARC Architecture
 * 日本タイムゾーン対応
 */

import { JAPAN_TIMEZONE } from '../constants';

/**
 * 日付検証ユーティリティ
 */
export class DateValidator {
  /**
   * 有効な日付かチェック
   * @param date チェックする日付
   * @returns 有効かどうか
   */
  static isValid(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * 日付が計算可能範囲内かチェック
   * @param date チェックする日付
   * @returns 計算可能かどうか
   */
  static isCalculatable(date: Date): boolean {
    if (!this.isValid(date)) return false;

    const year = date.getFullYear();
    // 計算精度が保証される範囲（1800年〜2200年）
    return year >= 1800 && year <= 2200;
  }

  /**
   * 未来の日付でないかチェック
   * @param date チェックする日付
   * @param maxFutureDays 許容する最大未来日数
   * @returns 未来すぎないかどうか
   */
  static isNotTooFuture(date: Date, maxFutureDays: number = 100000): boolean {
    const now = new Date();
    const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= maxFutureDays;
  }

  /**
   * 過去の日付でないかチェック
   * @param date チェックする日付
   * @param maxPastDays 許容する最大過去日数
   * @returns 過去すぎないかどうか
   */
  static isNotTooPast(date: Date, maxPastDays: number = 100000): boolean {
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= maxPastDays;
  }

  /**
   * 包括的な日付検証
   * @param date チェックする日付
   * @returns 検証結果
   */
  static validate(date: Date): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isValid(date)) {
      errors.push('Invalid date object');
      return { isValid: false, errors };
    }

    if (!this.isCalculatable(date)) {
      errors.push('Date is outside calculatable range (1800-2200)');
    }

    if (!this.isNotTooFuture(date)) {
      errors.push('Date is too far in the future');
    }

    if (!this.isNotTooPast(date)) {
      errors.push('Date is too far in the past');
    }

    return { isValid: errors.length === 0, errors };
  }
}

/**
 * 日本時間対応ユーティリティ
 */
export class JapanTime {
  /**
   * 現在の日本時間を取得
   * @returns 日本時間のDateオブジェクト
   */
  static now(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: JAPAN_TIMEZONE }));
  }

  /**
   * UTCから日本時間に変換
   * @param utcDate UTC日時
   * @returns 日本時間
   */
  static fromUtc(utcDate: Date): Date {
    return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  }

  /**
   * 日本時間からUTCに変換
   * @param jstDate 日本時間
   * @returns UTC時間
   */
  static toUtc(jstDate: Date): Date {
    return new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
  }

  /**
   * 日本時間で日付文字列をパース
   * @param dateString 日付文字列
   * @returns 日本時間のDateオブジェクト
   */
  static parse(dateString: string): Date {
    // ISO 8601形式でタイムゾーンが指定されていない場合、日本時間として解釈
    if (!dateString.includes('T') || (!dateString.includes('+') && !dateString.includes('Z'))) {
      return new Date(dateString + (dateString.includes('T') ? '+09:00' : 'T00:00:00+09:00'));
    }
    return new Date(dateString);
  }

  /**
   * 日本時間でフォーマット
   * @param date 日付
   * @param format フォーマット形式
   * @returns フォーマットされた文字列
   */
  static format(date: Date, format: 'iso' | 'date' | 'datetime' | 'time' = 'iso'): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: JAPAN_TIMEZONE,
    };

    switch (format) {
      case 'iso':
        return date.toLocaleString('sv-SE', { ...options, hour12: false }).replace(' ', 'T') + '+09:00';
      case 'date':
        return date.toLocaleDateString('ja-JP', options);
      case 'datetime':
        return date.toLocaleString('ja-JP', { ...options, hour12: false });
      case 'time':
        return date.toLocaleTimeString('ja-JP', { ...options, hour12: false });
      default:
        return date.toISOString();
    }
  }
}

/**
 * 日付計算ユーティリティ
 */
export class DateCalculator {
  /**
   * 日数を加算
   * @param date 基準日
   * @param days 加算する日数
   * @returns 新しい日付
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 時間を加算
   * @param date 基準日時
   * @param hours 加算する時間数
   * @returns 新しい日時
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + hours * 60 * 60 * 1000);
    return result;
  }

  /**
   * 分を加算
   * @param date 基準日時
   * @param minutes 加算する分数
   * @returns 新しい日時
   */
  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setTime(result.getTime() + minutes * 60 * 1000);
    return result;
  }

  /**
   * 2つの日付の差を日数で計算
   * @param date1 日付1
   * @param date2 日付2
   * @returns 差（日数）
   */
  static daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(date1.getTime() - date2.getTime()) / msPerDay;
  }

  /**
   * 2つの日付の差を時間で計算
   * @param date1 日時1
   * @param date2 日時2
   * @returns 差（時間）
   */
  static hoursBetween(date1: Date, date2: Date): number {
    const msPerHour = 1000 * 60 * 60;
    return Math.abs(date1.getTime() - date2.getTime()) / msPerHour;
  }

  /**
   * 月の開始日を取得
   * @param date 基準日
   * @returns 月の1日
   */
  static startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 月の終了日を取得
   * @param date 基準日
   * @returns 月の最終日
   */
  static endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 年の開始日を取得
   * @param date 基準日
   * @returns 年の1月1日
   */
  static startOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(0, 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 年の終了日を取得
   * @param date 基準日
   * @returns 年の12月31日
   */
  static endOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(11, 31);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}

/**
 * 日付範囲ユーティリティ
 */
export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date
  ) {
    if (start > end) {
      throw new Error('Start date must be before end date');
    }
  }

  /**
   * 指定日が範囲内かチェック
   * @param date チェックする日付
   * @returns 範囲内かどうか
   */
  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  /**
   * 範囲の日数を取得
   * @returns 範囲の日数
   */
  getDays(): number {
    return DateCalculator.daysBetween(this.start, this.end);
  }

  /**
   * 範囲内の日付リストを生成
   * @param stepDays ステップ日数（デフォルト: 1）
   * @returns 日付の配列
   */
  generateDates(stepDays: number = 1): Date[] {
    const dates: Date[] = [];
    let current = new Date(this.start);

    while (current <= this.end) {
      dates.push(new Date(current));
      current = DateCalculator.addDays(current, stepDays);
    }

    return dates;
  }

  /**
   * 2つの範囲が重複するかチェック
   * @param other 他の範囲
   * @returns 重複するかどうか
   */
  overlaps(other: DateRange): boolean {
    return this.start <= other.end && this.end >= other.start;
  }

  /**
   * 範囲を文字列で表現
   * @returns 範囲の文字列表現
   */
  toString(): string {
    return `${JapanTime.format(this.start, 'date')} - ${JapanTime.format(this.end, 'date')}`;
  }
}

/**
 * 日付キャッシュユーティリティ
 */
export class DateCache {
  private static cache = new Map<string, any>();

  /**
   * 日付ベースのキャッシュキーを生成
   * @param date 日付
   * @param prefix プレフィックス
   * @returns キャッシュキー
   */
  static generateKey(date: Date, prefix: string = ''): string {
    const timestamp = Math.floor(date.getTime() / 1000); // 秒単位
    return `${prefix}${timestamp}`;
  }

  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュされた値
   */
  static get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * キャッシュに値を設定
   * @param key キャッシュキー
   * @param value 設定する値
   * @param ttlMinutes TTL（分）
   */
  static set<T>(key: string, value: T, ttlMinutes: number = 60): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMinutes * 60 * 1000,
    });
  }

  /**
   * 期限切れのキャッシュをクリア
   */
  static clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && item.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 全キャッシュをクリア
   */
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * パフォーマンス計測ユーティリティ
 */
export class PerformanceUtils {
  private static timers = new Map<string, number>();

  /**
   * タイマー開始
   * @param label タイマーラベル
   */
  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  /**
   * タイマー終了と実行時間取得
   * @param label タイマーラベル
   * @returns 実行時間（ミリ秒）
   */
  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' not found`);
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);
    return duration;
  }

  /**
   * 関数の実行時間を計測
   * @param fn 実行する関数
   * @param label ラベル（オプション）
   * @returns 実行結果と実行時間
   */
  static async measure<T>(
    fn: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;

    if (label) {
      console.log(`${label}: ${duration.toFixed(2)}ms`);
    }

    return { result, duration };
  }

  /**
   * メモリ使用量を取得
   * @returns メモリ情報
   */
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      return {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100,
      };
    }

    // ブラウザ環境では推定値
    return {
      used: 0,
      total: 0,
      percentage: 0,
    };
  }
}

/**
 * 日付フォーマッタ
 */
export class DateFormatter {
  /**
   * 月相表示用の日付フォーマット
   * @param date 日付
   * @returns フォーマットされた文字列
   */
  static forMoonPhase(date: Date): string {
    return JapanTime.format(date, 'datetime');
  }

  /**
   * ログ用の日付フォーマット
   * @param date 日付
   * @returns ログ用フォーマット
   */
  static forLog(date: Date): string {
    return JapanTime.format(date, 'iso');
  }

  /**
   * ユーザー表示用の日付フォーマット
   * @param date 日付
   * @param includeTime 時刻を含むかどうか
   * @returns ユーザー向けフォーマット
   */
  static forUser(date: Date, includeTime: boolean = true): string {
    if (includeTime) {
      return date.toLocaleString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('ja-JP', {
        timeZone: JAPAN_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }

  /**
   * 相対時間表示
   * @param date 日付
   * @param baseDate 基準日（デフォルト: 現在時刻）
   * @returns 相対時間文字列
   */
  static relative(date: Date, baseDate: Date = new Date()): string {
    const diffMs = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (Math.abs(diffDays) >= 1) {
      return diffDays > 0 ? `${diffDays}日後` : `${Math.abs(diffDays)}日前`;
    } else if (Math.abs(diffHours) >= 1) {
      return diffHours > 0 ? `${diffHours}時間後` : `${Math.abs(diffHours)}時間前`;
    } else if (Math.abs(diffMinutes) >= 1) {
      return diffMinutes > 0 ? `${diffMinutes}分後` : `${Math.abs(diffMinutes)}分前`;
    } else {
      return 'たった今';
    }
  }
}