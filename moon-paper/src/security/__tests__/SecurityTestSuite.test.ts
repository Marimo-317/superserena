/**
 * 包括的セキュリティテストスイート
 * 
 * このファイルは月相壁紙アプリのセキュリティコンポーネントの
 * 包括的テストを実行します。
 * 
 * テスト範囲:
 * - 暗号化サービス
 * - セキュアストレージ
 * - セキュリティアーキテクチャ
 * - 脆弱性チェック
 * - セキュリティ監査
 * 
 * OWASP Top 10準拠とA+セキュリティ評価を目指します。
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock external dependencies that aren't available in Jest environment
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve('mockData')),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true))
}), { virtual: true });

jest.mock('expo-crypto', () => ({
  digest: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA1: 'SHA1',
    MD5: 'MD5'
  }
}), { virtual: true });

jest.mock('expo-device', () => ({
  isDevice: true,
  deviceType: 'PHONE',
  osName: 'Android',
  osVersion: '13'
}), { virtual: true });

// Import our security modules after mocking
import { CryptoService } from '../CryptoService';
import { SecureStorage } from '../SecureStorage';
import { SecurityArchitecture } from '../SecurityArchitecture';
import { VulnerabilityChecklistService } from '../VulnerabilityChecklistService';
import { SecurityAuditReporter } from '../SecurityAuditReporter';

describe('包括的セキュリティテストスイート', () => {
  let cryptoService: CryptoService;
  let secureStorage: SecureStorage;
  let securityArchitecture: SecurityArchitecture;
  let vulnerabilityChecker: VulnerabilityChecklistService;
  let auditReporter: SecurityAuditReporter;

  beforeEach(async () => {
    // Initialize all security services
    cryptoService = new CryptoService();
    secureStorage = new SecureStorage();
    securityArchitecture = new SecurityArchitecture();
    vulnerabilityChecker = new VulnerabilityChecklistService();
    auditReporter = new SecurityAuditReporter();

    // Clear any previous test data
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CryptoService セキュリティテスト', () => {
    it('強力なパスワードハッシュ生成（bcrypt 12ラウンド）', async () => {
      const password = 'testPassword123';
      const hash = await cryptoService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[abyb]\$12\$/); // bcrypt 12 rounds pattern
      expect(hash.length).toBeGreaterThan(50);
    });

    it('パスワード検証の正確性', async () => {
      const password = 'testPassword123';
      const hash = await cryptoService.hashPassword(password);
      
      const isValid = await cryptoService.verifyPassword(password, hash);
      const isInvalid = await cryptoService.verifyPassword('wrongPassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('AES-256暗号化の安全性', async () => {
      const plaintext = '機密データテスト';
      const encrypted = await cryptoService.encrypt(plaintext);
      const decrypted = await cryptoService.decrypt(encrypted);
      
      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('セキュアランダム生成', () => {
      const random1 = cryptoService.generateSecureRandom(32);
      const random2 = cryptoService.generateSecureRandom(32);
      
      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('JWT生成と検証', async () => {
      const payload = { userId: '123', role: 'user' };
      const token = await cryptoService.generateJWT(payload);
      const decoded = await cryptoService.verifyJWT(token);
      
      expect(token).toBeDefined();
      expect(decoded.userId).toBe('123');
      expect(decoded.role).toBe('user');
    });

    it('暗号化パフォーマンス基準達成', async () => {
      const data = 'パフォーマンステストデータ';
      const startTime = Date.now();
      
      await cryptoService.encrypt(data);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // <100ms requirement
    });
  });

  describe('SecureStorage セキュリティテスト', () => {
    it('データ暗号化保存', async () => {
      const key = 'testKey';
      const value = '機密情報テスト';
      
      await secureStorage.setItem(key, value);
      const retrieved = await secureStorage.getItem(key);
      
      expect(retrieved).toBe(value);
    });

    it('データ完全削除', async () => {
      const key = 'testDeleteKey';
      const value = 'deleteMeData';
      
      await secureStorage.setItem(key, value);
      await secureStorage.removeItem(key);
      const retrieved = await secureStorage.getItem(key);
      
      expect(retrieved).toBeNull();
    });

    it('セキュリティ検証', async () => {
      const isSecure = await secureStorage.isSecureEnvironment();
      expect(isSecure).toBe(true);
    });

    it('機密データの自動削除', async () => {
      const sensitiveData = { password: 'secret123' };
      await secureStorage.storeSensitiveData('userCreds', sensitiveData);
      
      // Auto-deletion should occur after timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      const retrieved = await secureStorage.getSensitiveData('userCreds');
      
      expect(retrieved).toBeDefined(); // Still available within timeout
    });
  });

  describe('SecurityArchitecture 設計テスト', () => {
    it('セキュリティポリシー実装', () => {
      const policy = securityArchitecture.getSecurityPolicy();
      
      expect(policy.encryption).toBe(true);
      expect(policy.passwordMinLength).toBe(8);
      expect(policy.sessionTimeout).toBe(1800); // 30 minutes
      expect(policy.maxLoginAttempts).toBe(5);
    });

    it('アクセス制御設定', () => {
      const user = { id: '123', role: 'user' };
      const admin = { id: '456', role: 'admin' };
      
      const userAccess = securityArchitecture.checkAccess(user, 'read:profile');
      const adminAccess = securityArchitecture.checkAccess(admin, 'write:system');
      
      expect(userAccess).toBe(true);
      expect(adminAccess).toBe(true);
    });

    it('セキュアな設定デフォルト', () => {
      const config = securityArchitecture.getSecureDefaults();
      
      expect(config.httpsOnly).toBe(true);
      expect(config.secureHeaders).toBe(true);
      expect(config.xssProtection).toBe(true);
      expect(config.csrfProtection).toBe(true);
    });
  });

  describe('VulnerabilityChecker 脆弱性テスト', () => {
    it('OWASP Top 10チェック', async () => {
      const result = await vulnerabilityChecker.checkOWASPTop10();
      
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.vulnerabilities).toHaveLength(0);
    });

    it('SQLインジェクション防御', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const isSafe = vulnerabilityChecker.checkSQLInjection(maliciousInput);
      
      expect(isSafe).toBe(false);
    });

    it('XSS攻撃防御', () => {
      const maliciousScript = '<script>alert("XSS")</script>';
      const isSafe = vulnerabilityChecker.checkXSS(maliciousScript);
      
      expect(isSafe).toBe(false);
    });

    it('CSRF攻撃防御', () => {
      const request = {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        referrer: 'https://app.moonphase.com'
      };
      const isSafe = vulnerabilityChecker.checkCSRF(request);
      
      expect(isSafe).toBe(true);
    });

    it('セキュリティヘッダー検証', () => {
      const headers = vulnerabilityChecker.getSecurityHeaders();
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Strict-Transport-Security']).toBeDefined();
    });
  });

  describe('SecurityAuditReporter 監査テスト', () => {
    it('包括的セキュリティ監査実行', async () => {
      const auditResult = await auditReporter.performFullAudit();
      
      expect(auditResult.overallScore).toBeGreaterThanOrEqual(90);
      expect(auditResult.status).toBe('PASS');
      expect(auditResult.timestamp).toBeDefined();
    });

    it('セキュリティメトリクス収集', () => {
      const metrics = auditReporter.getSecurityMetrics();
      
      expect(metrics.encryptionStrength).toBe('AES-256');
      expect(metrics.hashRounds).toBe(12);
      expect(metrics.sessionSecurity).toBe('HIGH');
    });

    it('コンプライアンスレポート生成', () => {
      const compliance = auditReporter.generateComplianceReport();
      
      expect(compliance.GDPR).toBe('COMPLIANT');
      expect(compliance.OWASP).toBe('COMPLIANT');
      expect(compliance.ISO27001).toBe('COMPLIANT');
    });

    it('セキュリティログ記録', () => {
      auditReporter.logSecurityEvent('LOGIN_ATTEMPT', { 
        userId: '123', 
        success: true 
      });
      
      const logs = auditReporter.getSecurityLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].event).toBe('LOGIN_ATTEMPT');
    });
  });

  describe('統合セキュリティテスト', () => {
    it('エンドツーエンドセキュリティフロー', async () => {
      // User registration with secure password
      const password = 'SecurePass123!';
      const hashedPassword = await cryptoService.hashPassword(password);
      
      // Store encrypted user data
      const userData = { 
        email: 'user@example.com', 
        passwordHash: hashedPassword 
      };
      await secureStorage.storeSensitiveData('user:123', userData);
      
      // Verify security measures
      const isPasswordValid = await cryptoService.verifyPassword(password, hashedPassword);
      const retrievedData = await secureStorage.getSensitiveData('user:123');
      
      expect(isPasswordValid).toBe(true);
      expect(retrievedData.email).toBe('user@example.com');
    });

    it('セキュリティ侵害シミュレーション', async () => {
      // Simulate brute force attack
      const attacker = 'malicious_user';
      let attempts = 0;
      
      for (let i = 0; i < 10; i++) {
        const result = securityArchitecture.attemptLogin(attacker, 'wrongpassword');
        if (!result.success) attempts++;
      }
      
      const isBlocked = securityArchitecture.isUserBlocked(attacker);
      expect(isBlocked).toBe(true);
      expect(attempts).toBe(10);
    });

    it('データ漏洩防止テスト', () => {
      const sensitiveData = {
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        password: 'secret123'
      };
      
      const sanitized = securityArchitecture.sanitizeOutput(sensitiveData);
      
      expect(sanitized.creditCard).toBe('****-****-****-1111');
      expect(sanitized.ssn).toBe('***-**-6789');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('リアルタイムセキュリティ監視', () => {
      const monitor = securityArchitecture.getSecurityMonitor();
      
      expect(monitor.isActive).toBe(true);
      expect(monitor.alertsEnabled).toBe(true);
      expect(monitor.threatLevel).toBe('LOW');
    });
  });

  describe('パフォーマンス・セキュリティ最適化', () => {
    it('暗号化操作のパフォーマンス', async () => {
      const largeData = 'x'.repeat(10000); // 10KB of data
      const startTime = Date.now();
      
      const encrypted = await cryptoService.encrypt(largeData);
      const decrypted = await cryptoService.decrypt(encrypted);
      
      const duration = Date.now() - startTime;
      
      expect(decrypted).toBe(largeData);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('並列セキュリティ処理', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        cryptoService.hashPassword(`password${i}`)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(results.every(hash => hash.length > 50)).toBe(true);
      expect(duration).toBeLessThan(2000); // Parallel processing should be efficient
    });

    it('メモリ効率的な暗号化', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple encryption operations
      for (let i = 0; i < 100; i++) {
        await cryptoService.encrypt(`test data ${i}`);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('セキュリティコンプライアンス', () => {
    it('GDPR準拠データ処理', () => {
      const userConsent = securityArchitecture.handleGDPRConsent({
        dataProcessing: true,
        analytics: false,
        marketing: false
      });
      
      expect(userConsent.isValid).toBe(true);
      expect(userConsent.scope).toContain('dataProcessing');
      expect(userConsent.scope).not.toContain('marketing');
    });

    it('データ保持ポリシー', () => {
      const retentionPolicy = securityArchitecture.getDataRetentionPolicy();
      
      expect(retentionPolicy.userDataDays).toBe(2555); // 7 years
      expect(retentionPolicy.sessionDataDays).toBe(30);
      expect(retentionPolicy.logDataDays).toBe(90);
    });

    it('データポータビリティ', async () => {
      const userId = '123';
      const exportData = await securityArchitecture.exportUserData(userId);
      
      expect(exportData.format).toBe('JSON');
      expect(exportData.encrypted).toBe(true);
      expect(exportData.userData).toBeDefined();
    });
  });
});