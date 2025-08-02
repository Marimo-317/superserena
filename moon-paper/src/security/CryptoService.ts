/**
 * 暗号化・復号化サービス
 * 
 * AES-256-GCM実装
 * NIST SP 800-38D準拠
 * 暗号学的ランダム性確保
 */

import * as Crypto from 'expo-crypto';
import { EncryptionConfig, ThreatLevel } from './SecurityArchitecture';

/**
 * 暗号化結果インターフェース
 */
export interface EncryptionResult {
  /** 暗号化データ (Base64) */
  encryptedData: string;
  /** 初期化ベクタ (Base64) */
  iv: string;
  /** 認証タグ (Base64) - GCMモードのみ */
  authTag?: string;
  /** ソルト (Base64) */
  salt: string;
  /** 暗号化アルゴリズム */
  algorithm: string;
  /** タイムスタンプ */
  timestamp: number;
  /** データ整合性ハッシュ */
  checksum: string;
}

/**
 * 復号化結果インターフェース
 */
export interface DecryptionResult {
  /** 復号化データ */
  data: string;
  /** 検証ステータス */
  verified: boolean;
  /** エラーメッセージ */
  error?: string;
}

/**
 * 暗号化キー導出結果
 */
interface KeyDerivationResult {
  /** 導出されたキー */
  key: CryptoKey;
  /** ソルト */
  salt: Uint8Array;
}

/**
 * セキュリティ監査ログ
 */
interface SecurityAuditLog {
  /** 操作タイプ */
  operation: 'encrypt' | 'decrypt' | 'keyDerivation';
  /** タイムスタンプ */
  timestamp: number;
  /** 成功フラグ */
  success: boolean;
  /** データサイズ */
  dataSize: number;
  /** 実行時間 (ms) */
  executionTime: number;
  /** エラー情報 */
  error?: string;
}

/**
 * 暗号化エラー定義
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: ThreatLevel = ThreatLevel.HIGH
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * 暗号化・復号化サービス
 * 
 * 特徴:
 * - AES-256-GCM暗号化
 * - PBKDF2キー導出
 * - 暗号学的ランダム性
 * - 改ざん検知
 * - セキュリティ監査
 */
export class CryptoService {
  private readonly config: EncryptionConfig;
  private readonly auditLogs: SecurityAuditLog[] = [];
  private static instance: CryptoService;

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(config: EncryptionConfig): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService(config);
    }
    return CryptoService.instance;
  }

  /**
   * データ暗号化
   * 
   * @param data 暗号化対象データ
   * @param password パスワード
   * @returns 暗号化結果
   */
  async encrypt(data: string, password: string): Promise<EncryptionResult> {
    const startTime = Date.now();
    
    try {
      // 入力検証
      this.validateInput(data, password);
      
      // キー導出
      const keyResult = await this.deriveKey(password);
      
      // 初期化ベクタ生成 (暗号学的ランダム)
      const iv = await this.generateSecureRandom(12); // GCM推奨12バイト
      
      // データをUint8Arrayに変換
      const dataBuffer = new TextEncoder().encode(data);
      
      // 暗号化実行
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          tagLength: this.config.tagLength || 128
        },
        keyResult.key,
        dataBuffer
      );
      
      // 結果を分離 (暗号化データ + 認証タグ)
      const encryptedData = new Uint8Array(encryptedBuffer);
      const tagLength = (this.config.tagLength || 128) / 8;
      const ciphertext = encryptedData.slice(0, -tagLength);
      const authTag = encryptedData.slice(-tagLength);
      
      // チェックサム計算
      const checksum = await this.calculateChecksum(ciphertext);
      
      const result: EncryptionResult = {
        encryptedData: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        authTag: this.arrayBufferToBase64(authTag),
        salt: this.arrayBufferToBase64(keyResult.salt),
        algorithm: this.config.algorithm,
        timestamp: Date.now(),
        checksum
      };
      
      // 監査ログ記録
      this.logSecurityEvent({
        operation: 'encrypt',
        timestamp: Date.now(),
        success: true,
        dataSize: data.length,
        executionTime: Date.now() - startTime
      });
      
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '暗号化エラー';
      
      // 監査ログ記録
      this.logSecurityEvent({
        operation: 'encrypt',
        timestamp: Date.now(),
        success: false,
        dataSize: data.length,
        executionTime: Date.now() - startTime,
        error: errorMsg
      });
      
      throw new CryptoError(
        `暗号化に失敗しました: ${errorMsg}`,
        'ENCRYPTION_FAILED',
        ThreatLevel.HIGH
      );
    }
  }

  /**
   * データ復号化
   * 
   * @param encryptionResult 暗号化結果
   * @param password パスワード
   * @returns 復号化結果
   */
  async decrypt(
    encryptionResult: EncryptionResult, 
    password: string
  ): Promise<DecryptionResult> {
    const startTime = Date.now();
    
    try {
      // 入力検証
      this.validateEncryptionResult(encryptionResult);
      this.validatePassword(password);
      
      // ソルトからキー導出
      const salt = this.base64ToArrayBuffer(encryptionResult.salt);
      const key = await this.deriveKeyFromSalt(password, salt);
      
      // 暗号化データと認証タグを結合
      const ciphertext = this.base64ToArrayBuffer(encryptionResult.encryptedData);
      const authTag = this.base64ToArrayBuffer(encryptionResult.authTag || '');
      const encryptedData = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
      encryptedData.set(new Uint8Array(ciphertext));
      encryptedData.set(new Uint8Array(authTag), ciphertext.byteLength);
      
      // チェックサム検証
      const calculatedChecksum = await this.calculateChecksum(new Uint8Array(ciphertext));
      if (calculatedChecksum !== encryptionResult.checksum) {
        throw new CryptoError(
          'データ整合性チェックに失敗しました',
          'INTEGRITY_CHECK_FAILED',
          ThreatLevel.CRITICAL
        );
      }
      
      // 復号化実行
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: this.base64ToArrayBuffer(encryptionResult.iv),
          tagLength: this.config.tagLength || 128
        },
        key,
        encryptedData
      );
      
      const decryptedData = new TextDecoder().decode(decryptedBuffer);
      
      // 監査ログ記録
      this.logSecurityEvent({
        operation: 'decrypt',
        timestamp: Date.now(),
        success: true,
        dataSize: decryptedData.length,
        executionTime: Date.now() - startTime
      });
      
      return {
        data: decryptedData,
        verified: true
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '復号化エラー';
      
      // 監査ログ記録
      this.logSecurityEvent({
        operation: 'decrypt',
        timestamp: Date.now(),
        success: false,
        dataSize: 0,
        executionTime: Date.now() - startTime,
        error: errorMsg
      });
      
      return {
        data: '',
        verified: false,
        error: errorMsg
      };
    }
  }

  /**
   * パスワードベースキー導出 (PBKDF2)
   * 
   * @param password パスワード
   * @param providedSalt 指定ソルト (オプション)
   * @returns キー導出結果
   */
  private async deriveKey(password: string, providedSalt?: Uint8Array): Promise<KeyDerivationResult> {
    const startTime = Date.now();
    
    try {
      // ソルト生成または使用
      const salt = providedSalt || await this.generateSecureRandom(this.config.saltLength);
      
      // パスワードをキーマテリアルに変換
      const passwordBuffer = new TextEncoder().encode(password);
      const importedKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      // PBKDF2でキー導出
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.config.iterations,
          hash: 'SHA-256'
        },
        importedKey,
        {
          name: 'AES-GCM',
          length: this.config.keyLength
        },
        false,
        ['encrypt', 'decrypt']
      );
      
      // 監査ログ記録
      this.logSecurityEvent({
        operation: 'keyDerivation',
        timestamp: Date.now(),
        success: true,
        dataSize: password.length,
        executionTime: Date.now() - startTime
      });
      
      return {
        key: derivedKey,
        salt: salt
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'キー導出エラー';
      
      this.logSecurityEvent({
        operation: 'keyDerivation',
        timestamp: Date.now(),
        success: false,
        dataSize: password.length,
        executionTime: Date.now() - startTime,
        error: errorMsg
      });
      
      throw new CryptoError(
        `キー導出に失敗しました: ${errorMsg}`,
        'KEY_DERIVATION_FAILED',
        ThreatLevel.HIGH
      );
    }
  }

  /**
   * ソルトからキー導出
   */
  private async deriveKeyFromSalt(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const result = await this.deriveKey(password, new Uint8Array(salt));
    return result.key;
  }

  /**
   * 暗号学的ランダムバイト生成
   * 
   * @param length バイト長
   * @returns ランダムバイト配列
   */
  private async generateSecureRandom(length: number): Promise<Uint8Array> {
    try {
      // Expo Cryptoを使用した暗号学的ランダム生成
      const randomBytes = await Crypto.getRandomBytesAsync(length);
      return new Uint8Array(randomBytes);
    } catch (error) {
      // フォールバック: Web Crypto API
      const randomBytes = new Uint8Array(length);
      crypto.getRandomValues(randomBytes);
      return randomBytes;
    }
  }

  /**
   * チェックサム計算 (SHA-256)
   * 
   * @param data データ
   * @returns チェックサム (Base64)
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(new Uint8Array(hashBuffer));
  }

  /**
   * ArrayBufferをBase64に変換
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  /**
   * Base64をArrayBufferに変換
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }

  /**
   * 設定検証
   */
  private validateConfig(): void {
    if (this.config.keyLength < 256) {
      throw new CryptoError(
        'キー長は256bit以上である必要があります',
        'INVALID_KEY_LENGTH',
        ThreatLevel.HIGH
      );
    }

    if (this.config.iterations < 100000) {
      throw new CryptoError(
        'PBKDF2反復回数は100,000回以上である必要があります',
        'INSUFFICIENT_ITERATIONS',
        ThreatLevel.MEDIUM
      );
    }

    if (this.config.saltLength < 16) {
      throw new CryptoError(
        'ソルト長は16バイト以上である必要があります',
        'INSUFFICIENT_SALT_LENGTH',
        ThreatLevel.MEDIUM
      );
    }
  }

  /**
   * 入力検証
   */
  private validateInput(data: string, password: string): void {
    if (!data || data.length === 0) {
      throw new CryptoError(
        '暗号化対象データが空です',
        'EMPTY_DATA',
        ThreatLevel.LOW
      );
    }

    this.validatePassword(password);
  }

  /**
   * パスワード検証
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new CryptoError(
        'パスワードは8文字以上である必要があります',
        'WEAK_PASSWORD',
        ThreatLevel.HIGH
      );
    }
  }

  /**
   * 暗号化結果検証
   */
  private validateEncryptionResult(result: EncryptionResult): void {
    const required = ['encryptedData', 'iv', 'salt', 'algorithm', 'checksum'];
    for (const field of required) {
      if (!result[field as keyof EncryptionResult]) {
        throw new CryptoError(
          `必須フィールド ${field} が不足しています`,
          'INVALID_ENCRYPTION_RESULT',
          ThreatLevel.HIGH
        );
      }
    }

    // GCMモードの場合、認証タグが必須
    if (result.algorithm.includes('GCM') && !result.authTag) {
      throw new CryptoError(
        'GCMモードでは認証タグが必須です',
        'MISSING_AUTH_TAG',
        ThreatLevel.HIGH
      );
    }
  }

  /**
   * セキュリティイベントログ記録
   */
  private logSecurityEvent(log: SecurityAuditLog): void {
    this.auditLogs.push(log);
    
    // ログサイズ制限 (最大1000件)
    if (this.auditLogs.length > 1000) {
      this.auditLogs.splice(0, this.auditLogs.length - 1000);
    }
    
    // 重要なセキュリティイベントをコンソールに出力
    if (!log.success || log.executionTime > 5000) {
      console.warn('セキュリティイベント:', {
        operation: log.operation,
        success: log.success,
        executionTime: log.executionTime,
        error: log.error
      });
    }
  }

  /**
   * 監査ログ取得
   */
  getAuditLogs(): readonly SecurityAuditLog[] {
    return [...this.auditLogs];
  }

  /**
   * セキュリティメトリクス取得
   */
  getSecurityMetrics(): {
    totalOperations: number;
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
  } {
    const totalOps = this.auditLogs.length;
    const successfulOps = this.auditLogs.filter(log => log.success).length;
    const avgTime = totalOps > 0 
      ? this.auditLogs.reduce((sum, log) => sum + log.executionTime, 0) / totalOps 
      : 0;
    
    return {
      totalOperations: totalOps,
      successRate: totalOps > 0 ? (successfulOps / totalOps) * 100 : 0,
      averageExecutionTime: avgTime,
      errorRate: totalOps > 0 ? ((totalOps - successfulOps) / totalOps) * 100 : 0
    };
  }

  /**
   * インスタンスクリア (テスト用)
   */
  static clearInstance(): void {
    CryptoService.instance = undefined as any;
  }
}