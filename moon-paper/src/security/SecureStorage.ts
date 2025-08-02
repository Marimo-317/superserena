/**
 * セキュアストレージサービス
 * 
 * expo-secure-store + 暗号化の二重保護
 * iOS Keychain / Android Keystore活用
 * データ分類別セキュリティポリシー適用
 */

import * as SecureStore from 'expo-secure-store';
import { CryptoService, EncryptionResult } from './CryptoService';
import { SecurityConfig, SecurityLevel, ThreatLevel } from './SecurityArchitecture';

/**
 * データ分類定義
 */
export enum DataClassification {
  /** 公開データ (暗号化不要) */
  PUBLIC = 'public',
  /** 内部データ (基本暗号化) */
  INTERNAL = 'internal',
  /** 機密データ (強化暗号化) */
  CONFIDENTIAL = 'confidential',
  /** 極秘データ (最大セキュリティ) */
  SECRET = 'secret'
}

/**
 * ストレージ設定
 */
export interface SecureStorageConfig {
  /** セキュリティレベル */
  securityLevel: SecurityLevel;
  /** 暗号化有効 */
  encryptionEnabled: boolean;
  /** 生体認証要求 */
  requireBiometrics: boolean;
  /** アクセス制御レベル */
  accessLevel: 'device' | 'user' | 'biometric';
  /** データ有効期限 (秒) */
  expirationTime?: number;
}

/**
 * ストレージエントリ
 */
export interface StorageEntry {
  /** データ分類 */
  classification: DataClassification;
  /** 暗号化データまたは平文 */
  data: string | EncryptionResult;
  /** 作成日時 */
  createdAt: number;
  /** 更新日時 */
  updatedAt: number;
  /** 有効期限 */
  expiresAt?: number;
  /** アクセス回数 */
  accessCount: number;
  /** データ整合性ハッシュ */
  checksum: string;
}

/**
 * ストレージ統計情報
 */
export interface StorageStats {
  /** 総エントリ数 */
  totalEntries: number;
  /** 暗号化エントリ数 */
  encryptedEntries: number;
  /** 期限切れエントリ数 */
  expiredEntries: number;
  /** 使用容量 (概算バイト) */
  usedSpace: number;
  /** セキュリティスコア */
  securityScore: number;
}

/**
 * セキュアストレージエラー
 */
export class SecureStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly classification: DataClassification,
    public readonly severity: ThreatLevel = ThreatLevel.MEDIUM
  ) {
    super(message);
    this.name = 'SecureStorageError';
  }
}

/**
 * セキュアストレージサービス
 * 
 * 特徴:
 * - データ分類別セキュリティポリシー
 * - 二重暗号化保護
 * - 生体認証統合
 * - 自動期限切れ削除
 * - アクセス監査
 */
export class SecureStorage {
  private readonly cryptoService: CryptoService;
  private readonly config: SecureStorageConfig;
  private readonly auditTrail: Array<{
    operation: string;
    key: string;
    classification: DataClassification;
    timestamp: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor(
    securityConfig: SecurityConfig,
    cryptoService: CryptoService,
    config: Partial<SecureStorageConfig> = {}
  ) {
    this.cryptoService = cryptoService;
    this.config = {
      securityLevel: securityConfig.level,
      encryptionEnabled: true,
      requireBiometrics: securityConfig.level === SecurityLevel.MAXIMUM,
      accessLevel: this.determineAccessLevel(securityConfig.level),
      ...config
    };
  }

  /**
   * データ保存
   * 
   * @param key ストレージキー
   * @param data 保存データ
   * @param classification データ分類
   * @param options 保存オプション
   */
  async store(
    key: string,
    data: any,
    classification: DataClassification,
    options: {
      expirationTime?: number;
      requireBiometrics?: boolean;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 入力検証
      this.validateKey(key);
      this.validateData(data);
      
      // セキュリティポリシー適用
      const policy = this.getSecurityPolicy(classification);
      
      // データシリアライズ
      const serializedData = JSON.stringify(data);
      
      // 暗号化決定
      let processedData: string | EncryptionResult;
      if (policy.requireEncryption && this.config.encryptionEnabled) {
        // デバイス固有パスワード生成
        const devicePassword = await this.generateDevicePassword(key, classification);
        processedData = await this.cryptoService.encrypt(serializedData, devicePassword);
      } else {
        processedData = serializedData;
      }
      
      // ストレージエントリ作成
      const entry: StorageEntry = {
        classification,
        data: processedData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: options.expirationTime 
          ? Date.now() + options.expirationTime * 1000 
          : undefined,
        accessCount: 0,
        checksum: await this.calculateChecksum(serializedData)
      };
      
      // expo-secure-storeに保存
      const storeOptions: SecureStore.SecureStoreOptions = {
        requireAuthentication: options.requireBiometrics ?? policy.requireBiometrics,
        keychainService: `moonphase_${classification}`,
        ...this.getSecureStoreOptions(classification)
      };
      
      await SecureStore.setItemAsync(
        this.getStorageKey(key, classification),
        JSON.stringify(entry),
        storeOptions
      );
      
      // 監査ログ記録
      this.logAccess('store', key, classification, true);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '保存エラー';
      
      this.logAccess('store', key, classification, false, errorMsg);
      
      throw new SecureStorageError(
        `データ保存に失敗しました: ${errorMsg}`,
        'STORAGE_FAILED',
        classification,
        this.getThreatLevel(classification)
      );
    }
  }

  /**
   * データ取得
   * 
   * @param key ストレージキー
   * @param classification データ分類
   * @returns 取得データ
   */
  async retrieve<T = any>(
    key: string,
    classification: DataClassification
  ): Promise<T | null> {
    try {
      this.validateKey(key);
      
      // expo-secure-storeから取得
      const storedEntry = await SecureStore.getItemAsync(
        this.getStorageKey(key, classification),
        this.getSecureStoreOptions(classification)
      );
      
      if (!storedEntry) {
        this.logAccess('retrieve', key, classification, true);
        return null;
      }
      
      // エントリ解析
      const entry: StorageEntry = JSON.parse(storedEntry);
      
      // 期限チェック
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.delete(key, classification);
        this.logAccess('retrieve', key, classification, false, '期限切れデータ');
        return null;
      }
      
      // データ復号化
      let rawData: string;
      if (typeof entry.data === 'object' && 'encryptedData' in entry.data) {
        // 暗号化データの復号化
        const devicePassword = await this.generateDevicePassword(key, classification);
        const decryptResult = await this.cryptoService.decrypt(
          entry.data as EncryptionResult,
          devicePassword
        );
        
        if (!decryptResult.verified) {
          throw new SecureStorageError(
            '復号化に失敗しました',
            'DECRYPTION_FAILED',
            classification,
            ThreatLevel.HIGH
          );
        }
        
        rawData = decryptResult.data;
      } else {
        rawData = entry.data as string;
      }
      
      // データ整合性チェック
      const calculatedChecksum = await this.calculateChecksum(rawData);
      if (calculatedChecksum !== entry.checksum) {
        throw new SecureStorageError(
          'データ整合性チェックに失敗しました',
          'INTEGRITY_CHECK_FAILED',
          classification,
          ThreatLevel.CRITICAL
        );
      }
      
      // アクセス回数更新
      entry.accessCount++;
      entry.updatedAt = Date.now();
      
      await SecureStore.setItemAsync(
        this.getStorageKey(key, classification),
        JSON.stringify(entry),
        this.getSecureStoreOptions(classification)
      );
      
      this.logAccess('retrieve', key, classification, true);
      
      return JSON.parse(rawData) as T;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '取得エラー';
      
      this.logAccess('retrieve', key, classification, false, errorMsg);
      
      if (error instanceof SecureStorageError) {
        throw error;
      }
      
      throw new SecureStorageError(
        `データ取得に失敗しました: ${errorMsg}`,
        'RETRIEVAL_FAILED',
        classification,
        this.getThreatLevel(classification)
      );
    }
  }

  /**
   * データ削除
   * 
   * @param key ストレージキー
   * @param classification データ分類
   */
  async delete(key: string, classification: DataClassification): Promise<void> {
    try {
      this.validateKey(key);
      
      await SecureStore.deleteItemAsync(
        this.getStorageKey(key, classification),
        this.getSecureStoreOptions(classification)
      );
      
      this.logAccess('delete', key, classification, true);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '削除エラー';
      
      this.logAccess('delete', key, classification, false, errorMsg);
      
      throw new SecureStorageError(
        `データ削除に失敗しました: ${errorMsg}`,
        'DELETION_FAILED',
        classification,
        ThreatLevel.LOW
      );
    }
  }

  /**
   * キー存在チェック
   * 
   * @param key ストレージキー
   * @param classification データ分類
   * @returns 存在フラグ
   */
  async exists(key: string, classification: DataClassification): Promise<boolean> {
    try {
      const data = await SecureStore.getItemAsync(
        this.getStorageKey(key, classification),
        this.getSecureStoreOptions(classification)
      );
      return data !== null;
    } catch {
      return false;
    }
  }

  /**
   * 期限切れデータクリーンアップ
   */
  async cleanupExpired(): Promise<number> {
    let cleanedCount = 0;
    
    try {
      // 全分類をスキャン
      for (const classification of Object.values(DataClassification)) {
        // 注意: expo-secure-storeには全キーを列挙する機能がないため、
        // アプリで管理する既知のキーのリストが必要
        // ここでは概念的な実装を示す
        const knownKeys = await this.getKnownKeys(classification);
        
        for (const key of knownKeys) {
          try {
            const storedEntry = await SecureStore.getItemAsync(
              this.getStorageKey(key, classification),
              this.getSecureStoreOptions(classification)
            );
            
            if (storedEntry) {
              const entry: StorageEntry = JSON.parse(storedEntry);
              if (entry.expiresAt && Date.now() > entry.expiresAt) {
                await this.delete(key, classification);
                cleanedCount++;
              }
            }
          } catch {
            // 個別のエラーは無視してクリーンアップを続行
            continue;
          }
        }
      }
      
      return cleanedCount;
      
    } catch (error) {
      throw new SecureStorageError(
        `クリーンアップに失敗しました: ${error}`,
        'CLEANUP_FAILED',
        DataClassification.INTERNAL,
        ThreatLevel.LOW
      );
    }
  }

  /**
   * ストレージ統計取得
   */
  async getStats(): Promise<StorageStats> {
    let totalEntries = 0;
    let encryptedEntries = 0;
    let expiredEntries = 0;
    let usedSpace = 0;
    
    try {
      for (const classification of Object.values(DataClassification)) {
        const knownKeys = await this.getKnownKeys(classification);
        
        for (const key of knownKeys) {
          try {
            const storedEntry = await SecureStore.getItemAsync(
              this.getStorageKey(key, classification),
              this.getSecureStoreOptions(classification)
            );
            
            if (storedEntry) {
              totalEntries++;
              usedSpace += storedEntry.length;
              
              const entry: StorageEntry = JSON.parse(storedEntry);
              
              if (typeof entry.data === 'object' && 'encryptedData' in entry.data) {
                encryptedEntries++;
              }
              
              if (entry.expiresAt && Date.now() > entry.expiresAt) {
                expiredEntries++;
              }
            }
          } catch {
            continue;
          }
        }
      }
      
      // セキュリティスコア計算
      const encryptionRatio = totalEntries > 0 ? encryptedEntries / totalEntries : 0;
      const securityScore = Math.round(encryptionRatio * 100);
      
      return {
        totalEntries,
        encryptedEntries,
        expiredEntries,
        usedSpace,
        securityScore
      };
      
    } catch (error) {
      throw new SecureStorageError(
        `統計取得に失敗しました: ${error}`,
        'STATS_FAILED',
        DataClassification.INTERNAL,
        ThreatLevel.LOW
      );
    }
  }

  /**
   * 監査ログ取得
   */
  getAuditTrail(): readonly typeof this.auditTrail[0][] {
    return [...this.auditTrail];
  }

  /**
   * セキュリティポリシー取得
   */
  private getSecurityPolicy(classification: DataClassification): {
    requireEncryption: boolean;
    requireBiometrics: boolean;
    accessLevel: string;
  } {
    switch (classification) {
      case DataClassification.SECRET:
        return {
          requireEncryption: true,
          requireBiometrics: true,
          accessLevel: 'biometric'
        };
      case DataClassification.CONFIDENTIAL:
        return {
          requireEncryption: true,
          requireBiometrics: this.config.securityLevel === SecurityLevel.MAXIMUM,
          accessLevel: 'user'
        };
      case DataClassification.INTERNAL:
        return {
          requireEncryption: this.config.encryptionEnabled,
          requireBiometrics: false,
          accessLevel: 'device'
        };
      case DataClassification.PUBLIC:
      default:
        return {
          requireEncryption: false,
          requireBiometrics: false,
          accessLevel: 'device'
        };
    }
  }

  /**
   * ストレージキー生成
   */
  private getStorageKey(key: string, classification: DataClassification): string {
    return `moonphase_${classification}_${key}`;
  }

  /**
   * SecureStore オプション生成
   */
  private getSecureStoreOptions(classification: DataClassification): SecureStore.SecureStoreOptions {
    const policy = this.getSecurityPolicy(classification);
    
    return {
      requireAuthentication: policy.requireBiometrics,
      keychainService: `moonphase_${classification}`,
      accessGroup: classification === DataClassification.SECRET ? 'moonphase.secret' : undefined
    };
  }

  /**
   * デバイス固有パスワード生成
   */
  private async generateDevicePassword(key: string, classification: DataClassification): Promise<string> {
    // デバイス固有情報とキーを組み合わせてパスワード生成
    const deviceInfo = await this.getDeviceInfo();
    const combined = `${deviceInfo}_${key}_${classification}_moonphase_v1`;
    
    // SHA-256でハッシュ化
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Base64エンコード
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * デバイス情報取得 (プライバシー配慮)
   */
  private async getDeviceInfo(): Promise<string> {
    // プライバシーを考慮した最小限のデバイス識別子
    // 実際の実装では expo-constants や expo-device を使用
    return 'device_moonphase_app';
  }

  /**
   * データ整合性ハッシュ計算
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * アクセスレベル決定
   */
  private determineAccessLevel(securityLevel: SecurityLevel): 'device' | 'user' | 'biometric' {
    switch (securityLevel) {
      case SecurityLevel.MAXIMUM:
        return 'biometric';
      case SecurityLevel.ENHANCED:
        return 'user';
      case SecurityLevel.BASIC:
      default:
        return 'device';
    }
  }

  /**
   * 脅威レベル取得
   */
  private getThreatLevel(classification: DataClassification): ThreatLevel {
    switch (classification) {
      case DataClassification.SECRET:
        return ThreatLevel.CRITICAL;
      case DataClassification.CONFIDENTIAL:
        return ThreatLevel.HIGH;
      case DataClassification.INTERNAL:
        return ThreatLevel.MEDIUM;
      case DataClassification.PUBLIC:
      default:
        return ThreatLevel.LOW;
    }
  }

  /**
   * 既知キー取得 (実装固有)
   * 
   * 注意: expo-secure-storeには全キーを列挙する機能がないため、
   * アプリケーションで管理する必要がある
   */
  private async getKnownKeys(classification: DataClassification): Promise<string[]> {
    // 月相壁紙アプリの既知キー定義
    const keyMap: Record<DataClassification, string[]> = {
      [DataClassification.PUBLIC]: ['app_version', 'theme_cache'],
      [DataClassification.INTERNAL]: ['user_preferences', 'notification_settings'],
      [DataClassification.CONFIDENTIAL]: ['wallpaper_settings', 'custom_themes'],
      [DataClassification.SECRET]: ['billing_info', 'premium_features']
    };
    
    return keyMap[classification] || [];
  }

  /**
   * 入力検証
   */
  private validateKey(key: string): void {
    if (!key || key.length === 0) {
      throw new SecureStorageError(
        'ストレージキーが空です',
        'INVALID_KEY',
        DataClassification.PUBLIC,
        ThreatLevel.LOW
      );
    }
    
    if (key.length > 100) {
      throw new SecureStorageError(
        'ストレージキーが長すぎます (100文字以下)',
        'KEY_TOO_LONG',
        DataClassification.PUBLIC,
        ThreatLevel.LOW
      );
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new SecureStorageError(
        'ストレージキーに無効な文字が含まれています',
        'INVALID_KEY_FORMAT',
        DataClassification.PUBLIC,
        ThreatLevel.LOW
      );
    }
  }

  /**
   * データ検証
   */
  private validateData(data: any): void {
    if (data === undefined) {
      throw new SecureStorageError(
        'データがundefinedです',
        'UNDEFINED_DATA',
        DataClassification.PUBLIC,
        ThreatLevel.LOW
      );
    }
    
    try {
      JSON.stringify(data);
    } catch {
      throw new SecureStorageError(
        'データをシリアライズできません',
        'NON_SERIALIZABLE_DATA',
        DataClassification.PUBLIC,
        ThreatLevel.LOW
      );
    }
  }

  /**
   * アクセスログ記録
   */
  private logAccess(
    operation: string,
    key: string,
    classification: DataClassification,
    success: boolean,
    error?: string
  ): void {
    this.auditTrail.push({
      operation,
      key,
      classification,
      timestamp: Date.now(),
      success,
      error
    });
    
    // ログサイズ制限
    if (this.auditTrail.length > 500) {
      this.auditTrail.splice(0, this.auditTrail.length - 500);
    }
    
    // セキュリティイベントのコンソール出力
    if (!success || classification === DataClassification.SECRET) {
      console.warn('SecureStorage Access:', {
        operation,
        classification,
        success,
        error
      });
    }
  }
}