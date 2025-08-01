import { Request, Response, NextFunction } from 'express';
import { createRequestLogger, requestLogger, minimalRequestLogger } from '../src/middleware/requestLogger';
import { Logger, LoggerConfig } from '../src/types/logger';

// Mock logger for testing
class MockLogger implements Logger {
  public infoMessages: string[] = [];
  public errorMessages: string[] = [];
  public warnMessages: string[] = [];

  info(message: string): void {
    this.infoMessages.push(message);
  }

  error(message: string): void {
    this.errorMessages.push(message);
  }

  warn(message: string): void {
    this.warnMessages.push(message);
  }

  clear(): void {
    this.infoMessages = [];
    this.errorMessages = [];
    this.warnMessages = [];
  }
}

// Mock Express request and response objects
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    url: '/test',
    originalUrl: '/test',
    path: '/test',
    headers: {},
    connection: { remoteAddress: '127.0.0.1' } as any,
    get: jest.fn((header: string) => {
      if (header === 'User-Agent') return 'test-agent';
      if (header === 'set-cookie') return ['cookie1', 'cookie2'];
      return undefined;
    }) as any,
    ...overrides
  };
}

function createMockResponse(): Partial<Response> {
  const eventListeners: { [event: string]: Function[] } = {};
  const res: Partial<Response> = {
    statusCode: 200,
    send: jest.fn().mockImplementation(function(this: Response, body: any) {
      // Simulate the 'finish' event
      setTimeout(() => {
        const listeners = eventListeners['finish'] || [];
        listeners.forEach(listener => listener());
      }, 0);
      return this;
    }),
    json: jest.fn().mockImplementation(function(this: Response, obj: any) {
      // Simulate the 'finish' event
      setTimeout(() => {
        const listeners = eventListeners['finish'] || [];
        listeners.forEach(listener => listener());
      }, 0);
      return this;
    }),
    on: jest.fn().mockImplementation((event: string, listener: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(listener);
    })
  };
  return res;
}

describe('Request Logger Middleware', () => {
  let mockLogger: MockLogger;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('createRequestLogger', () => {
    it('should create middleware function', () => {
      const middleware = createRequestLogger();
      expect(typeof middleware).toBe('function');
    });

    it('should call next() to continue middleware chain', () => {
      const middleware = createRequestLogger({}, mockLogger);
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should log request with default format', async () => {
      const middleware = createRequestLogger({}, mockLogger);
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      // Trigger response completion and wait for async logging
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages).toHaveLength(1);
      const logMessage = mockLogger.infoMessages[0];
      expect(logMessage).toMatch(/\[.*\] GET \/test from 127\.0\.0\.1 - 200 \(\d+ms\)/);
    });

    it('should include IP address when includeIP is true', async () => {
      const config: LoggerConfig = { includeIP: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('from 127.0.0.1');
    });

    it('should exclude IP address when includeIP is false', async () => {
      const config: LoggerConfig = { includeIP: false };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).not.toContain('from');
    });

    it('should include user agent when includeUserAgent is true', async () => {
      const config: LoggerConfig = { includeUserAgent: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('"test-agent"');
    });

    it('should include status code when includeStatus is true', async () => {
      const config: LoggerConfig = { includeStatus: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockRes.statusCode = 404;
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.warnMessages[0]).toContain('- 404');
    });

    it('should include response time when includeResponseTime is true', async () => {
      const config: LoggerConfig = { includeResponseTime: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      // Simulate some processing time
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockLogger.infoMessages[0]).toMatch(/\(\d+ms\)/);
    });

    it('should skip logging for specified paths', async () => {
      const config: LoggerConfig = { skipPaths: ['/health', '/favicon.ico'] };
      const middleware = createRequestLogger(config, mockLogger);
      
      const healthReq = createMockRequest({ path: '/health' });
      middleware(healthReq as Request, mockRes as Response, nextFunction);
      
      expect(mockLogger.infoMessages).toHaveLength(0);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should skip logging for specified methods', async () => {
      const config: LoggerConfig = { skipMethods: ['OPTIONS'] };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockReq.method = 'OPTIONS';
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(mockLogger.infoMessages).toHaveLength(0);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should use custom timestamp format', async () => {
      const customTimestamp = '2023-01-01T00:00:00.000Z';
      const config: LoggerConfig = {
        timestampFormat: () => customTimestamp
      };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain(`[${customTimestamp}]`);
    });

    it('should use custom log format', async () => {
      const config: LoggerConfig = {
        customFormat: (logData) => `Custom: ${logData.method} ${logData.url}`
      };
      const middleware = createRequestLogger(config, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toBe('Custom: GET /test');
    });

    it('should log errors for 5xx status codes', async () => {
      const middleware = createRequestLogger({}, mockLogger);
      
      mockRes.statusCode = 500;
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.errorMessages).toHaveLength(1);
      expect(mockLogger.infoMessages).toHaveLength(0);
    });

    it('should log warnings for 4xx status codes', async () => {
      const middleware = createRequestLogger({}, mockLogger);
      
      mockRes.statusCode = 404;
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.warnMessages).toHaveLength(1);
      expect(mockLogger.infoMessages).toHaveLength(0);
    });

    it('should handle x-forwarded-for header for IP extraction', async () => {
      const config: LoggerConfig = { includeIP: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockReq.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('from 192.168.1.1');
    });

    it('should handle x-real-ip header for IP extraction', async () => {
      const config: LoggerConfig = { includeIP: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockReq.headers = { 'x-real-ip': '192.168.1.2' };
      mockReq.connection = undefined;
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('from 192.168.1.2');
    });

    it('should handle unknown IP gracefully', async () => {
      const config: LoggerConfig = { includeIP: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockReq.headers = {};
      mockReq.connection = undefined;
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('from unknown');
    });

    it('should handle errors in logging gracefully', async () => {
      const errorLogger: Logger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };
      
      // Create middleware that will throw an error
      const middleware = createRequestLogger({
        customFormat: () => { throw new Error('Test error'); }
      }, errorLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(errorLogger.error).toHaveBeenCalledWith('Request logger error: Test error');
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pre-configured loggers', () => {
    it('should export default requestLogger', () => {
      expect(typeof requestLogger).toBe('function');
    });

    it('should export minimalRequestLogger', () => {
      expect(typeof minimalRequestLogger).toBe('function');
    });

    it('minimalRequestLogger should produce minimal output', async () => {
      const originalConsoleLog = console.log;
      const logMessages: string[] = [];
      console.log = jest.fn((message: string) => logMessages.push(message));
      
      try {
        minimalRequestLogger(mockReq as Request, mockRes as Response, nextFunction);
        (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
        
        expect(logMessages).toHaveLength(1);
        expect(logMessages[0]).toMatch(/\[.*\] GET \/test$/);
        expect(logMessages[0]).not.toContain('from');
        expect(logMessages[0]).not.toContain('ms');
      } finally {
        console.log = originalConsoleLog;
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle missing originalUrl', async () => {
      const middleware = createRequestLogger({}, mockLogger);
      
      mockReq.originalUrl = undefined;
      mockReq.url = '/fallback';
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).toContain('/fallback');
    });

    it('should handle missing headers gracefully', async () => {
      const config: LoggerConfig = { includeUserAgent: true };
      const middleware = createRequestLogger(config, mockLogger);
      
      mockReq.get = jest.fn(() => undefined);
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      (mockRes.send as jest.Mock)('test response');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockLogger.infoMessages[0]).not.toContain('"undefined"');
    });
  });
});