import { Request, Response, NextFunction } from 'express';

/**
 * Configuration options for the request logger middleware
 */
export interface LoggerConfig {
  /** Include IP address in log output */
  includeIP?: boolean;
  /** Include user agent in log output */
  includeUserAgent?: boolean;
  /** Include response status in log output */
  includeStatus?: boolean;
  /** Include response time in log output */
  includeResponseTime?: boolean;
  /** Custom timestamp format function */
  timestampFormat?: () => string;
  /** Custom log format function */
  customFormat?: (logData: LogData) => string;
  /** Skip logging for certain routes (e.g., health checks) */
  skipPaths?: string[];
  /** Skip logging for certain HTTP methods */
  skipMethods?: string[];
}

/**
 * Data structure containing all request/response information for logging
 */
export interface LogData {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL/path */
  url: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** HTTP status code */
  status?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Timestamp of the request */
  timestamp: string;
}

/**
 * Express middleware function type for request logging
 */
export type RequestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

/**
 * Logger instance interface for dependency injection
 */
export interface Logger {
  /** Log an info message */
  info(message: string): void;
  /** Log an error message */
  error(message: string): void;
  /** Log a warning message */
  warn(message: string): void;
}