import { Request, Response } from 'express';

/**
 * Configuration options for the request logger middleware
 */
export interface RequestLoggerOptions {
  /** Whether to include request body in logs (default: false) */
  includeBody?: boolean;
  /** Whether to include response time in logs (default: true) */
  includeResponseTime?: boolean;
  /** Whether to include user agent in logs (default: true) */
  includeUserAgent?: boolean;
  /** Custom format function for log messages */
  format?: (logData: RequestLogData) => string;
  /** Whether to skip logging for certain requests */
  skip?: (req: Request, res: Response) => boolean;
}

/**
 * Data structure containing request logging information
 */
export interface RequestLogData {
  /** Timestamp of the request */
  timestamp: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL path */
  url: string;
  /** Client IP address */
  ip: string;
  /** HTTP status code of the response */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** User agent string from request headers */
  userAgent?: string;
  /** Request body (if enabled in options) */
  body?: any;
  /** Content length of the response */
  contentLength?: string | number;
}

/**
 * Function signature for request logger middleware
 */
export type RequestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: () => void
) => void;

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  /** Log an info message */
  info(message: string): void;
  /** Log a warning message */
  warn(message: string): void;
  /** Log an error message */
  error(message: string): void;
}