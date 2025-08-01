import { Request, Response, NextFunction } from 'express';
import { LoggerConfig, LogData, RequestLoggerMiddleware, Logger } from '../types/logger';

/**
 * Default console logger implementation
 */
class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }
}

/**
 * Creates a request logger middleware with customizable configuration
 * 
 * @param config - Configuration options for the logger
 * @param logger - Optional custom logger instance (defaults to console)
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * // Basic usage
 * app.use(createRequestLogger());
 * 
 * // With configuration
 * app.use(createRequestLogger({
 *   includeIP: true,
 *   includeResponseTime: true,
 *   skipPaths: ['/health']
 * }));
 * ```
 */
export function createRequestLogger(
  config: LoggerConfig = {},
  logger: Logger = new ConsoleLogger()
): RequestLoggerMiddleware {
  const {
    includeIP = true,
    includeUserAgent = false,
    includeStatus = true,
    includeResponseTime = true,
    timestampFormat = () => new Date().toISOString(),
    customFormat,
    skipPaths = [],
    skipMethods = []
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Skip logging for specified paths
      if (skipPaths.includes(req.path)) {
        return next();
      }

      // Skip logging for specified methods
      if (skipMethods.includes(req.method.toUpperCase())) {
        return next();
      }

      const startTime = Date.now();
      const timestamp = timestampFormat();

      // Capture response completion using the 'finish' event
      res.on('finish', () => {
        try {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          const logData: LogData = {
            method: req.method,
            url: req.originalUrl || req.url,
            timestamp,
            ...(includeIP && { ip: getClientIP(req) }),
            ...(includeUserAgent && { userAgent: req.get('User-Agent') }),
            ...(includeStatus && { status: res.statusCode }),
            ...(includeResponseTime && { responseTime })
          };

          const logMessage = customFormat ? customFormat(logData) : formatLogMessage(logData);
          
          // Log based on status code
          if (res.statusCode >= 500) {
            logger.error(logMessage);
          } else if (res.statusCode >= 400) {
            logger.warn(logMessage);
          } else {
            logger.info(logMessage);
          }
        } catch (error) {
          // Don't let logging errors break the response, but log the error
          logger.error(`Request logger error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

      next();
    } catch (error) {
      // Don't let logging errors break the request
      logger.error(`Request logger error: ${error instanceof Error ? error.message : String(error)}`);
      next();
    }
  };
}

/**
 * Default log message formatter
 * 
 * @param logData - The log data to format
 * @returns Formatted log message string
 */
function formatLogMessage(logData: LogData): string {
  const parts = [
    `[${logData.timestamp}]`,
    logData.method,
    logData.url
  ];

  if (logData.ip) {
    parts.push(`from ${logData.ip}`);
  }

  if (logData.status) {
    parts.push(`- ${logData.status}`);
  }

  if (logData.responseTime) {
    parts.push(`(${logData.responseTime}ms)`);
  }

  if (logData.userAgent) {
    parts.push(`"${logData.userAgent}"`);
  }

  return parts.join(' ');
}

/**
 * Extracts the client IP address from the request
 * 
 * @param req - Express request object
 * @returns Client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Pre-configured request logger with sensible defaults
 * Format: [timestamp] method URL from IP - status (responseTime)
 */
export const requestLogger = createRequestLogger({
  includeIP: true,
  includeStatus: true,
  includeResponseTime: true,
  includeUserAgent: false,
  skipPaths: ['/favicon.ico']
});

/**
 * Minimal request logger (basic format matching existing implementation)
 * Format: [timestamp] method URL
 */
export const minimalRequestLogger = createRequestLogger({
  includeIP: false,
  includeStatus: false,
  includeResponseTime: false,
  includeUserAgent: false
});

export default requestLogger;