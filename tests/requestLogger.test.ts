import { Request, Response, NextFunction } from 'express';
import { requestLogger, standardRequestLogger, developmentRequestLogger, productionRequestLogger } from '../src/middleware/requestLogger';
import { RequestLoggerOptions, LogData } from '../src/types/logger';

// Mock objects
const mockRequest = (overrides = {}) => ({
  method: 'GET',
  originalUrl: '/test',
  url: '/test',
  get: jest.fn(),
  connection: { remoteAddress: '127.0.0.1' },
  socket: { remoteAddress: '127.0.0.1' },
  body: { test: 'data' },
  path: '/test',
  ...overrides
}) as unknown as Request;

const mockResponse = (overrides = {}) => {
  const res = {
    statusCode: 200,
    send: jest.fn().mockReturnThis(),
    ...overrides
  } as unknown as Response;
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('RequestLogger Middleware', () => {
  let mockLogger: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = jest.fn();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Basic Functionality', () => {
    test('should log basic request information', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test response');

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockLogger).toHaveBeenCalledTimes(1);
      
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('GET');
      expect(logMessage).toContain('/test');
      expect(logMessage).toContain('127.0.0.1');
      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    test('should handle missing originalUrl', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest({ originalUrl: undefined });
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test response');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('/test')
      );
    });

    test('should call next() immediately', () => {
      const middleware = requestLogger();
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('IP Address Handling', () => {
    test('should extract IP from X-Forwarded-For header', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest();
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'X-Forwarded-For') return '192.168.1.1, 10.0.0.1';
        return undefined;
      });
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1')
      );
    });

    test('should extract IP from X-Real-IP header', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest();
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'X-Real-IP') return '192.168.1.2';
        return undefined;
      });
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.2')
      );
    });

    test('should fallback to connection.remoteAddress', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest({ connection: { remoteAddress: '10.0.0.1' } });
      (req.get as jest.Mock).mockReturnValue(undefined);
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('10.0.0.1')
      );
    });

    test('should handle unknown IP gracefully', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest({ 
        connection: undefined, 
        socket: undefined 
      });
      (req.get as jest.Mock).mockReturnValue(undefined);
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('unknown')
      );
    });
  });

  describe('Configuration Options', () => {
    test('should include response time when enabled', (done) => {
      const middleware = requestLogger({ 
        logger: mockLogger,
        includeResponseTime: true 
      });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      
      // Simulate some processing time
      setTimeout(() => {
        res.send('test');
        
        const logMessage = mockLogger.mock.calls[0][0];
        expect(logMessage).toMatch(/\(\d+ - \d+ms\)/);
        done();
      }, 10);
    });

    test('should include user agent when enabled', () => {
      const middleware = requestLogger({ 
        logger: mockLogger,
        includeUserAgent: true 
      });
      const req = mockRequest();
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
        return undefined;
      });
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      // User agent is stored in logData but not necessarily in default format
      expect(req.get).toHaveBeenCalledWith('User-Agent');
    });

    test('should include request body when enabled', () => {
      const customFormat = jest.fn((logData: LogData) => {
        return `${logData.method} ${logData.url} - Body: ${JSON.stringify(logData.body)}`;
      });

      const middleware = requestLogger({ 
        logger: mockLogger,
        includeBody: true,
        format: customFormat
      });
      const req = mockRequest({ body: { test: 'data' } });
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(customFormat).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { test: 'data' }
        })
      );
    });

    test('should skip logging when skip function returns true', () => {
      const skipFunction = jest.fn().mockReturnValue(true);
      const middleware = requestLogger({ 
        logger: mockLogger,
        skip: skipFunction
      });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(skipFunction).toHaveBeenCalledWith(req, res);
      expect(mockLogger).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('should not skip logging when skip function returns false', () => {
      const skipFunction = jest.fn().mockReturnValue(false);
      const middleware = requestLogger({ 
        logger: mockLogger,
        skip: skipFunction
      });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(skipFunction).toHaveBeenCalledWith(req, res);
      expect(mockLogger).toHaveBeenCalledTimes(1);
    });

    test('should use custom format function', () => {
      const customFormat = jest.fn().mockReturnValue('Custom log message');
      const middleware = requestLogger({ 
        logger: mockLogger,
        format: customFormat
      });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(customFormat).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1'
        })
      );
      expect(mockLogger).toHaveBeenCalledWith('Custom log message');
    });
  });

  describe('Error Handling', () => {
    test('should handle format function errors gracefully', () => {
      const errorFormat = jest.fn().mockImplementation(() => {
        throw new Error('Format error');
      });
      
      const middleware = requestLogger({ 
        logger: mockLogger,
        format: errorFormat
      });
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, mockNext);
      res.send('test');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Request logger format error:', 
        expect.any(Error)
      );
      expect(mockLogger).toHaveBeenCalledTimes(1);
      // Should fallback to default format
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('GET /test from 127.0.0.1')
      );
    });
  });

  describe('Pre-configured Loggers', () => {
    test('standardRequestLogger should use default console.log', () => {
      const req = mockRequest();
      const res = mockResponse();

      standardRequestLogger(req, res, mockNext);
      res.send('test');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /test from 127.0.0.1')
      );
    });

    test('developmentRequestLogger should skip health endpoints', () => {
      const req = mockRequest({ path: '/health' });
      const res = mockResponse();

      developmentRequestLogger(req, res, mockNext);
      res.send('test');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    test('developmentRequestLogger should skip favicon requests', () => {
      const req = mockRequest({ path: '/favicon.ico' });
      const res = mockResponse();

      developmentRequestLogger(req, res, mockNext);
      res.send('test');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('productionRequestLogger should skip health endpoints only', () => {
      const req = mockRequest({ path: '/health' });
      const res = mockResponse();

      productionRequestLogger(req, res, mockNext);
      res.send('test');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('productionRequestLogger should log non-health endpoints', () => {
      const req = mockRequest({ path: '/api/test' });
      const res = mockResponse();

      productionRequestLogger(req, res, mockNext);
      res.send('test');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Integration', () => {
    test('should preserve original response.send functionality', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest();
      const res = mockResponse();
      const originalSend = res.send;

      middleware(req, res, mockNext);
      const result = res.send('test response');

      expect(result).toBe(res); // Should return response object for chaining
      expect(originalSend).toHaveBeenCalledWith('test response');
    });

    test('should log correct status code', () => {
      const middleware = requestLogger({ logger: mockLogger });
      const req = mockRequest();
      const res = mockResponse({ statusCode: 404 });

      middleware(req, res, mockNext);
      res.send('not found');

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('(404 -')
      );
    });
  });
});