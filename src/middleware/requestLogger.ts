import { Request, Response, NextFunction } from 'express';
import { RequestLoggerOptions, LogData, RequestWithTiming } from '../types/logger';

/**
 * Default format function for log messages
 * Format: [timestamp] method URL from IP (status - responseTime ms)
 */
const defaultFormat = (logData: LogData): string => {
  const { timestamp, method, url, ip, statusCode, responseTime } = logData;
  let message = `[${timestamp}] ${method} ${url} from ${ip}`;
  
  if (statusCode && responseTime !== undefined) {
    message += ` (${statusCode} - ${responseTime}ms)`;
  }
  
  return message;
};

/**
 * Default logger function using console.log
 */
const defaultLogger = (message: string): void => {
  console.log(message);
};

/**
 * Creates a request logging middleware for Express.js applications
 * 
 * @param options Configuration options for the logger
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { requestLogger } from './middleware/requestLogger';
 * 
 * // Basic usage
 * app.use(requestLogger());
 * 
 * // Custom configuration
 * app.use(requestLogger({
 *   includeResponseTime: true,
 *   includeUserAgent: true,
 *   skip: (req, res) => req.path === '/health'
 * }));
 * ```
 */
export const requestLogger = (options: RequestLoggerOptions = {}) => {
  const {
    format = defaultFormat,
    includeBody = false,
    includeResponseTime = true,
    includeUserAgent = false,
    logger = defaultLogger,
    skip
  } = options;

  return (req: RequestWithTiming, res: Response, next: NextFunction): void => {
    // Skip logging if skip function returns true
    if (skip && skip(req, res)) {
      return next();
    }

    // Record start time for response time calculation
    if (includeResponseTime) {
      req.startTime = Date.now();
    }

    // Create base log data
    const logData: LogData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip: getClientIP(req)
    };

    // Add optional fields
    if (includeUserAgent) {
      logData.userAgent = req.get('User-Agent');
    }

    if (includeBody && req.body) {
      logData.body = req.body;
    }

    // Hook into response finish event to log response details
    const originalSend = res.send;
    res.send = function(body) {
      // Calculate response time if enabled
      if (includeResponseTime && req.startTime) {
        logData.responseTime = Date.now() - req.startTime;
      }
      
      logData.statusCode = res.statusCode;
      
      // Log the request
      try {
        const message = format(logData);
        logger(message);
      } catch (error) {
        // Fallback logging if custom format fails
        console.error('Request logger format error:', error);
        logger(defaultFormat(logData));
      }
      
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Extracts client IP address from request, handling various proxy scenarios
 */
function getClientIP(req: Request): string {
  const forwarded = req.get('X-Forwarded-For');
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         (req.connection as any)?.socket?.remoteAddress || 
         'unknown';
}

/**
 * Pre-configured request logger with standard settings
 * Logs format: [timestamp] method URL from IP (status - responseTime ms)
 */
export const standardRequestLogger = requestLogger({
  includeResponseTime: true,
  includeUserAgent: false,
  includeBody: false
});

/**
 * Pre-configured request logger for development with verbose output
 * Includes user agent and skips health check endpoints
 */
export const developmentRequestLogger = requestLogger({
  includeResponseTime: true,
  includeUserAgent: true,
  includeBody: false,
  skip: (req) => req.path === '/health' || req.path === '/favicon.ico'
});

/**
 * Pre-configured request logger for production with minimal output
 * Excludes user agent and body, includes response time
 */
export const productionRequestLogger = requestLogger({
  includeResponseTime: true,
  includeUserAgent: false,
  includeBody: false,
  skip: (req) => req.path === '/health'
});