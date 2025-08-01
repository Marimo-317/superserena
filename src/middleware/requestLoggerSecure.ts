import { Request, Response, NextFunction } from 'express';
import { LogData, LoggerOptions, LogFormatter } from '../types/logger';

/**
 * Secure input sanitization for log injection prevention
 * Removes control characters, CRLF sequences, and ANSI escape codes
 */
const sanitizeForLogging = (input: string | undefined): string => {
  if (!input) return '';
  
  return input
    // Remove CRLF injection attempts
    .replace(/[\r\n]/g, '')
    // Remove ANSI escape sequences
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Remove other control characters except tab and space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length to prevent log flooding
    .substring(0, 1000)
    // Escape special characters for structured logging
    .replace(/["\\]/g, '\\$&');
};

/**
 * Secure IP address extraction with validation
 */
const extractSecureIP = (req: Request): string => {
  const forwardedFor = req.headers?.['x-forwarded-for'] as string;
  const realIP = req.headers?.['x-real-ip'] as string;
  const connectionIP = req.connection?.remoteAddress;
  const socketIP = req.socket?.remoteAddress;
  
  let ip = 'unknown';
  
  if (forwardedFor) {
    // Take first IP and validate format
    const firstIP = forwardedFor.split(',')[0]?.trim();
    if (firstIP && /^[\d\.:a-fA-F]+$/.test(firstIP)) {
      ip = firstIP;
    }
  } else if (realIP && /^[\d\.:a-fA-F]+$/.test(realIP)) {
    ip = realIP;
  } else if (connectionIP) {
    ip = connectionIP;
  } else if (socketIP) {
    ip = socketIP;
  }
  
  return sanitizeForLogging(ip);
};

/**
 * Rate limiting tracker for DoS protection
 */
class RequestTracker {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequestsPerMinute = 1000;
  private readonly cleanupInterval = 60000; // 1 minute
  
  constructor() {
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }
  
  isRateLimited(ip: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < this.cleanupInterval);
    
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      return true;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    
    return false;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [ip, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.cleanupInterval);
      if (recentRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recentRequests);
      }
    }
  }
}

const requestTracker = new RequestTracker();

/**
 * Secure default log formatter with proper escaping
 */
const secureDefaultFormatter: LogFormatter = (logData: LogData): string => {
  const { timestamp, method, url, ip, statusCode, responseTime } = logData;
  
  // Sanitize all user inputs
  const safeMethod = sanitizeForLogging(method);
  const safeUrl = sanitizeForLogging(url);
  const safeIP = sanitizeForLogging(ip);
  
  let logMessage = `[${timestamp}] ${safeMethod} ${safeUrl} from ${safeIP}`;
  
  if (statusCode !== undefined) {
    logMessage += ` - ${statusCode}`;
  }
  
  if (responseTime !== undefined) {
    logMessage += ` (${responseTime}ms)`;
  }
  
  return logMessage;
};

/**
 * Enhanced secure request logging middleware
 * Includes log injection prevention, rate limiting, and privacy controls
 */
export const secureRequestLogger = (options: LoggerOptions & {
  enableRateLimiting?: boolean;
  maxUrlLength?: number;
  maxUserAgentLength?: number;
  enablePrivacyMode?: boolean;
} = {}) => {
  const {
    format = secureDefaultFormatter,
    includeUserAgent = false,
    includeResponseTime = false,
    logger = console.log,
    skip = () => false,
    enableRateLimiting = true,
    maxUrlLength = 1000,
    maxUserAgentLength = 500,
    enablePrivacyMode = false
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Extract and secure IP address
    const ip = extractSecureIP(req);
    
    // Rate limiting protection
    if (enableRateLimiting && requestTracker.isRateLimited(ip)) {
      // Log rate limiting attempt
      logger(`[${timestamp}] RATE_LIMITED ${sanitizeForLogging(req.method)} ${sanitizeForLogging(req.url)} from ${ip}`);
      return next();
    }
    
    // Privacy mode: anonymize IP
    const displayIP = enablePrivacyMode ? 
      ip.replace(/\d+$/, 'xxx') : ip;
    
    // Skip logging if configured
    if (skip(req.url)) {
      return next();
    }

    // Sanitize and limit URL length
    const safeUrl = sanitizeForLogging(req.url).substring(0, maxUrlLength);
    
    // Create base log data with sanitized inputs
    const logData: LogData = {
      timestamp,
      method: sanitizeForLogging(req.method),
      url: safeUrl,
      ip: displayIP,
      ...(includeUserAgent && { 
        userAgent: sanitizeForLogging(req.headers?.['user-agent']).substring(0, maxUserAgentLength)
      })
    };

    // Response time logging with secure hooks
    if (includeResponseTime) {
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any, callback?: any) {
        const responseTime = Date.now() - startTime;
        const finalLogData: LogData = {
          ...logData,
          statusCode: res.statusCode,
          responseTime
        };

        try {
          const logMessage = format(finalLogData);
          logger(sanitizeForLogging(logMessage));
        } catch (error) {
          // Secure fallback logging without exposing error details
          const fallbackMessage = `[${timestamp}] ${logData.method} ${logData.url} from ${logData.ip} - ${res.statusCode} (${responseTime}ms)`;
          logger(sanitizeForLogging(fallbackMessage));
        }

        return originalEnd.call(this, chunk, encoding, callback);
      };
    } else {
      try {
        const logMessage = format(logData);
        logger(sanitizeForLogging(logMessage));
      } catch (error) {
        // Secure fallback logging
        const fallbackMessage = `[${timestamp}] ${logData.method} ${logData.url} from ${logData.ip}`;
        logger(sanitizeForLogging(fallbackMessage));
      }
    }

    next();
  };
};

/**
 * GDPR-compliant request logger with privacy protection
 */
export const gdprCompliantLogger = () => secureRequestLogger({
  enablePrivacyMode: true,
  includeUserAgent: false,
  enableRateLimiting: true
});

/**
 * High-security request logger for sensitive environments
 */
export const highSecurityLogger = () => secureRequestLogger({
  enableRateLimiting: true,
  maxUrlLength: 500,
  maxUserAgentLength: 200,
  enablePrivacyMode: true,
  skip: (url: string) => {
    // Skip sensitive endpoints
    return url.includes('/admin') || 
           url.includes('/internal') || 
           url.includes('/.well-known');
  }
});