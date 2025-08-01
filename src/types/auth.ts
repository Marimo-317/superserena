// Authentication Types - SPARC Implementation
// Secure authentication interfaces with password support

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  // Note: passwordHash is intentionally excluded from public interface
}

export interface CreateUserWithPasswordRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthenticateUserRequest {
  email: string;
  password: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthenticationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export interface PasswordUpdateResult {
  success: boolean;
  error?: string;
}

// Enhanced email validation using comprehensive EmailValidator
import { EmailValidator, createValidatedEmail, ValidatedEmail } from '../utils/email-validator';

// Legacy type for backward compatibility
export type EmailAddress = string & { readonly __brand: unique symbol };

// New comprehensive email validation using EmailValidator
const emailValidator = new EmailValidator();

export function isValidEmail(email: string): email is EmailAddress {
  // Use comprehensive validation but maintain backward compatibility
  return emailValidator.validate(email).isValid;
}

// Enhanced validation with security checks
export function validateEmailSecurely(email: string): {
  isValid: boolean;
  sanitizedEmail: string;
  errors: string[];
  warnings: string[];
  securityFlags: string[];
} {
  return emailValidator.validate(email);
}

// Create a validated email type with comprehensive validation
export function createSecureEmail(email: string): ValidatedEmail | null {
  return createValidatedEmail(email, {
    strictMode: false,
    allowDisposable: false, // Block disposable emails by default for security
    checkMX: false // Skip MX check for sync validation
  });
}

// Security audit log entry
export interface SecurityAuditLog {
  timestamp: Date;
  userId?: string;
  email?: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED' | 'USER_CREATED';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}