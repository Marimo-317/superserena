import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, rateLimiter, strictRateLimiter, lenientRateLimiter } from '../src/middleware/rateLimiter';
import { AppError } from '../src/middleware/errorHandler';

// Mock request/response objects
const createMockRequest = (ip: string = '127.0.0.1'): Partial<Request> => ({
  ip,
  connection: { remoteAddress: ip } as any
});

const createMockResponse = (): any => {
  const headers: Record<string, string> = {};
  const mockResponse: any = {
    set: jest.fn().mockImplementation((key: string | Record<string, string>, value?: string) => {
      if (typeof key === 'string' && value) {
        headers[key] = value;
      } else if (typeof key === 'object') {
        Object.assign(headers, key);
      }
      return mockResponse;
    }),
    getHeaders: () => headers
  };
  return mockResponse;
};

const createMockNext = (): jest.MockedFunction<NextFunction> => jest.fn();

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: any;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should throw error for invalid max value', () => {
      expect(() => createRateLimiter({ max: 0 })).toThrow('Rate limiter max must be greater than 0');
      expect(() => createRateLimiter({ max: -1 })).toThrow('Rate limiter max must be greater than 0');
    });

    it('should throw error for invalid windowMs value', () => {
      expect(() => createRateLimiter({ windowMs: 0 })).toThrow('Rate limiter windowMs must be greater than 0');
      expect(() => createRateLimiter({ windowMs: -1 })).toThrow('Rate limiter windowMs must be greater than 0');
    });

    it('should accept custom configuration', () => {
      const customLimiter = createRateLimiter({
        max: 50,
        windowMs: 60000,
        message: 'Custom message'
      });
      expect(customLimiter).toBeDefined();
      expect((customLimiter as any).config.max).toBe(50);
      expect((customLimiter as any).config.windowMs).toBe(60000);
      expect((customLimiter as any).config.message).toBe('Custom message');
    });
  });

  describe('Rate limiting logic', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });

      for (let i = 0; i < 5; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // No error
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      }
    });

    it('should block requests exceeding limit', () => {
      const limiter = createRateLimiter({ max: 2, windowMs: 60000 });

      // First two requests should pass
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Third request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 429,
        message: expect.any(String)
      }));
    });

    it('should set correct rate limit headers', () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
      
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '4',
        'X-RateLimit-Reset': expect.any(String),
        'X-RateLimit-Window': '60000'
      });
    });

    it('should set retry-after header when limit exceeded', () => {
      const limiter = createRateLimiter({ max: 1, windowMs: 60000 });

      // First request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      
      // Second request should be blocked
      limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should reset count after window expires', (done) => {
      const limiter = createRateLimiter({ max: 1, windowMs: 100 }); // 100ms window

      // First request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request should be blocked
      mockNext.mockClear();
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));

      // Wait for window to expire and try again
      setTimeout(() => {
        mockNext.mockClear();
        limiter(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // Should pass now
        done();
      }, 150);
    });
  });

  describe('IP-based tracking', () => {
    it('should track requests per IP address', () => {
      const limiter = createRateLimiter({ max: 1, windowMs: 60000 });

      const req1 = createMockRequest('192.168.1.1');
      const req2 = createMockRequest('192.168.1.2');

      // First IP makes a request
      limiter(req1 as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Different IP should not be affected
      mockNext.mockClear();
      limiter(req2 as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // First IP second request should be blocked
      mockNext.mockClear();
      limiter(req1 as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));

      // Second IP second request should also be blocked
      mockNext.mockClear();
      limiter(req2 as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should use custom key generator', () => {
      const keyGenerator = jest.fn((req: Request) => req.headers['x-user-id'] as string || 'anonymous');
      const limiter = createRateLimiter({ max: 1, windowMs: 60000, keyGenerator });

      const req1 = { ...createMockRequest(), headers: { 'x-user-id': 'user1' } };
      const req2 = { ...createMockRequest(), headers: { 'x-user-id': 'user2' } };

      limiter(req1 as Request, mockRes as Response, mockNext);
      expect(keyGenerator).toHaveBeenCalledWith(req1);
      expect(mockNext).toHaveBeenCalledWith();

      mockNext.mockClear();
      limiter(req2 as Request, mockRes as Response, mockNext);
      expect(keyGenerator).toHaveBeenCalledWith(req2);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Whitelist functionality', () => {
    it('should bypass rate limiting for whitelisted IPs', () => {
      const limiter = createRateLimiter({ 
        max: 1, 
        windowMs: 60000, 
        whitelist: ['127.0.0.1', '192.168.1.100'] 
      });

      const whitelistedReq = createMockRequest('127.0.0.1');
      
      // Should allow multiple requests from whitelisted IP
      for (let i = 0; i < 5; i++) {
        mockNext.mockClear();
        limiter(whitelistedReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(); // No error
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      }
    });

    it('should still limit non-whitelisted IPs', () => {
      const limiter = createRateLimiter({ 
        max: 1, 
        windowMs: 60000, 
        whitelist: ['192.168.1.100'] 
      });

      const regularReq = createMockRequest('127.0.0.1');
      
      // First request should pass
      limiter(regularReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request should be blocked
      mockNext.mockClear();
      limiter(regularReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Skip functionality', () => {
    it('should skip rate limiting when skip function returns true', () => {
      const skipFn = jest.fn((req: Request) => req.path === '/health');
      const limiter = createRateLimiter({ max: 1, windowMs: 60000, skip: skipFn });

      const healthReq = { ...createMockRequest(), path: '/health' };
      
      // Should allow multiple requests to health endpoint
      for (let i = 0; i < 5; i++) {
        mockNext.mockClear();
        limiter(healthReq as Request, mockRes as Response, mockNext);
        expect(skipFn).toHaveBeenCalledWith(healthReq);
        expect(mockNext).toHaveBeenCalledWith(); // No error
      }
    });

    it('should apply rate limiting when skip function returns false', () => {
      const skipFn = jest.fn(() => false);
      const limiter = createRateLimiter({ max: 1, windowMs: 60000, skip: skipFn });

      // First request should pass
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      // Second request should be blocked
      mockNext.mockClear();
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Custom handlers', () => {
    it('should call onLimitReached when limit is exceeded', () => {
      const onLimitReached = jest.fn();
      const limiter = createRateLimiter({ max: 1, windowMs: 60000, onLimitReached });

      // First request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(onLimitReached).not.toHaveBeenCalled();

      // Second request should trigger onLimitReached
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(onLimitReached).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should use custom message', () => {
      const customMessage = 'Custom rate limit message';
      const limiter = createRateLimiter({ max: 1, windowMs: 60000, message: customMessage });

      // First request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      
      // Second request should use custom message
      limiter(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: customMessage
      }));
    });
  });

  describe('Error handling and graceful degradation', () => {
    it('should continue without rate limiting if an error occurs', () => {
      const badKeyGenerator = jest.fn(() => { throw new Error('Key generator error'); });
      const limiter = createRateLimiter({ keyGenerator: badKeyGenerator });

      // Should not throw, should call next() without error
      expect(() => {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();
      
      expect(mockNext).toHaveBeenCalledWith(); // Called without error
    });
  });

  describe('Pre-defined rate limiters', () => {
    it('should have default rate limiter', () => {
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter).toBe('function');
    });

    it('should have strict rate limiter with lower limits', () => {
      expect(strictRateLimiter).toBeDefined();
      expect((strictRateLimiter as any).config.max).toBe(10);
    });

    it('should have lenient rate limiter with higher limits', () => {
      expect(lenientRateLimiter).toBeDefined();
      expect((lenientRateLimiter as any).config.max).toBe(1000);
    });
  });

  describe('Store statistics and cleanup', () => {
    it('should provide store statistics', () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
      const store = (limiter as any).store;

      // Initially empty
      let stats = store.getStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.activeKeys).toBe(0);

      // Make some requests
      limiter(createMockRequest('192.168.1.1') as Request, mockRes as Response, mockNext);
      limiter(createMockRequest('192.168.1.2') as Request, mockRes as Response, mockNext);

      stats = store.getStats();
      expect(stats.totalKeys).toBe(2);
      expect(stats.activeKeys).toBe(2);
    });

    it('should cleanup expired entries', (done) => {
      const limiter = createRateLimiter({ max: 5, windowMs: 100 });
      const store = (limiter as any).store;

      // Make a request
      limiter(mockReq as Request, mockRes as Response, mockNext);
      
      let stats = store.getStats();
      expect(stats.activeKeys).toBe(1);

      // Wait for entry to expire
      setTimeout(() => {
        stats = store.getStats();
        expect(stats.activeKeys).toBe(0);
        done();
      }, 150);
    });

    it('should destroy store properly', () => {
      const limiter = createRateLimiter({ max: 5, windowMs: 60000 });
      const store = (limiter as any).store;

      store.destroy();
      const stats = store.getStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.activeKeys).toBe(0);
    });
  });
});