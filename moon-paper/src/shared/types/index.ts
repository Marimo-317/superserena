/**
 * 月相壁紙アプリ共通型定義
 * SuperSerena Development - SPARC Architecture
 */

// 月相関連の型定義
export interface MoonPhase {
  /** 月齢（0.0〜29.5） */
  moonAge: number;
  /** 月相名（日本語） */
  phaseName: string;
  /** 月相英語名 */
  phaseNameEn: string;
  /** 照度パーセンテージ（0〜100） */
  illumination: number;
  /** 計算日時 */
  calculatedAt: Date;
  /** 次の満月日時 */
  nextFullMoon?: Date;
  /** 次の新月日時 */
  nextNewMoon?: Date;
}

// テーマ関連の型定義
export interface Theme {
  /** テーマID */
  id: string;
  /** テーマ名（日本語） */
  name: string;
  /** テーマ名（英語） */
  nameEn: string;
  /** テーマタイプ */
  type: ThemeType;
  /** 画像ファイルパス */
  imagePath: string;
  /** 背景色 */
  backgroundColor: string;
  /** テキスト色 */
  textColor: string;
  /** アクセント色 */
  accentColor: string;
  /** プレミアムテーマかどうか */
  isPremium: boolean;
}

export type ThemeType = 'realistic' | 'minimal' | 'japanese' | 'artistic';

// 壁紙設定関連の型定義
export interface WallpaperSettings {
  /** 選択中のテーマID */
  selectedThemeId: string;
  /** 自動更新有効フラグ */
  autoUpdate: boolean;
  /** 更新間隔（時間） */
  updateInterval: number;
  /** ホーム画面に設定 */
  setHomeScreen: boolean;
  /** ロック画面に設定 */
  setLockScreen: boolean;
  /** バッテリー最適化モード */
  batteryOptimization: boolean;
}

// 通知設定関連の型定義
export interface NotificationSettings {
  /** 通知有効フラグ */
  enabled: boolean;
  /** 満月通知 */
  fullMoonNotification: boolean;
  /** 新月通知 */
  newMoonNotification: boolean;
  /** 通知時刻 */
  notificationTime: string; // HH:mm format
  /** 通知音 */
  sound: string;
  /** バイブレーション */
  vibration: boolean;
}

// アプリ設定関連の型定義
export interface AppSettings {
  /** 言語設定 */
  language: 'ja' | 'en';
  /** ダークモード */
  darkMode: boolean;
  /** 初回起動フラグ */
  isFirstLaunch: boolean;
  /** アプリバージョン */
  appVersion: string;
  /** 利用規約同意フラグ */
  termsAccepted: boolean;
  /** プライバシーポリシー同意フラグ */
  privacyAccepted: boolean;
}

// API関連の型定義
export interface ApiResponse<T> {
  /** 成功フラグ */
  success: boolean;
  /** データ */
  data?: T;
  /** エラーメッセージ */
  error?: string;
  /** タイムスタンプ */
  timestamp: string;
}

// エラー関連の型定義
export interface AppError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** エラー詳細 */
  details?: string;
  /** 発生時刻 */
  timestamp: Date;
  /** スタックトレース */
  stack?: string;
}

// ストレージ関連の型定義
export interface StorageData {
  wallpaperSettings: WallpaperSettings;
  notificationSettings: NotificationSettings;
  appSettings: AppSettings;
  lastMoonPhase?: MoonPhase;
  installedThemes: string[];
}

// パフォーマンス監視関連の型定義
export interface PerformanceMetrics {
  /** 計算時間（ミリ秒） */
  calculationTime: number;
  /** メモリ使用量（MB） */
  memoryUsage: number;
  /** バッテリー消費率（%） */
  batteryUsage: number;
  /** レンダリング時間（ミリ秒） */
  renderTime: number;
}

// 日本の季節関連の型定義
export interface JapaneseSeason {
  /** 季節名 */
  name: '春' | '夏' | '秋' | '冬';
  /** 季節英語名 */
  nameEn: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  /** 開始日 */
  startDate: string; // MM-DD format
  /** 終了日 */
  endDate: string; // MM-DD format
  /** 関連する色彩 */
  colors: string[];
  /** 関連する要素 */
  elements: string[];
}