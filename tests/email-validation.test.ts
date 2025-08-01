// Email Validation Utility Tests - TDD Implementation
// RFC 5322 compliance and security testing

import { EmailValidator, EmailValidationResult, EmailValidationOptions } from '../src/utils/email-validator';

describe('EmailValidator', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator();
  });

  describe('Basic RFC 5322 Compliance', () => {
    it('should validate simple valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'admin+tag@example.org',
        'first.last@subdomain.example.com',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const result = validator.validate(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@missing-local.com',
        'missing-at-sign.com',
        'user@',
        'user@@domain.com',
        'user@domain.',
        '.user@domain.com',
        'user.@domain.com',
        'user..user@domain.com',
        'user@domain..com'
      ];

      invalidEmails.forEach(email => {
        const result = validator.validate(email);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should handle edge cases for local part', () => {
      // Valid edge cases
      expect(validator.validate('a@domain.com').isValid).toBe(true);
      expect(validator.validate('user+tag+more@domain.com').isValid).toBe(true);
      expect(validator.validate('user-name@domain.com').isValid).toBe(true);
      expect(validator.validate('user_name@domain.com').isValid).toBe(true);

      // Invalid edge cases
      expect(validator.validate('@domain.com').isValid).toBe(false);
      expect(validator.validate('.user@domain.com').isValid).toBe(false);
      expect(validator.validate('user.@domain.com').isValid).toBe(false);
    });

    it('should handle edge cases for domain part', () => {
      // Valid edge cases
      expect(validator.validate('user@domain.co.uk').isValid).toBe(true);
      expect(validator.validate('user@sub.domain.com').isValid).toBe(true);
      expect(validator.validate('user@123domain.com').isValid).toBe(true);

      // Invalid edge cases
      expect(validator.validate('user@').isValid).toBe(false);
      expect(validator.validate('user@domain.').isValid).toBe(false);
      expect(validator.validate('user@.domain.com').isValid).toBe(false);
      expect(validator.validate('user@domain..com').isValid).toBe(false);
    });
  });

  describe('Length Validation', () => {
    it('should enforce local part length limits (64 characters)', () => {
      const longLocal = 'a'.repeat(65);
      const result = validator.validate(`${longLocal}@domain.com`);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Local part exceeds 64 character limit');
    });

    it('should enforce domain part length limits (253 characters)', () => {
      const longDomain = 'a'.repeat(250) + '.com';
      const result = validator.validate(`user@${longDomain}`);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Domain part exceeds 253 character limit');
    });

    it('should enforce total email length limits (320 characters)', () => {
      const longLocal = 'a'.repeat(64);
      const longDomain = 'b'.repeat(260) + '.com'; // Make it longer to exceed 320 total
      const result = validator.validate(`${longLocal}@${longDomain}`);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email exceeds 320 character limit');
    });

    it('should accept emails within length limits', () => {
      const validLocal = 'a'.repeat(64);
      const validDomain = 'b'.repeat(60) + '.com';
      const result = validator.validate(`${validLocal}@${validDomain}`);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Security Considerations', () => {
    it('should detect potential security threats', () => {
      const xssThreats = [
        'user+<script>@domain.com',
        'user"@domain.com',
        'user\\@domain.com',
        'user@domain.com<script>'
      ];

      const injectionThreats = [
        'user@domain.com\n\r'
      ];

      xssThreats.forEach(email => {
        const result = validator.validate(email);
        expect(result.isValid).toBe(false);
        expect(result.securityFlags).toContain('POTENTIAL_XSS');
      });

      injectionThreats.forEach(email => {
        const result = validator.validate(email);
        expect(result.isValid).toBe(false);
        expect(result.securityFlags).toContain('POTENTIAL_INJECTION');
      });
    });

    it('should flag suspicious patterns', () => {
      const suspicious = [
        'admin@admin.com',
        'test@test.com',
        'root@localhost',
        'user@192.168.1.1'
      ];

      suspicious.forEach(email => {
        const result = validator.validate(email);
        expect(result.securityFlags).toContain('SUSPICIOUS_PATTERN');
      });
    });

    it('should detect common typos in domains', () => {
      const typos = [
        { email: 'user@gmai.com', suggestion: 'gmail.com' },
        { email: 'user@gmial.com', suggestion: 'gmail.com' },
        { email: 'user@yahooo.com', suggestion: 'yahoo.com' },
        { email: 'user@outlok.com', suggestion: 'outlook.com' }
      ];

      typos.forEach(({ email, suggestion }) => {
        const result = validator.validate(email);
        expect(result.warnings).toContain(`Possible domain typo detected. Did you mean ${suggestion}?`);
      });
    });

    it('should sanitize email addresses', () => {
      const dirtyEmail = '  USER@DOMAIN.COM  ';
      const result = validator.validate(dirtyEmail);
      expect(result.sanitizedEmail).toBe('user@domain.com');
    });
  });

  describe('Internationalization Support', () => {
    it('should handle international domain names', () => {
      const internationalEmails = [
        'user@münchen.de',
        'test@日本.jp',
        'admin@москва.рф'
      ];

      internationalEmails.forEach(email => {
        const result = validator.validate(email, { allowInternational: true });
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject international domains when not allowed', () => {
      const result = validator.validate('user@münchen.de', { allowInternational: false });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('International characters not allowed');
    });
  });

  describe('Configuration Options', () => {
    it('should respect strict mode settings', () => {
      const strictValidator = new EmailValidator({ strictMode: true });
      
      // Strict mode should reject quoted strings
      const result = strictValidator.validate('"user name"@domain.com');
      expect(result.isValid).toBe(false);
    });

    it('should allow quoted strings in permissive mode', () => {
      const permissiveValidator = new EmailValidator({ strictMode: false });
      
      const result = permissiveValidator.validate('"user name"@domain.com');
      expect(result.isValid).toBe(true);
    });

    it('should respect custom domain whitelist', () => {
      const options: EmailValidationOptions = {
        domainWhitelist: ['company.com', 'trusted.org']
      };

      expect(validator.validate('user@company.com', options).isValid).toBe(true);
      expect(validator.validate('user@untrusted.com', options).isValid).toBe(false);
    });

    it('should respect custom domain blacklist', () => {
      const options: EmailValidationOptions = {
        domainBlacklist: ['spam.com', 'fake.org']
      };

      expect(validator.validate('user@spam.com', options).isValid).toBe(false);
      expect(validator.validate('user@legitimate.com', options).isValid).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle null and undefined inputs', () => {
      expect(validator.validate(null as any).isValid).toBe(false);
      expect(validator.validate(undefined as any).isValid).toBe(false);
      expect(validator.validate('').isValid).toBe(false);
    });

    it('should handle very long inputs without crashing', () => {
      const veryLongEmail = 'a'.repeat(10000) + '@domain.com';
      const result = validator.validate(veryLongEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email exceeds 320 character limit');
    });

    it('should validate emails with special characters in local part', () => {
      const specialChars = [
        "user.name@domain.com",
        "user+tag@domain.com",
        "user-name@domain.com",
        "user_name@domain.com"
      ];

      specialChars.forEach(email => {
        const result = validator.validate(email);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Disposable Email Detection', () => {
    it('should detect disposable email providers', () => {
      const disposableEmails = [
        'user@10minutemail.com',
        'test@tempmail.org',
        'fake@guerrillamail.com'
      ];

      disposableEmails.forEach(email => {
        const result = validator.validate(email);
        expect(result.securityFlags).toContain('DISPOSABLE_EMAIL');
      });
    });

    it('should allow disposable emails when configured', () => {
      const options: EmailValidationOptions = {
        allowDisposable: true
      };

      const result = validator.validate('user@10minutemail.com', options);
      expect(result.isValid).toBe(true);
      expect(result.securityFlags).toContain('DISPOSABLE_EMAIL');
    });
  });

  describe('MX Record Validation', () => {
    it('should provide MX validation results when requested', async () => {
      const options: EmailValidationOptions = {
        checkMX: true
      };

      const result = await validator.validateAsync('user@gmail.com', options);
      expect(result.mxValid).toBeDefined();
    });

    it('should handle MX validation errors gracefully', async () => {
      const options: EmailValidationOptions = {
        checkMX: true
      };

      const result = await validator.validateAsync('user@nonexistentdomain12345.com', options);
      expect(result.mxValid).toBe(false);
      expect(result.warnings).toContain('MX record not found');
    });
  });

  describe('Integration with existing isValidEmail function', () => {
    it('should maintain backward compatibility', () => {
      // Test that our new validator can replace the existing simple function
      const simpleEmails = [
        'user@domain.com',
        'test@example.org',
        'invalid-email',
        '@missing.com'
      ];

      simpleEmails.forEach(email => {
        const newResult = validator.validate(email).isValid;
        const oldResult = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        
        if (oldResult) {
          expect(newResult).toBe(true);
        }
      });
    });
  });
});

describe('EmailValidator Static Methods', () => {
  describe('quick validation', () => {
    it('should provide quick validation method', () => {
      expect(EmailValidator.isValid('user@domain.com')).toBe(true);
      expect(EmailValidator.isValid('invalid-email')).toBe(false);
    });

    it('should provide sanitization method', () => {
      expect(EmailValidator.sanitize('  USER@DOMAIN.COM  ')).toBe('user@domain.com');
      expect(EmailValidator.sanitize('User+Tag@Domain.COM')).toBe('user+tag@domain.com');
    });
  });
});