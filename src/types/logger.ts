/**
 * Types for HTTP request logging middleware
 */

/**
 * Log entry data structure for HTTP requests
 */
export interface LogData {
  /** ISO timestamp of the request */
  timestamp: string;
  /** HTTP method (GET, POST, etc.) - sanitized */
  method: string;
  /** Request URL path - sanitized and length-limited */
  url: string;
  /** Client IP address - validated and optionally anonymized */
  ip: string;
  /** User agent string (optional) - sanitized and length-limited */
  userAgent?: string;
  /** Response status code (set after response) */
  statusCode?: number;
  /** Response time in milliseconds (set after response) */
  responseTime?: number;
}

/**
 * Configuration options for the request logger middleware
 */
export interface LoggerOptions {
  /** Custom log format function */
  format?: (logData: LogData) => string;
  /** Whether to include user agent in logs */
  includeUserAgent?: boolean;
  /** Whether to log response time */
  includeResponseTime?: boolean;
  /** Custom logger function (defaults to console.log) */
  logger?: (message: string) => void;
  /** Skip logging for certain paths (e.g., health checks) */
  skip?: (url: string) => boolean;
}

/**
 * Enhanced security options for secure request logger
 */
export interface SecureLoggerOptions extends LoggerOptions {
  /** Enable rate limiting protection (default: true) */
  enableRateLimiting?: boolean;
  /** Maximum URL length to log (default: 1000) */
  maxUrlLength?: number;
  /** Maximum User-Agent length to log (default: 500) */
  maxUserAgentLength?: number;
  /** Enable privacy mode - anonymizes IP addresses (default: false) */
  enablePrivacyMode?: boolean;
  /** Maximum requests per minute per IP (default: 1000) */
  maxRequestsPerMinute?: number;
  /** Enable input sanitization (default: true) */
  enableSanitization?: boolean;
}

/**
 * Security levels for pre-configured loggers
 */
export type SecurityLevel = 'basic' | 'standard' | 'high' | 'gdpr-compliant';

/**
 * Default log format function signature
 */
export type LogFormatter = (logData: LogData) => string;

/**
 * Security audit result for log entries
 */
export interface LogSecurityAudit {
  /** Whether the log entry passed security validation */
  isSecure: boolean;
  /** List of security issues found */
  issues: string[];
  /** Sanitized version of the log data */
  sanitizedData: LogData;
}