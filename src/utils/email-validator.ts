// Email Validation Utility - SPARC Implementation
// RFC 5322 compliant email validation with security considerations

import { promisify } from 'util';
import { resolve } from 'dns';

const resolveMx = promisify(resolve);

export interface EmailValidationResult {
  isValid: boolean;
  sanitizedEmail: string;
  errors: string[];
  warnings: string[];
  securityFlags: string[];
  mxValid?: boolean;
  internationalDomain?: boolean;
}

export interface EmailValidationOptions {
  strictMode?: boolean;
  allowInternational?: boolean;
  allowDisposable?: boolean;
  checkMX?: boolean;
  domainWhitelist?: string[];
  domainBlacklist?: string[];
  maxLength?: number;
  maxLocalLength?: number;
  maxDomainLength?: number;
}

export interface EmailValidatorConfig {
  strictMode?: boolean;
  defaultOptions?: EmailValidationOptions;
}

export class EmailValidator {
  private readonly config: EmailValidatorConfig;
  
  // Common disposable email domains (subset for demo)
  private readonly disposableDomains = new Set([
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org'
  ]);

  // Common domain typos
  private readonly commonDomainTypos = new Map([
    ['gmai.com', 'gmail.com'],
    ['gmial.com', 'gmail.com'],
    ['gmil.com', 'gmail.com'],
    ['yahooo.com', 'yahoo.com'],
    ['yaho.com', 'yahoo.com'],
    ['outlok.com', 'outlook.com'],
    ['hotmial.com', 'hotmail.com']
  ]);

  // Suspicious patterns
  private readonly suspiciousPatterns = [
    /^(admin|test|root)@(admin|test|localhost)$/i,
    /^.+@\d+\.\d+\.\d+\.\d+$/, // IP addresses
    /^(admin|test|root)@(admin|test)\.com$/i
  ];

  // RFC 5322 constants
  private static readonly MAX_EMAIL_LENGTH = 320;
  private static readonly MAX_LOCAL_LENGTH = 64;
  private static readonly MAX_DOMAIN_LENGTH = 253;

  constructor(config: EmailValidatorConfig = {}) {
    this.config = {
      strictMode: false,
      ...config
    };
  }

  /**
   * Validate an email address synchronously
   */
  validate(email: string | null | undefined, options: EmailValidationOptions = {}): EmailValidationResult {
    const opts = { ...this.config.defaultOptions, ...options };
    
    const result: EmailValidationResult = {
      isValid: true,
      sanitizedEmail: '',
      errors: [],
      warnings: [],
      securityFlags: []
    };

    // Handle null/undefined/empty inputs
    if (!email || typeof email !== 'string') {
      result.isValid = false;
      result.errors.push('Email is required and must be a string');
      return result;
    }

    // Perform security checks before sanitization to catch injection attempts
    this.performSecurityChecks(email, '', '', result);
    
    // Sanitize email
    result.sanitizedEmail = this.sanitizeEmail(email);
    
    // Basic structure validation
    if (!this.validateBasicStructure(result.sanitizedEmail, result)) {
      result.isValid = false;
      return result;
    }

    const [localPart, domainPart] = result.sanitizedEmail.split('@');

    // Length validations
    this.validateLengths(result.sanitizedEmail, localPart, domainPart, result, opts);

    // Local part validation
    this.validateLocalPart(localPart, result, opts);

    // Domain part validation
    this.validateDomainPart(domainPart, result, opts);

    // Additional security checks on parsed parts
    this.performAdditionalSecurityChecks(result.sanitizedEmail, localPart, domainPart, result);

    // Domain-specific checks
    this.performDomainChecks(domainPart, result, opts);

    // Set final validity
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate an email address asynchronously (with MX record checking)
   */
  async validateAsync(email: string | null | undefined, options: EmailValidationOptions = {}): Promise<EmailValidationResult> {
    const result = this.validate(email, options);

    // If basic validation failed, don't check MX
    if (!result.isValid || !options.checkMX) {
      return result;
    }

    // Check MX record
    await this.checkMXRecord(result.sanitizedEmail.split('@')[1], result);

    return result;
  }

  /**
   * Quick static validation method
   */
  static isValid(email: string): boolean {
    const validator = new EmailValidator();
    return validator.validate(email).isValid;
  }

  /**
   * Static sanitization method
   */
  static sanitize(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }
    return email.trim().toLowerCase();
  }

  /**
   * Sanitize email address
   */
  private sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Validate basic email structure
   */
  private validateBasicStructure(email: string, result: EmailValidationResult): boolean {
    // Must contain exactly one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      result.errors.push(atCount === 0 ? 'Email must contain @ symbol' : 'Email must contain exactly one @ symbol');
      return false;
    }

    // Must not start or end with @
    if (email.startsWith('@') || email.endsWith('@')) {
      result.errors.push('Email cannot start or end with @ symbol');
      return false;
    }

    // Basic character validation - no control characters
    if (/[\x00-\x1f\x7f-\x9f]/.test(email)) {
      result.errors.push('Email contains invalid control characters');
      result.securityFlags.push('INVALID_CHARACTERS');
      return false;
    }

    return true;
  }

  /**
   * Validate email and part lengths
   */
  private validateLengths(
    originalEmail: string,
    localPart: string,
    domainPart: string,
    result: EmailValidationResult,
    options: EmailValidationOptions
  ): void {
    const maxTotal = options.maxLength || EmailValidator.MAX_EMAIL_LENGTH;
    const maxLocal = options.maxLocalLength || EmailValidator.MAX_LOCAL_LENGTH;
    const maxDomain = options.maxDomainLength || EmailValidator.MAX_DOMAIN_LENGTH;

    // Check total length first
    if (originalEmail.length > maxTotal) {
      result.errors.push(`Email exceeds ${maxTotal} character limit`);
    }

    if (localPart.length > maxLocal) {
      result.errors.push(`Local part exceeds ${maxLocal} character limit`);
    }

    if (domainPart.length > maxDomain) {
      result.errors.push(`Domain part exceeds ${maxDomain} character limit`);
    }

    if (localPart.length === 0) {
      result.errors.push('Local part cannot be empty');
    }

    if (domainPart.length === 0) {
      result.errors.push('Domain part cannot be empty');
    }
  }

  /**
   * Validate local part (before @)
   */
  private validateLocalPart(localPart: string, result: EmailValidationResult, options: EmailValidationOptions): void {
    // Check for quoted strings first
    const isQuoted = localPart.startsWith('"') && localPart.endsWith('"');
    
    if (isQuoted) {
      // Strict mode validation
      if (this.config.strictMode || options.strictMode) {
        result.errors.push('Quoted strings not allowed in strict mode');
        return;
      }
      
      // In permissive mode, validate quoted string content
      const quotedContent = localPart.slice(1, -1);
      if (quotedContent.length === 0) {
        result.errors.push('Quoted string cannot be empty');
      }
      
      // Check for dangerous characters in quoted strings
      if (/[<>"'\\]/.test(quotedContent)) {
        result.securityFlags.push('POTENTIAL_XSS');
      }
      
      return; // Skip other validations for quoted strings
    }

    // For non-quoted strings
    // Cannot start or end with dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      result.errors.push('Local part cannot start or end with a dot');
    }

    // Cannot have consecutive dots
    if (localPart.includes('..')) {
      result.errors.push('Local part cannot contain consecutive dots');
    }

    // Valid characters check for unquoted local part
    const validLocalChars = /^[a-zA-Z0-9._%+-]+$/;
    if (!validLocalChars.test(localPart)) {
      // Check for potentially dangerous characters
      if (/[<>"'\\]/.test(localPart)) {
        result.errors.push('Local part contains potentially dangerous characters');
        result.securityFlags.push('POTENTIAL_XSS');
      } else {
        result.errors.push('Local part contains invalid characters');
      }
    }
  }

  /**
   * Validate domain part (after @)
   */
  private validateDomainPart(domainPart: string, result: EmailValidationResult, options: EmailValidationOptions): void {
    // Cannot start or end with dot or hyphen
    if (domainPart.startsWith('.') || domainPart.endsWith('.') || 
        domainPart.startsWith('-') || domainPart.endsWith('-')) {
      result.errors.push('Domain part cannot start or end with dot or hyphen');
    }

    // Cannot have consecutive dots
    if (domainPart.includes('..')) {
      result.errors.push('Domain part cannot contain consecutive dots');
    }

    // Must contain at least one dot
    if (!domainPart.includes('.')) {
      result.errors.push('Domain part must contain at least one dot');
    }

    // Check for international characters
    const hasInternational = /[^\x00-\x7F]/.test(domainPart);
    if (hasInternational) {
      result.internationalDomain = true;
      if (options.allowInternational === false) {
        result.errors.push('International characters not allowed');
      }
    }

    // Valid domain characters (ASCII mode)
    if (!hasInternational) {
      const validDomainChars = /^[a-zA-Z0-9.-]+$/;
      if (!validDomainChars.test(domainPart)) {
        if (/[<>"'\\]/.test(domainPart)) {
          result.errors.push('Domain part contains potentially dangerous characters');
          result.securityFlags.push('POTENTIAL_XSS');
        } else {
          result.errors.push('Domain part contains invalid characters');
        }
      }
    }

    // Validate TLD
    const parts = domainPart.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) {
      result.errors.push('Top-level domain must be at least 2 characters');
    }
  }

  /**
   * Perform initial security checks (before sanitization)
   */
  private performSecurityChecks(
    email: string,
    localPart: string,
    domainPart: string,
    result: EmailValidationResult
  ): void {
    // Check for newlines/carriage returns (header injection) - must be before sanitization
    if (/[\r\n]/.test(email)) {
      result.errors.push('Email contains invalid line break characters');
      result.securityFlags.push('POTENTIAL_INJECTION');
    }

    // Check for potential XSS patterns
    if (/[<>\"'\\]/.test(email)) {
      result.securityFlags.push('POTENTIAL_XSS');
    }

    // Check for script-like patterns
    if (/<script|javascript:|onclick=|onload=/i.test(email)) {
      result.securityFlags.push('POTENTIAL_XSS');
      result.errors.push('Email contains script-like patterns');
    }

    // Check for very long repeated characters (potential DOS)
    if (/(.)\1{20,}/.test(email)) {
      result.securityFlags.push('POTENTIAL_DOS');
    }
  }

  /**
   * Perform additional security checks after parsing
   */
  private performAdditionalSecurityChecks(
    email: string,
    localPart: string,
    domainPart: string,
    result: EmailValidationResult
  ): void {
    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(email)) {
        result.securityFlags.push('SUSPICIOUS_PATTERN');
        break;
      }
    }
  }

  /**
   * Perform domain-specific checks
   */
  private performDomainChecks(
    domainPart: string,
    result: EmailValidationResult,
    options: EmailValidationOptions
  ): void {
    // Whitelist check
    if (options.domainWhitelist && options.domainWhitelist.length > 0) {
      if (!options.domainWhitelist.includes(domainPart)) {
        result.errors.push('Domain not in whitelist');
      }
    }

    // Blacklist check
    if (options.domainBlacklist && options.domainBlacklist.includes(domainPart)) {
      result.errors.push('Domain is blacklisted');
    }

    // Disposable email check
    if (this.disposableDomains.has(domainPart)) {
      result.securityFlags.push('DISPOSABLE_EMAIL');
      if (options.allowDisposable === false) {
        result.errors.push('Disposable email addresses are not allowed');
      } else if (options.allowDisposable !== true) {
        result.warnings.push('Disposable email provider detected');
      }
    }

    // Typo detection
    if (this.commonDomainTypos.has(domainPart)) {
      const suggestion = this.commonDomainTypos.get(domainPart);
      result.warnings.push(`Possible domain typo detected. Did you mean ${suggestion}?`);
    }
  }

  /**
   * Check MX record for domain
   */
  private async checkMXRecord(domain: string, result: EmailValidationResult): Promise<void> {
    try {
      const records = await resolveMx(domain);
      result.mxValid = records && records.length > 0;
      if (!result.mxValid) {
        result.warnings.push('MX record not found');
      }
    } catch (error) {
      result.mxValid = false;
      result.warnings.push('MX record not found');
    }
  }
}

// Export utility functions for backward compatibility
export function isValidEmail(email: string): boolean {
  return EmailValidator.isValid(email);
}

export function sanitizeEmail(email: string): string {
  return EmailValidator.sanitize(email);
}

// Export enhanced type for use in other modules
export type ValidatedEmail = string & { readonly __emailValidated: unique symbol };

/**
 * Type guard function that creates a validated email type
 */
export function createValidatedEmail(email: string, options?: EmailValidationOptions): ValidatedEmail | null {
  const validator = new EmailValidator();
  const result = validator.validate(email, options);
  
  if (result.isValid) {
    return result.sanitizedEmail as ValidatedEmail;
  }
  
  return null;
}