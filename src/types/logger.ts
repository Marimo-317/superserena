/**
 * Log level enumeration for request logging
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Interface for structured request logging data
 * Used by the request logger middleware to capture HTTP request/response metrics
 */
export interface RequestLogData {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;
  
  /** Full request URL including query parameters */
  url: string;
  
  /** Client IP address (extracted from headers or connection) */
  ip: string;
  
  /** User agent string from request headers */
  userAgent?: string;
  
  /** HTTP response status code */
  statusCode?: number;
  
  /** Request processing time in milliseconds */
  responseTime?: number;
  
  /** Response body size in bytes */
  responseSize?: number;
  
  /** ISO timestamp when request was received */
  timestamp: string;
  
  /** Unique identifier for request tracing */
  requestId?: string;
  
  /** Additional metadata for the request */
  metadata?: Record<string, any>;
}

/**
 * Configuration interface for request logger middleware
 */
export interface RequestLoggerOptions {
  /** Include user agent string in logs (default: false) */
  includeUserAgent?: boolean;
  
  /** Include response time measurement (default: true) */
  includeResponseTime?: boolean;
  
  /** Include response size calculation (default: false) */
  includeResponseSize?: boolean;
  
  /** Include additional metadata in logs (default: false) */
  includeMetadata?: boolean;
  
  /** Custom log message formatter function */
  formatter?: (data: RequestLogData) => string;
  
  /** Function to determine log level based on status code */
  logLevel?: (statusCode: number) => LogLevel;
  
  /** Function to determine if request should be skipped */
  skip?: (req: any) => boolean;
  
  /** Function to extract additional metadata from request */
  metadataExtractor?: (req: any, res: any) => Record<string, any>;
  
  /** Custom logger function (default: console) */
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
}

/**
 * Interface for request logger middleware factory
 */
export interface RequestLoggerFactory {
  (options?: RequestLoggerOptions): (req: any, res: any, next: any) => void;
}

/**
 * Interface for pre-configured logger instances
 */
export interface PreConfiguredLogger {
  /** Development logger with verbose output */
  development: (req: any, res: any, next: any) => void;
  
  /** Production logger with minimal overhead */
  production: (req: any, res: any, next: any) => void;
  
  /** Custom logger factory */
  create: RequestLoggerFactory;
}

/**
 * Interface for request metrics aggregation
 */
export interface RequestMetrics {
  /** Total number of requests */
  totalRequests: number;
  
  /** Requests by HTTP method */
  methodCounts: Record<string, number>;
  
  /** Requests by status code */
  statusCounts: Record<number, number>;
  
  /** Average response time in milliseconds */
  averageResponseTime: number;
  
  /** 95th percentile response time */
  p95ResponseTime: number;
  
  /** Total bytes transferred */
  totalBytes: number;
  
  /** Unique IP addresses */
  uniqueIps: Set<string>;
  
  /** Time window for metrics */
  timeWindow: {
    start: Date;
    end: Date;
  };
}

/**
 * Interface for metrics collector
 */
export interface MetricsCollector {
  /** Record a new request log entry */
  record(logData: RequestLogData): void;
  
  /** Get current metrics snapshot */
  getMetrics(): RequestMetrics;
  
  /** Reset metrics counters */
  reset(): void;
  
  /** Get metrics for specific time range */
  getMetricsForRange(start: Date, end: Date): RequestMetrics;
}

/**
 * Interface for log storage backend
 */
export interface LogStorage {
  /** Store a log entry */
  store(logData: RequestLogData): Promise<void>;
  
  /** Retrieve log entries with optional filtering */
  retrieve(filters?: {
    startTime?: Date;
    endTime?: Date;
    method?: string;
    statusCode?: number;
    ip?: string;
    limit?: number;
    offset?: number;
  }): Promise<RequestLogData[]>;
  
  /** Get log count with optional filtering */
  count(filters?: {
    startTime?: Date;
    endTime?: Date;
    method?: string;
    statusCode?: number;
    ip?: string;
  }): Promise<number>;
}