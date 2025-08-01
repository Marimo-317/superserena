// Password Security Service - SPARC Implementation (Fixed)
// Implements OWASP password security guidelines with bcrypt hashing

import * as bcrypt from 'bcrypt';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordService {
  private readonly SALT_ROUNDS = 12;
  private readonly MIN_LENGTH = 8;
  private readonly MAX_LENGTH = 128;

  /**
   * Hash a plain text password using bcrypt with secure salt rounds
   * @param plainPassword - The plain text password to hash
   * @returns Promise<string> - The bcrypt hashed password
   */
  async hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword) {
      throw new Error('Password cannot be empty');
    }

    try {
      const hash = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
      return hash;
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a plain text password against a bcrypt hash
   * Uses constant-time comparison to prevent timing attacks
   * @param plainPassword - The plain text password to verify
   * @param hash - The bcrypt hash to compare against
   * @returns Promise<boolean> - True if password is correct
   */
  async verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
    if (!plainPassword || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(plainPassword, hash);
    } catch (error) {
      // Don't leak information about why verification failed
      return false;
    }
  }

  /**
   * Validate password strength according to security requirements
   * @param password - The password to validate
   * @returns PasswordValidationResult - Validation result with errors
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one digit
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for excessive repeated characters (more than 3 in a row)
    if (/(.)\1{3,}/.test(password)) {
      errors.push('Password cannot contain more than 3 repeated characters');
    }

    // Check for obvious sequential patterns (4 or more in sequence)
    if (/(?:abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl|jklm|klmn|lmno|mnop|nopq|opqr|pqrs|qrst|rstu|stuv|tuvw|uvwx|vwxy|wxyz)/i.test(password)) {
      errors.push('Password cannot contain obvious sequential characters');
    }

    // Check for obvious sequential numbers (4 or more in sequence)
    if (/(?:0123|1234|2345|3456|4567|5678|6789)/.test(password)) {
      errors.push('Password cannot contain obvious sequential numbers');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure random password (for testing/admin purposes)
   * @param length - The desired password length (default: 16)
   * @returns string - A cryptographically secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    // Ensure at least one character from each required category
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}