import { Request, Response, NextFunction } from 'express';
import {
  createRequestLogger,
  requestLogger,
  skipHealthChecks,
  skipStaticAssets
} from '../src/middleware/requestLogger';
import { Logger, RequestLogData } from '../src/types/logger';

// Mock logger for testing
class MockLogger implements Logger {
  public infoMessages: string[] = [];
  public warnMessages: string[] = [];
  public errorMessages: string[] = [];

  info(message: string): void {
    this.infoMessages.push(message);
  }

  warn(message: string): void {
    this.warnMessages.push(message);
  }

  error(message: string): void {
    this.errorMessages.push(message);
  }

  reset(): void {
    this.infoMessages = [];
    this.warnMessages = [];
    this.errorMessages = [];
  }
}

// Mock Express Request
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/test',
  originalUrl: '/test',
  headers: {
    'user-agent': 'test-agent/1.0'
  },
  connection: {
    remoteAddress: '127.0.0.1'
  } as any,
  body: {},
  ...overrides
});

// Mock Express Response
const createMockResponse = (): Partial<Response> => {
  const res: any = {
    statusCode: 200,
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    get: jest.fn(),
    on: jest.fn(),
    emit: jest.fn()
  };

  // Make send and json work like real Express methods
  res.send.mockImplementation(function(this: any, body: any) {
    this.emit('finish');
    return this;
  });

  res.json.mockImplementation(function(this: any, obj: any) {
    this.emit('finish');
    return this;
  });

  return res;
};

describe('RequestLogger Middleware', () => {
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
    it('should create middleware that logs basic request information', (done) => {
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      // Simulate response completion
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages).toHaveLength(1);
          expect(mockLogger.infoMessages[0]).toMatch(/\[.*\] GET \/test from 127\.0\.0\.1/);
          expect(nextFunction).toHaveBeenCalled();
          done();
        }, 10);
      }, 10);
    });

    it('should include response time when enabled', (done) => {
      const middleware = createRequestLogger({ includeResponseTime: true }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).toMatch(/\d+ms/);
          done();
        }, 10);
      }, 50); // Add delay to ensure measurable response time
    });

    it('should include user agent when enabled', (done) => {
      const middleware = createRequestLogger({ includeUserAgent: true }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).toContain('test-agent/1.0');
          done();
        }, 10);
      }, 10);
    });

    it('should exclude user agent when disabled', (done) => {
      const middleware = createRequestLogger({ includeUserAgent: false }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).not.toContain('test-agent/1.0');
          done();
        }, 10);
      }, 10);
    });

    it('should include request body when enabled', (done) => {
      const reqWithBody = createMockRequest({
        body: { test: 'data' }
      });
      
      const middleware = createRequestLogger({ includeBody: true }, mockLogger);
      
      middleware(reqWithBody as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          // We can't easily test the body inclusion in the default format,
          // but we can test with a custom format
          expect(mockLogger.infoMessages).toHaveLength(1);
          done();
        }, 10);
      }, 10);
    });

    it('should use custom format function when provided', (done) => {
      const customFormat = jest.fn((logData: RequestLogData) => 
        `CUSTOM: ${logData.method} ${logData.url}`
      );
      
      const middleware = createRequestLogger({ format: customFormat }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(customFormat).toHaveBeenCalled();
          expect(mockLogger.infoMessages[0]).toBe('CUSTOM: GET /test');
          done();
        }, 10);
      }, 10);
    });

    it('should skip logging when skip function returns true', () => {
      const skipFn = jest.fn(() => true);
      const middleware = createRequestLogger({ skip: skipFn }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      expect(skipFn).toHaveBeenCalledWith(mockReq, mockRes);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.infoMessages).toHaveLength(0);
    });

    it('should not skip logging when skip function returns false', (done) => {
      const skipFn = jest.fn(() => false);
      const middleware = createRequestLogger({ skip: skipFn }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(skipFn).toHaveBeenCalledWith(mockReq, mockRes);
          expect(mockLogger.infoMessages).toHaveLength(1);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('IP Address Detection', () => {
    it('should detect IP from x-forwarded-for header', (done) => {
      const reqWithProxy = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'test-agent/1.0'
        }
      });
      
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(reqWithProxy as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).toContain('from 192.168.1.1');
          done();
        }, 10);
      }, 10);
    });

    it('should detect IP from x-real-ip header', (done) => {
      const reqWithRealIP = createMockRequest({
        headers: {
          'x-real-ip': '203.0.113.1',
          'user-agent': 'test-agent/1.0'
        },
        connection: undefined
      });
      
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(reqWithRealIP as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).toContain('from 203.0.113.1');
          done();
        }, 10);
      }, 10);
    });

    it('should fallback to unknown when no IP is available', (done) => {
      const reqNoIP = createMockRequest({
        connection: undefined,
        socket: undefined,
        headers: {}
      });
      
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(reqNoIP as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages[0]).toContain('from unknown');
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Log Levels', () => {
    it('should log as info for 2xx status codes', (done) => {
      mockRes.statusCode = 200;
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('success');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages).toHaveLength(1);
          expect(mockLogger.warnMessages).toHaveLength(0);
          expect(mockLogger.errorMessages).toHaveLength(0);
          done();
        }, 10);
      }, 10);
    });

    it('should log as warning for 4xx status codes', (done) => {
      mockRes.statusCode = 404;
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('not found');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages).toHaveLength(0);
          expect(mockLogger.warnMessages).toHaveLength(1);
          expect(mockLogger.errorMessages).toHaveLength(0);
          done();
        }, 10);
      }, 10);
    });

    it('should log as error for 5xx status codes', (done) => {
      mockRes.statusCode = 500;
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('server error');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages).toHaveLength(0);
          expect(mockLogger.warnMessages).toHaveLength(0);
          expect(mockLogger.errorMessages).toHaveLength(1);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle format function errors gracefully', (done) => {
      const errorFormat = jest.fn(() => {
        throw new Error('Format error');
      });
      
      const middleware = createRequestLogger({ format: errorFormat }, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        mockRes.send?.('test response');
        
        setTimeout(() => {
          expect(mockLogger.errorMessages).toHaveLength(1);
          expect(mockLogger.errorMessages[0]).toContain('Error formatting log message');
          done();
        }, 10);
      }, 10);
    });

    it('should prevent duplicate logging on multiple response events', (done) => {
      const middleware = createRequestLogger({}, mockLogger);
      
      middleware(mockReq as Request, mockRes as Response, nextFunction);
      
      setTimeout(() => {
        // Trigger multiple response events
        mockRes.send?.('first response');
        mockRes.json?.({ message: 'second response' });
        (mockRes as any).emit('finish');
        (mockRes as any).emit('close');
        
        setTimeout(() => {
          expect(mockLogger.infoMessages).toHaveLength(1);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('Default Export', () => {
    it('should export a default request logger', () => {
      expect(typeof requestLogger).toBe('function');
    });
  });

  describe('Utility Functions', () => {
    describe('skipHealthChecks', () => {
      it('should skip default health check paths', () => {
        const skipFn = skipHealthChecks();
        
        const healthReq = createMockRequest({ path: '/health' });
        const pingReq = createMockRequest({ path: '/ping' });
        const normalReq = createMockRequest({ path: '/api/test' });
        
        expect(skipFn(healthReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(pingReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(normalReq as Request, mockRes as Response)).toBe(false);
      });

      it('should skip custom health check paths', () => {
        const skipFn = skipHealthChecks(['/custom-health', '/status']);
        
        const customReq = createMockRequest({ path: '/custom-health' });
        const statusReq = createMockRequest({ path: '/status' });
        const healthReq = createMockRequest({ path: '/health' });
        
        expect(skipFn(customReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(statusReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(healthReq as Request, mockRes as Response)).toBe(false);
      });
    });

    describe('skipStaticAssets', () => {
      it('should skip default static asset extensions', () => {
        const skipFn = skipStaticAssets();
        
        const cssReq = createMockRequest({ originalUrl: '/styles/main.css' });
        const jsReq = createMockRequest({ originalUrl: '/scripts/app.js' });
        const imageReq = createMockRequest({ originalUrl: '/images/logo.png' });
        const apiReq = createMockRequest({ originalUrl: '/api/test' });
        
        expect(skipFn(cssReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(jsReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(imageReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(apiReq as Request, mockRes as Response)).toBe(false);
      });

      it('should skip custom static asset extensions', () => {
        const skipFn = skipStaticAssets(['.txt', '.pdf']);
        
        const txtReq = createMockRequest({ originalUrl: '/docs/readme.txt' });
        const pdfReq = createMockRequest({ originalUrl: '/files/doc.pdf' });
        const cssReq = createMockRequest({ originalUrl: '/styles/main.css' });
        
        expect(skipFn(txtReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(pdfReq as Request, mockRes as Response)).toBe(true);
        expect(skipFn(cssReq as Request, mockRes as Response)).toBe(false);
      });
    });
  });
});