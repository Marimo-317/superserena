import { Request, Response, NextFunction } from 'express';
import {
  RequestLoggerOptions,
  RequestLogData,
  RequestLoggerMiddleware,
  Logger
} from '../types/logger';

/**
 * Default console logger implementation
 */
class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }

  error(message: string): void {
    console.error(message);
  }
}

/**
 * Default formatting function for request logs
 * Format: [timestamp] method URL from IP
 * @param logData - The request log data
 * @returns Formatted log string
 */
const defaultFormat = (logData: RequestLogData): string => {
  const {
    timestamp,
    method,
    url,
    ip,
    statusCode,
    responseTime,
    userAgent,
    contentLength
  } = logData;

  let logMessage = `[${timestamp}] ${method} ${url} from ${ip}`;

  if (statusCode !== undefined) {
    logMessage += ` - ${statusCode}`;
  }

  if (responseTime !== undefined) {
    logMessage += ` - ${responseTime}ms`;
  }

  if (contentLength !== undefined) {
    logMessage += ` - ${contentLength} bytes`;
  }

  if (userAgent) {
    logMessage += ` - ${userAgent}`;
  }

  return logMessage;
};

/**
 * Creates a request logging middleware with the specified options
 * @param options - Configuration options for the logger
 * @param logger - Optional custom logger instance
 * @returns Express middleware function
 */
export const createRequestLogger = (
  options: RequestLoggerOptions = {},
  logger: Logger = new ConsoleLogger()
): RequestLoggerMiddleware => {
  const {
    includeBody = false,
    includeResponseTime = true,
    includeUserAgent = true,
    format = defaultFormat,
    skip
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging if skip function returns true
    if (skip && skip(req, res)) {
      next();
      return;
    }

    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Get client IP address (handles proxies)
    const getClientIP = (request: Request): string => {
      const xForwardedFor = request.headers['x-forwarded-for'];
      if (xForwardedFor) {
        const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
        return ips.split(',')[0].trim();
      }
      return request.headers['x-real-ip'] as string || 
             request.connection?.remoteAddress || 
             request.socket?.remoteAddress || 
             'unknown';
    };

    const ip = getClientIP(req);
    const userAgent = includeUserAgent ? req.headers['user-agent'] || 'unknown' : undefined;

    // Create initial log data
    const logData: RequestLogData = {
      timestamp,
      method: req.method,
      url: req.originalUrl || req.url,
      ip,
      userAgent,
      body: includeBody ? req.body : undefined
    };

    // Hook into response finish event to log completion
    const originalSend = res.send;
    const originalJson = res.json;
    let responseLogged = false;

    const logResponse = () => {
      if (responseLogged) return;
      responseLogged = true;

      const endTime = Date.now();
      const responseTime = includeResponseTime ? endTime - startTime : undefined;
      const contentLength = res.get('content-length');

      const completeLogData: RequestLogData = {
        ...logData,
        statusCode: res.statusCode,
        responseTime,
        contentLength
      };

      try {
        const logMessage = format(completeLogData);
        
        // Log at appropriate level based on status code
        if (res.statusCode >= 500) {
          logger.error(logMessage);
        } else if (res.statusCode >= 400) {
          logger.warn(logMessage);
        } else {
          logger.info(logMessage);
        }
      } catch (error) {
        logger.error(`Error formatting log message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Override response methods to capture completion
    res.send = function(body) {
      logResponse();
      return originalSend.call(this, body);
    };

    res.json = function(obj) {
      logResponse();
      return originalJson.call(this, obj);
    };

    // Also handle response finish event as backup
    res.on('finish', logResponse);
    res.on('close', logResponse);

    // Handle errors during request processing
    res.on('error', (error) => {
      logger.error(`Response error for ${req.method} ${req.url}: ${error.message}`);
    });

    next();
  };
};

/**
 * Default request logger middleware with standard configuration
 * Logs format: [timestamp] method URL from IP
 */
export const requestLogger: RequestLoggerMiddleware = createRequestLogger();

/**
 * Utility function to create a skip function for health check endpoints
 * @param paths - Array of paths to skip (default: ['/health', '/ping'])
 * @returns Skip function for use in RequestLoggerOptions
 */
export const skipHealthChecks = (paths: string[] = ['/health', '/ping']) => {
  return (req: Request, res: Response): boolean => {
    return paths.includes(req.path) || paths.includes(req.originalUrl);
  };
};

/**
 * Utility function to create a skip function for static assets
 * @param extensions - Array of file extensions to skip (default: ['.css', '.js', '.png', '.jpg', '.ico'])
 * @returns Skip function for use in RequestLoggerOptions
 */
export const skipStaticAssets = (extensions: string[] = ['.css', '.js', '.png', '.jpg', '.ico', '.svg']) => {
  return (req: Request, res: Response): boolean => {
    const url = req.originalUrl || req.url;
    return extensions.some(ext => url.endsWith(ext));
  };
};