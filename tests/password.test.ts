// Password Service Tests - SPARC Implementation (Fixed)
// Comprehensive security testing for password hashing functionality

import { PasswordService } from '../src/password';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash = await passwordService.hashPassword(plainPassword);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt format
    });

    it('should generate different hashes for the same password', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash1 = await passwordService.hashPassword(plainPassword);
      const hash2 = await passwordService.hashPassword(plainPassword);
      
      expect(hash1).not.toBe(hash2); // Different salts = different hashes
    });

    it('should throw error for empty password', async () => {
      await expect(passwordService.hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for null password', async () => {
      await expect(passwordService.hashPassword(null as any)).rejects.toThrow('Password cannot be empty');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash = await passwordService.hashPassword(plainPassword);
      
      const isValid = await passwordService.verifyPassword(plainPassword, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'MySecure@Pass1';
      const wrongPassword = 'WrongPass456!';
      const hash = await passwordService.hashPassword(plainPassword);
      
      const isValid = await passwordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await passwordService.hashPassword('MySecure@Pass1');
      
      const isValid = await passwordService.verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await passwordService.verifyPassword('MySecure@Pass1', '');
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const isValid = await passwordService.verifyPassword('MySecure@Pass1', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const strongPassword = 'MySecure@Pass1';
      const result = passwordService.validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password too short', () => {
      const shortPassword = 'Pass1!';
      const result = passwordService.validatePasswordStrength(shortPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without lowercase', () => {
      const password = 'MYPASSWORD123!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase', () => {
      const password = 'mypassword123!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'MyPassword!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special characters', () => {
      const password = 'MyPassword123';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password with excessive repeated characters', () => {
      const password = 'MyPassssss1!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain more than 3 repeated characters');
    });

    it('should reject password with obvious sequential characters', () => {
      const password = 'MyAbcde123!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain obvious sequential characters');
    });

    it('should reject password with obvious sequential numbers', () => {
      const password = 'MyPass1234!';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain obvious sequential numbers');
    });

    it('should accept password with non-obvious sequences', () => {
      const password = 'MyPass135!z';
      const result = passwordService.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty password', () => {
      const result = passwordService.validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject password too long', () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = passwordService.validatePasswordStrength(longPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = passwordService.generateSecurePassword();
      
      expect(password).toHaveLength(16);
      
      // Validate it meets our strength requirements
      const validation = passwordService.validatePasswordStrength(password);
      expect(validation.isValid).toBe(true);
    });

    it('should generate password with custom length', () => {
      const length = 20;
      const password = passwordService.generateSecurePassword(length);
      
      expect(password).toHaveLength(length);
      
      // Validate it meets our strength requirements
      const validation = passwordService.validatePasswordStrength(password);
      expect(validation.isValid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = passwordService.generateSecurePassword();
      const password2 = passwordService.generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });

    it('should contain all required character types', () => {
      const password = passwordService.generateSecurePassword();
      
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/\d/.test(password)).toBe(true);    // numbers
      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true); // special chars
    });
  });

  describe('Performance Tests', () => {
    it('should hash password within reasonable time', async () => {
      const plainPassword = 'MySecure@Pass1';
      const startTime = Date.now();
      
      await passwordService.hashPassword(plainPassword);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should verify password within reasonable time', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash = await passwordService.hashPassword(plainPassword);
      
      const startTime = Date.now();
      await passwordService.verifyPassword(plainPassword, hash);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Security Tests', () => {
    it('should be resistant to timing attacks', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash = await passwordService.hashPassword(plainPassword);
      
      // Test multiple wrong passwords to ensure consistent timing
      const timings: number[] = [];
      const wrongPasswords = ['wrong1', 'wrong22', 'wrong333', 'wrong4444'];
      
      for (const wrongPassword of wrongPasswords) {
        const start = performance.now();
        await passwordService.verifyPassword(wrongPassword, hash);
        const end = performance.now();
        timings.push(end - start);
      }
      
      // Timing variance should be minimal (within reasonable bounds)
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const variance = maxTiming - minTiming;
      
      expect(variance).toBeLessThan(50); // Within 50ms variance
    });

    it('should use proper bcrypt salt rounds', async () => {
      const plainPassword = 'MySecure@Pass1';
      const hash = await passwordService.hashPassword(plainPassword);
      
      // bcrypt hash format: $2b$rounds$salt...
      const parts = hash.split('$');
      expect(parts[1]).toBe('2b'); // bcrypt version
      expect(parseInt(parts[2])).toBeGreaterThanOrEqual(12); // At least 12 rounds
    });
  });
});