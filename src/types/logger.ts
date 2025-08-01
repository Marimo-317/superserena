import { Request, Response } from 'express';

/**
 * Configuration options for the request logger middleware
 */
export interface RequestLoggerOptions {
  /** Custom format function for log messages */
  format?: (logData: LogData) => string;
  /** Whether to include request body in logs (default: false) */
  includeBody?: boolean;
  /** Whether to include response time in logs (default: true) */
  includeResponseTime?: boolean;
  /** Whether to include user agent in logs (default: false) */
  includeUserAgent?: boolean;
  /** Custom logger function (default: console.log) */
  logger?: (message: string) => void;
  /** Skip logging for certain requests */
  skip?: (req: Request, res: Response) => boolean;
}

/**
 * Data structure containing all information about the HTTP request
 */
export interface LogData {
  /** ISO timestamp of the request */
  timestamp: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Full URL path including query parameters */
  url: string;
  /** Client IP address */
  ip: string;
  /** HTTP status code of the response */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTime?: number;
  /** User agent string */
  userAgent?: string;
  /** Request body (if enabled) */
  body?: any;
}

/**
 * Extended Request interface with timing information
 */
export interface RequestWithTiming extends Request {
  startTime?: number;
}