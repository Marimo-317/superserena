import { Request, Response, NextFunction } from 'express';

/**
 * Interface for request logging data
 */
export interface RequestLogData {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL path */
  url: string;
  /** Client IP address */
  ip: string;
  /** User agent string */
  userAgent?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Response size in bytes */
  responseSize?: number;
  /** Request timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Configuration options for the request logger
 */
export interface RequestLoggerOptions {
  /** Whether to include user agent in logs */
  includeUserAgent?: boolean;
  /** Whether to include response time */
  includeResponseTime?: boolean;
  /** Whether to include response size */
  includeResponseSize?: boolean;
  /** Custom formatter function */
  formatter?: (data: RequestLogData) => string;
  /** Log level function based on status code */
  logLevel?: (statusCode: number) => 'info' | 'warn' | 'error';
  /** Skip logging for certain paths */
  skip?: (req: Request) => boolean;
}

/**
 * Default log level determination based on HTTP status code
 */
const defaultLogLevel = (statusCode: number): 'info' | 'warn' | 'error' => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
};

/**
 * Default log formatter
 */
const defaultFormatter = (data: RequestLogData): string => {
  const parts = [
    `[${data.timestamp}]`,
    data.method,
    data.url,
    `IP: ${data.ip}`,
    data.statusCode ? `Status: ${data.statusCode}` : null,
    data.responseTime ? `Time: ${data.responseTime}ms` : null,
    data.responseSize ? `Size: ${data.responseSize}b` : null,
    data.userAgent ? `UA: ${data.userAgent.substring(0, 50)}...` : null
  ].filter(Boolean);
  
  return parts.join(' | ');
};

/**
 * Extract client IP address from request headers
 */
const getClientIp = (req: Request): string => {
  // Check common headers for real IP
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  const xRealIp = req.headers['x-real-ip'] as string;
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIp) {
    return xRealIp;
  }
  
  // Fallback to connection remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         (req.connection as any)?.socket?.remoteAddress || 
         'unknown';
};

/**
 * Generate a unique request ID
 */
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Creates a request logging middleware for Express.js applications
 * 
 * @param options Configuration options for the logger
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * import { createRequestLogger } from './middleware/requestLogger';
 * 
 * app.use(createRequestLogger({
 *   includeUserAgent: true,
 *   includeResponseTime: true,
 *   skip: (req) => req.path === '/health'
 * }));
 * ```
 */
export const createRequestLogger = (options: RequestLoggerOptions = {}) => {
  const {
    includeUserAgent = false,
    includeResponseTime = true,
    includeResponseSize = false,
    formatter = defaultFormatter,
    logLevel = defaultLogLevel,
    skip
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging if skip function returns true
    if (skip && skip(req)) {
      return next();
    }

    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to request for potential use in other middleware
    (req as any).requestId = requestId;

    // Prepare initial log data
    const logData: RequestLogData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: getClientIp(req),
      timestamp: new Date().toISOString(),
      requestId,
      userAgent: includeUserAgent ? req.headers['user-agent'] : undefined
    };

    // Override res.end to capture response data
    const originalEnd = res.end;
    const originalWrite = res.write;
    let responseSize = 0;

    if (includeResponseSize) {
      res.write = function(chunk: any, encoding?: any, callback?: any) {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }
        return originalWrite.call(this, chunk, encoding, callback);
      };
    }

    res.end = function(chunk?: any, encoding?: any, callback?: any) {
      // Calculate response time
      if (includeResponseTime) {
        logData.responseTime = Date.now() - startTime;
      }

      // Capture response size
      if (includeResponseSize) {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
        }
        logData.responseSize = responseSize;
      }

      // Capture status code
      logData.statusCode = res.statusCode;

      // Log the request
      const logMessage = formatter(logData);
      const level = logLevel(res.statusCode);

      // Use appropriate console method based on log level
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        default:
          console.log(logMessage);
      }

      // Call original end method
      return originalEnd.call(this, chunk, encoding, callback);
    };

    next();
  };
};

/**
 * Pre-configured development logger with verbose output
 */
export const developmentLogger = createRequestLogger({
  includeUserAgent: true,
  includeResponseTime: true,
  includeResponseSize: true,
  formatter: (data) => {
    const timestamp = new Date(data.timestamp).toLocaleTimeString();
    return `🔍 [${timestamp}] ${data.method} ${data.url} | ${data.ip} | ${data.statusCode} | ${data.responseTime}ms | ${data.responseSize}b${data.userAgent ? ` | ${data.userAgent.substring(0, 50)}...` : ''}`;
  }
});

/**
 * Pre-configured production logger with minimal overhead
 */
export const productionLogger = createRequestLogger({
  includeUserAgent: false,
  includeResponseTime: true,
  includeResponseSize: false,
  skip: (req) => req.path === '/health' || req.path === '/favicon.ico',
  formatter: (data) => `${data.method} ${data.url} ${data.statusCode} ${data.responseTime}ms ${data.ip}`
});