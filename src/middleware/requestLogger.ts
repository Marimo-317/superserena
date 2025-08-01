import { Request, Response, NextFunction } from 'express';
import { LogData, LoggerOptions, LogFormatter } from '../types/logger';

/**
 * Default log formatter following the specified format: [timestamp] method URL from IP
 * @param logData - The log data to format
 * @returns Formatted log string
 */
const defaultFormatter: LogFormatter = (logData: LogData): string => {
  const { timestamp, method, url, ip, statusCode, responseTime } = logData;
  let logMessage = `[${timestamp}] ${method} ${url} from ${ip}`;
  
  if (statusCode !== undefined) {
    logMessage += ` - ${statusCode}`;
  }
  
  if (responseTime !== undefined) {
    logMessage += ` (${responseTime}ms)`;
  }
  
  return logMessage;
};

/**
 * Default skip function - skips nothing by default
 * @param url - The request URL
 * @returns false (don't skip any requests by default)
 */
const defaultSkip = (url: string): boolean => false;

/**
 * Creates a request logging middleware for Express.js
 * Logs incoming HTTP requests with timestamp, method, URL, and IP address
 * 
 * @param options - Configuration options for the logger
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { requestLogger } from './middleware/requestLogger';
 * 
 * // Basic usage
 * app.use(requestLogger());
 * 
 * // With custom options
 * app.use(requestLogger({
 *   includeUserAgent: true,
 *   includeResponseTime: true,
 *   skip: (url) => url === '/health'
 * }));
 * ```
 */
export const requestLogger = (options: LoggerOptions = {}) => {
  const {
    format = defaultFormatter,
    includeUserAgent = false,
    includeResponseTime = false,
    logger = console.log,
    skip = defaultSkip
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Extract IP address with fallback chain
    const ip = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req.headers?.['x-real-ip'] as string ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';

    // Skip logging if configured to do so
    if (skip(req.url)) {
      return next();
    }

    // Create base log data
    const logData: LogData = {
      timestamp,
      method: req.method,
      url: req.url,
      ip,
      ...(includeUserAgent && { userAgent: req.headers?.['user-agent'] })
    };

    // If response time logging is enabled, hook into response finish event
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
          logger(logMessage);
        } catch (error) {
          // Fallback to basic logging if custom formatter fails
          console.error('Logger formatting error:', error);
          logger(`[${timestamp}] ${req.method} ${req.url} from ${ip} - ${res.statusCode} (${responseTime}ms)`);
        }

        // Call original end method
        return originalEnd.call(this, chunk, encoding, callback);
      };
    } else {
      // Log immediately without response data
      try {
        const logMessage = format(logData);
        logger(logMessage);
      } catch (error) {
        // Fallback to basic logging if custom formatter fails
        console.error('Logger formatting error:', error);
        logger(`[${timestamp}] ${req.method} ${req.url} from ${ip}`);
      }
    }

    next();
  };
};

/**
 * Pre-configured request logger with response time logging
 * Useful for performance monitoring
 */
export const requestLoggerWithTiming = () => requestLogger({
  includeResponseTime: true
});

/**
 * Pre-configured request logger that skips health check endpoints
 * Useful for production environments to reduce log noise
 */
export const requestLoggerWithHealthSkip = () => requestLogger({
  skip: (url: string) => url === '/health' || url === '/ping' || url === '/status'
});

/**
 * Pre-configured request logger with full details
 * Includes user agent and response timing - useful for debugging
 */
export const detailedRequestLogger = () => requestLogger({
  includeUserAgent: true,
  includeResponseTime: true
});