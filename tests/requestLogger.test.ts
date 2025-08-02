import { Request, Response, NextFunction } from 'express';
import { 
  createRequestLogger, 
  developmentLogger, 
  productionLogger,
  RequestLogData,
  RequestLoggerOptions 
} from '../src/middleware/requestLogger';

// Mock console methods
const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Mock Express Request and Response objects
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/test',
  originalUrl: '/test',
  headers: {
    'user-agent': 'Mozilla/5.0 (Test Browser)'
  },
  connection: {
    remoteAddress: '127.0.0.1'
  } as any,
  socket: {
    remoteAddress: '127.0.0.1'
  } as any,
  ...overrides
});

const createMockResponse = (statusCode: number = 200): Partial<Response> => {
  const res: any = {
    statusCode,
    end: jest.fn(),
    write: jest.fn()
  };
  
  // Mock the end method to call the original implementation
  res.end = jest.fn((chunk?: any, encoding?: any, callback?: any) => {
    return true;
  });
  
  res.write = jest.fn((chunk: any, encoding?: any, callback?: any) => {
    return true;
  });
  
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Request Logger Middleware', () => {
  beforeEach(() => {
    // Replace console methods with mocks
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock Date.now for consistent timing tests
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // Start time
      .mockReturnValueOnce(1100); // End time (100ms later)
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    
    // Restore Date.now
    jest.restoreAllMocks();
  });

  describe('createRequestLogger', () => {
    it('should create a middleware function', () => {
      const middleware = createRequestLogger();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should log basic request information', () => {
      const middleware = createRequestLogger();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      
      // Trigger response end
      (res.end as jest.Mock)();

      expect(next).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('GET')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('/test')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1')
      );
    });

    it('should include user agent when configured', () => {
      const middleware = createRequestLogger({ includeUserAgent: true });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla/5.0')
      );
    });

    it('should measure response time when configured', () => {
      const middleware = createRequestLogger({ includeResponseTime: true });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('100ms')
      );
    });

    it('should skip logging when skip function returns true', () => {
      const middleware = createRequestLogger({
        skip: (req) => req.path === '/health'
      });
      const req = createMockRequest({ path: '/health' });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should use custom formatter when provided', () => {
      const customFormatter = jest.fn().mockReturnValue('CUSTOM LOG FORMAT');
      const middleware = createRequestLogger({
        formatter: customFormatter
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(customFormatter).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1'
        })
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('CUSTOM LOG FORMAT');
    });

    it('should detect IP from X-Forwarded-For header', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      const middleware = createRequestLogger();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1')
      );
    });

    it('should detect IP from X-Real-IP header', () => {
      const req = createMockRequest({
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      const middleware = createRequestLogger();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.2')
      );
    });

    it('should use appropriate log level based on status code', () => {
      // Test error level (5xx)
      const middleware500 = createRequestLogger();
      const req500 = createMockRequest();
      const res500 = createMockResponse(500);
      const next500 = createMockNext();

      middleware500(req500 as Request, res500 as Response, next500);
      (res500.end as jest.Mock)();

      expect(mockConsoleError).toHaveBeenCalled();

      // Clear mocks for next test
      jest.clearAllMocks();

      // Test warning level (4xx)
      const middleware400 = createRequestLogger();
      const req400 = createMockRequest();
      const res400 = createMockResponse(404);
      const next400 = createMockNext();

      middleware400(req400 as Request, res400 as Response, next400);
      (res400.end as jest.Mock)();

      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should add requestId to request object', () => {
      const middleware = createRequestLogger();
      const req = createMockRequest() as any;
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);

      expect(req.requestId).toBeDefined();
      expect(typeof req.requestId).toBe('string');
    });

    it('should calculate response size when configured', () => {
      const middleware = createRequestLogger({ includeResponseSize: true });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      
      // Simulate writing data
      (res.write as jest.Mock)('Hello World');
      (res.end as jest.Mock)(' - End');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\d+b/) // Contains bytes information
      );
    });
  });

  describe('Pre-configured loggers', () => {
    it('should provide development logger', () => {
      expect(typeof developmentLogger).toBe('function');
      expect(developmentLogger.length).toBe(3);
    });

    it('should provide production logger', () => {
      expect(typeof productionLogger).toBe('function');
      expect(productionLogger.length).toBe(3);
    });

    it('should format development logs with emoji', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      developmentLogger(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔍')
      );
    });

    it('should skip health checks in production logger', () => {
      const req = createMockRequest({ path: '/health' });
      const res = createMockResponse();
      const next = createMockNext();

      productionLogger(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing connection object', () => {
      const req = createMockRequest({ 
        connection: undefined,
        socket: undefined
      });
      const res = createMockResponse();
      const next = createMockNext();
      const middleware = createRequestLogger();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('unknown')
      );
    });

    it('should handle undefined originalUrl', () => {
      const req = createMockRequest({ originalUrl: undefined });
      const res = createMockResponse();
      const next = createMockNext();
      const middleware = createRequestLogger();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('/test')
      );
    });

    it('should handle empty response chunks', () => {
      const middleware = createRequestLogger({ includeResponseSize: true });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req as Request, res as Response, next);
      (res.end as jest.Mock)(null);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});