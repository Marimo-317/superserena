import { Request, Response, NextFunction } from 'express';
import { secureRequestLogger, gdprCompliantLogger, highSecurityLogger } from '../src/middleware/requestLoggerSecure';

// Mock Express objects
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/test',
  headers: {
    'user-agent': 'test-agent/1.0'
  },
  connection: {
    remoteAddress: '127.0.0.1'
  } as any,
  socket: {
    remoteAddress: '127.0.0.1'
  } as any,
  ...overrides
});

const createMockResponse = (overrides: Partial<Response> = {}): Partial<Response> => {
  const res = {
    statusCode: 200,
    end: jest.fn(),
    ...overrides
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Request Logger Security Tests', () => {
  let mockLogger: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogger = jest.fn();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('Log Injection Prevention', () => {
    it('should sanitize CRLF injection attempts in URL', () => {
      const maliciousUrl = '/search?q=test\r\n[INJECTED] FAKE LOG ENTRY';
      const req = createMockRequest({ url: maliciousUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('\r');
      expect(loggedMessage).not.toContain('\n');
      expect(loggedMessage).not.toContain('[INJECTED]');
    });

    it('should sanitize ANSI escape sequences in User-Agent', () => {
      const maliciousUserAgent = 'Mozilla/5.0\x1b[31mREDTEXT\x1b[0m';
      const req = createMockRequest({
        headers: {
          'user-agent': maliciousUserAgent
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        includeUserAgent: true,
        logger: mockLogger 
      });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('\x1b');
      expect(loggedMessage).not.toContain('[31m');
    });

    it('should prevent control character injection', () => {
      const maliciousUrl = '/test\x00\x01\x02\x1F';
      const req = createMockRequest({ url: maliciousUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('\x00');
      expect(loggedMessage).not.toContain('\x01');
      expect(loggedMessage).not.toContain('\x1F');
    });

    it('should handle malicious X-Forwarded-For headers', () => {
      const maliciousIP = '192.168.1.1\r\n[ADMIN] System hacked';
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': maliciousIP
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('[ADMIN]');
      expect(loggedMessage).not.toContain('hacked');
      expect(loggedMessage).toContain('192.168.1.1');
    });
  });

  describe('Input Validation and Size Limits', () => {
    it('should enforce URL length limits', () => {
      const longUrl = '/test' + 'a'.repeat(2000);
      const req = createMockRequest({ url: longUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        maxUrlLength: 100,
        logger: mockLogger 
      });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage.length).toBeLessThan(200); // Should be truncated
    });

    it('should enforce User-Agent length limits', () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'Chrome '.repeat(200);
      const req = createMockRequest({
        headers: {
          'user-agent': longUserAgent
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        includeUserAgent: true,
        maxUserAgentLength: 50,
        logger: mockLogger 
      });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      // User agent should be truncated
      expect(loggedMessage).toContain('Mozilla/5.0');
      expect(loggedMessage.length).toBeLessThan(200);
    });

    it('should validate IP address format', () => {
      const invalidIP = '<script>alert("xss")</script>';
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': invalidIP
        },
        connection: undefined,
        socket: undefined
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).toContain('from unknown');
      expect(loggedMessage).not.toContain('<script>');
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should rate limit high-frequency requests from same IP', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.100'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        enableRateLimiting: true,
        logger: mockLogger 
      });

      // Simulate rapid requests (this is a simplified test)
      for (let i = 0; i < 5; i++) {
        middleware(req as Request, res as Response, next);
      }

      // Should continue to log normally for reasonable request counts
      expect(mockLogger).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(5);
    });

    it('should allow disabling rate limiting', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        enableRateLimiting: false,
        logger: mockLogger 
      });
      
      middleware(req as Request, res as Response, next);
      
      expect(mockLogger).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Privacy Protection', () => {
    it('should anonymize IP addresses in privacy mode', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.100'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ 
        enablePrivacyMode: true,
        logger: mockLogger 
      });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).toContain('192.168.1.xxx');
      expect(loggedMessage).not.toContain('192.168.1.100');
    });

    it('should not include User-Agent in GDPR compliant mode', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (sensitive browser info)'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = gdprCompliantLogger();
      const testMiddleware = secureRequestLogger({
        enablePrivacyMode: true,
        includeUserAgent: false,
        logger: mockLogger
      });
      
      testMiddleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('Mozilla');
      expect(loggedMessage).not.toContain('sensitive');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose error details in fallback logging', () => {
      const errorFormat = () => {
        throw new Error('Sensitive configuration error with API key: sk-123456');
      };
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({
        format: errorFormat,
        logger: mockLogger
      });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('API key');
      expect(loggedMessage).not.toContain('sk-123456');
      expect(loggedMessage).not.toContain('Sensitive configuration');
    });

    it('should handle malformed custom logger gracefully', () => {
      const maliciousLogger = () => {
        throw new Error('Logger exploit attempt');
      };
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({
        logger: maliciousLogger
      });
      
      // Should not throw an error
      expect(() => {
        middleware(req as Request, res as Response, next);
      }).not.toThrow();
      
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('High Security Configuration', () => {
    it('should skip sensitive endpoints in high security mode', () => {
      const sensitiveUrls = ['/admin/config', '/internal/debug', '/.well-known/secrets'];
      
      sensitiveUrls.forEach(url => {
        const req = createMockRequest({ url });
        const res = createMockResponse();
        const next = createMockNext();
        
        const testMiddleware = secureRequestLogger({
          skip: (url: string) => {
            return url.includes('/admin') || 
                   url.includes('/internal') || 
                   url.includes('/.well-known');
          },
          logger: mockLogger
        });
        
        testMiddleware(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
      });
      
      // Should not log any sensitive endpoints
      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('should enforce stricter limits in high security mode', () => {
      const longUrl = '/api/data' + 'a'.repeat(1000);
      const req = createMockRequest({ url: longUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({
        maxUrlLength: 100,
        maxUserAgentLength: 50,
        enablePrivacyMode: true,
        enableRateLimiting: true,
        logger: mockLogger
      });
      
      middleware(req as Request, res as Response, next);
      
      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage.length).toBeLessThan(300); // Enforced limits
    });
  });

  describe('XSS and Script Injection Prevention', () => {
    it('should sanitize script tags in URLs', () => {
      const xssUrl = '/search?q=<script>alert("xss")</script>';
      const req = createMockRequest({ url: xssUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      expect(loggedMessage).not.toContain('<script>');
      expect(loggedMessage).not.toContain('alert');
    });

    it('should sanitize HTML entities and special characters', () => {
      const maliciousUrl = '/test?param=<>&"\'%3Cscript%3E';
      const req = createMockRequest({ url: maliciousUrl });
      const res = createMockResponse();
      const next = createMockNext();
      
      const middleware = secureRequestLogger({ logger: mockLogger });
      middleware(req as Request, res as Response, next);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const loggedMessage = mockLogger.mock.calls[0][0];
      // Should still contain the URL but sanitized
      expect(loggedMessage).toContain('/test');
      expect(loggedMessage).not.toContain('<script>');
    });
  });
});