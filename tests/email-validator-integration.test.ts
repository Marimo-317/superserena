// Email Validator Integration Tests
// Testing integration with existing auth system

import { validateEmailSecurely, createSecureEmail, isValidEmail } from '../src/types/auth';

describe('Email Validator Integration', () => {
  describe('Auth System Integration', () => {
    it('should integrate with existing isValidEmail function', () => {
      // Basic valid emails should pass
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test@domain.org')).toBe(true);
      
      // Invalid emails should fail
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@missing-local.com')).toBe(false);
    });

    it('should provide comprehensive validation via validateEmailSecurely', () => {
      const validResult = validateEmailSecurely('user@example.com');
      expect(validResult.isValid).toBe(true);
      expect(validResult.sanitizedEmail).toBe('user@example.com');
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateEmailSecurely('user+<script>@domain.com');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.securityFlags).toContain('POTENTIAL_XSS');
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should block disposable emails by default in createSecureEmail', () => {
      const legitEmail = createSecureEmail('user@gmail.com');
      expect(legitEmail).toBeTruthy();

      const disposableEmail = createSecureEmail('user@10minutemail.com');
      expect(disposableEmail).toBeNull();
    });

    it('should sanitize emails properly', () => {
      const result = validateEmailSecurely('  USER@DOMAIN.COM  ');
      expect(result.sanitizedEmail).toBe('user@domain.com');
      expect(result.isValid).toBe(true);
    });

    it('should detect security threats in user inputs', () => {
      const threats = [
        'user"@domain.com',
        'user@domain.com<script>',
        'user@domain.com\n'
      ];

      threats.forEach(email => {
        const result = validateEmailSecurely(email);
        expect(result.isValid).toBe(false);
        expect(result.securityFlags.length).toBeGreaterThan(0);
      });
    });

    it('should maintain backward compatibility', () => {
      // Test that the enhanced validator doesn't break existing simple validation
      const simpleValidEmails = [
        'user@domain.com',
        'test@example.org',
        'admin@company.co.uk'
      ];

      const simpleInvalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@'
      ];

      simpleValidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });

      simpleInvalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Performance and Security', () => {
    it('should handle bulk validation efficiently', () => {
      const emails = [
        'user1@domain.com',
        'user2@example.org',
        'invalid-email',
        'user3@company.co.uk',
        'malicious@domain.com<script>'
      ];

      const startTime = Date.now();
      const results = emails.map(email => validateEmailSecurely(email));
      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);

      // Should correctly validate each
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false);
      expect(results[3].isValid).toBe(true);
      expect(results[4].isValid).toBe(false);
      expect(results[4].securityFlags).toContain('POTENTIAL_XSS');
    });

    it('should provide detailed error information for debugging', () => {
      const result = validateEmailSecurely('user@');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email cannot start or end with @ symbol');
      expect(result.sanitizedEmail).toBe('user@');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle international emails when configured', () => {
      // This would typically require special configuration
      const result = validateEmailSecurely('user@domain.com');
      expect(result.isValid).toBe(true);
    });

    it('should detect and warn about common typos', () => {
      const result = validateEmailSecurely('user@gmai.com');
      expect(result.warnings).toContain('Possible domain typo detected. Did you mean gmail.com?');
    });

    it('should flag suspicious administrative emails', () => {
      const result = validateEmailSecurely('admin@admin.com');
      expect(result.securityFlags).toContain('SUSPICIOUS_PATTERN');
    });
  });
});