/**
 * セキュリティモジュール エントリーポイント
 * 
 * 月相壁紙アプリのセキュリティ機能を統合
 * OWASP Mobile Top 10 準拠
 * 日本法規制対応
 */

// セキュリティアーキテクチャ
export {
  SecurityArchitecture,
  SecurityLayer,
  SecurityLevel,
  ThreatLevel,
  type SecurityConfig,
  type EncryptionConfig,
  type AuditConfig,
  type PrivacyConfig,
  type SecurityMetrics
} from './SecurityArchitecture';

// 暗号化サービス
export {
  CryptoService,
  CryptoError,
  type EncryptionResult,
  type DecryptionResult
} from './CryptoService';

// セキュアストレージ
export {
  SecureStorage,
  SecureStorageError,
  DataClassification,
  type SecureStorageConfig,
  type StorageEntry,
  type StorageStats
} from './SecureStorage';

// 脆弱性チェック
export {
  VulnerabilityChecklistService,
  VulnerabilityCategory,
  VulnerabilitySeverity,
  CheckStatus,
  type VulnerabilityCheck,
  type CheckResult,
  type SecurityAuditReport
} from './VulnerabilityChecklistService';

// セキュリティ監査レポーター
export {
  SecurityAuditReporter,
  ReportFormat,
  type RemediationItem,
  type ComplianceAssessment,
  type SecurityMetrics as AuditSecurityMetrics
} from './SecurityAuditReporter';

// 法的文書
export {
  PrivacyPolicyManager,
  PRIVACY_POLICY_JP
} from './legal/PrivacyPolicy';

export {
  TermsOfServiceManager,
  TERMS_OF_SERVICE_JP
} from './legal/TermsOfService';

/**
 * セキュリティサービス統合クラス
 * 
 * 月相壁紙アプリのセキュリティ機能を統合管理
 */
export class MoonPhaseSecurityManager {
  private cryptoService: CryptoService;
  private secureStorage: SecureStorage;
  private vulnerabilityChecker: VulnerabilityChecklistService;
  private auditReporter: SecurityAuditReporter;

  constructor(securityConfig?: Partial<SecurityConfig>) {
    // セキュリティ設定初期化
    const config = {
      ...SecurityArchitecture.DEFAULT_CONFIG,
      ...securityConfig
    };

    // サービス初期化
    this.cryptoService = CryptoService.getInstance(config.encryption);
    this.secureStorage = new SecureStorage(config, this.cryptoService);
    this.vulnerabilityChecker = new VulnerabilityChecklistService();
    this.auditReporter = new SecurityAuditReporter();
  }

  /**
   * セキュアな設定保存
   */
  async saveUserSettings(
    userId: string,
    settings: any
  ): Promise<void> {
    await this.secureStorage.store(
      `user_settings_${userId}`,
      settings,
      DataClassification.CONFIDENTIAL
    );
  }

  /**
   * セキュアな設定取得
   */
  async getUserSettings(userId: string): Promise<any> {
    return await this.secureStorage.retrieve(
      `user_settings_${userId}`,
      DataClassification.CONFIDENTIAL
    );
  }

  /**
   * セキュリティ状態確認
   */
  async getSecurityStatus(): Promise<{
    score: number;
    issues: string[];
    recommendations: string[];
  }> {
    const auditReport = await this.vulnerabilityChecker.performSecurityAudit();
    
    return {
      score: auditReport.securityScore,
      issues: auditReport.detailedResults
        .filter(r => r.result.status === CheckStatus.FAIL)
        .map(r => r.check.name),
      recommendations: auditReport.detailedResults
        .filter(r => r.result.status === CheckStatus.FAIL)
        .flatMap(r => r.check.remediation)
    };
  }

  /**
   * 完全セキュリティ監査実行
   */
  async performFullSecurityAudit(): Promise<{
    executiveSummary: string;
    technicalDetails: string;
    score: number;
  }> {
    const report = await this.auditReporter.generateComprehensiveReport();
    
    return {
      executiveSummary: report.executiveSummary,
      technicalDetails: report.technicalDetails,
      score: report.securityMetrics.overallSecurityScore
    };
  }

  /**
   * プライバシーポリシー確認
   */
  async checkPrivacyCompliance(): Promise<{
    compliant: boolean;
    version: string;
    issues: string[];
  }> {
    const compliance = PrivacyPolicyManager.checkGDPRCompliance();
    const info = PrivacyPolicyManager.getPolicyInfo();
    
    return {
      compliant: compliance.compliant,
      version: info.version,
      issues: compliance.issues
    };
  }

  /**
   * セキュアデータクリーンアップ
   */
  async cleanupExpiredData(): Promise<number> {
    return await this.secureStorage.cleanupExpired();
  }

  /**
   * セキュリティメトリクス取得
   */
  getSecurityMetrics(): {
    crypto: any;
    storage: any;
  } {
    return {
      crypto: this.cryptoService.getSecurityMetrics(),
      storage: this.secureStorage.getAuditTrail().length
    };
  }

  /**
   * セキュリティ設定検証
   */
  validateConfiguration(): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    return SecurityArchitecture.validateSecurityConfig(
      SecurityArchitecture.DEFAULT_CONFIG
    );
  }
}

/**
 * セキュリティユーティリティ関数
 */
export class SecurityUtils {
  /**
   * パスワード強度チェック
   */
  static checkPasswordStrength(password: string): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 長さチェック
    if (password.length >= 12) score += 25;
    else if (password.length >= 8) score += 15;
    else issues.push('パスワードが短すぎます');

    // 複雑さチェック
    if (/[a-z]/.test(password)) score += 15;
    else suggestions.push('小文字を含めてください');

    if (/[A-Z]/.test(password)) score += 15;
    else suggestions.push('大文字を含めてください');

    if (/[0-9]/.test(password)) score += 15;
    else suggestions.push('数字を含めてください');

    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    else suggestions.push('記号を含めてください');

    // 一般的なパターンチェック
    if (!/(.)\1{2,}/.test(password)) score += 10;
    else issues.push('同じ文字の繰り返しを避けてください');

    return { score, issues, suggestions };
  }

  /**
   * セキュアランダム文字列生成
   */
  static async generateSecureToken(length: number = 32): Promise<string> {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = new Uint8Array(length);
    
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(values);
    } else {
      // フォールバック
      for (let i = 0; i < length; i++) {
        values[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return Array.from(values)
      .map(value => charset[value % charset.length])
      .join('');
  }

  /**
   * データ整合性ハッシュ計算
   */
  static async calculateIntegrityHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      return btoa(String.fromCharCode(...hashArray));
    }
    
    // フォールバック（本番では使用しない）
    return btoa(data).substring(0, 32);
  }

  /**
   * セキュリティヘッダー生成 (Web版用)
   */
  static generateSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  /**
   * 入力サニタイゼーション
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      })
      .trim()
      .substring(0, 1000); // 最大長制限
  }
}

/**
 * セキュリティ定数
 */
export const SECURITY_CONSTANTS = {
  /** 最小パスワード長 */
  MIN_PASSWORD_LENGTH: 8,
  /** 推奨パスワード長 */
  RECOMMENDED_PASSWORD_LENGTH: 12,
  /** 最大ログイン試行回数 */
  MAX_LOGIN_ATTEMPTS: 5,
  /** ロックアウト時間 (分) */
  LOCKOUT_DURATION_MINUTES: 15,
  /** セッション有効期限 (時間) */
  SESSION_TIMEOUT_HOURS: 24,
  /** データ保持期間 (日) */
  DATA_RETENTION_DAYS: 365,
  /** 監査ログ保持期間 (日) */
  AUDIT_LOG_RETENTION_DAYS: 90,
  /** 暗号化キー長 */
  ENCRYPTION_KEY_LENGTH: 256,
  /** PBKDF2反復回数 */
  PBKDF2_ITERATIONS: 100000,
  /** ソルト長 */
  SALT_LENGTH: 32
} as const;

/**
 * セキュリティイベント定義
 */
export enum SecurityEvent {
  /** ログイン成功 */
  LOGIN_SUCCESS = 'login_success',
  /** ログイン失敗 */
  LOGIN_FAILURE = 'login_failure',
  /** データアクセス */
  DATA_ACCESS = 'data_access',
  /** 設定変更 */
  SETTINGS_CHANGE = 'settings_change',
  /** セキュリティ違反 */
  SECURITY_VIOLATION = 'security_violation',
  /** データ暗号化 */
  DATA_ENCRYPTION = 'data_encryption',
  /** データ復号化 */
  DATA_DECRYPTION = 'data_decryption',
  /** セキュリティ監査 */
  SECURITY_AUDIT = 'security_audit'
}

// デフォルトエクスポート
export default MoonPhaseSecurityManager;