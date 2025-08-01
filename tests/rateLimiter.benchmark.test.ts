import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../src/middleware/rateLimiter';

// Mock request/response objects for performance testing
const createMockRequest = (ip: string = '127.0.0.1'): Partial<Request> => ({
  ip,
  connection: { remoteAddress: ip } as any
});

const createMockResponse = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  const mockResponse: any = {
    set: jest.fn((key: string | Record<string, string>, value?: string): any => {
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

describe('Rate Limiter Performance Benchmarks', () => {
  describe('Single IP Performance', () => {
    it('should handle 1000 requests from single IP within performance target', () => {
      const limiter = createRateLimiter({ max: 10000, windowMs: 60000 });
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const startTime = process.hrtime.bigint();
      
      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      console.log(`1000 requests from single IP took: ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 1000).toFixed(3)}ms`);
      
      // Should average less than 5ms per request (requirement from issue)
      expect(durationMs / 1000).toBeLessThan(5);
      
      // Should complete all requests in reasonable time
      expect(durationMs).toBeLessThan(1000); // Less than 1 second for 1000 requests
    });

    it('should maintain consistent performance across multiple windows', () => {
      const limiter = createRateLimiter({ max: 100, windowMs: 100 }); // Short window for testing
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const durations: number[] = [];

      // Test multiple batches
      for (let batch = 0; batch < 5; batch++) {
        const startTime = process.hrtime.bigint();
        
        // Make requests within limit
        for (let i = 0; i < 50; i++) {
          limiter(mockReq as Request, mockRes as Response, mockNext);
        }
        
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        durations.push(durationMs);

        // Wait for window to reset
        if (batch < 4) {
          const sleepEnd = Date.now() + 150;
          while (Date.now() < sleepEnd) {
            // Busy wait
          }
        }
      }

      console.log('Batch durations (ms):', durations.map(d => d.toFixed(2)));
      
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      console.log(`Average batch duration: ${averageDuration.toFixed(2)}ms`);
      console.log(`Performance variance: ${((maxDuration - minDuration) / averageDuration * 100).toFixed(1)}%`);

      // Performance should be consistent (variance < 50%)
      expect((maxDuration - minDuration) / averageDuration).toBeLessThan(0.5);
    });
  });

  describe('Multi-IP Performance', () => {
    it('should handle 1000 requests from different IPs efficiently', () => {
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const startTime = process.hrtime.bigint();
      
      // Make requests from 1000 different IPs
      for (let i = 0; i < 1000; i++) {
        const mockReq = createMockRequest(`192.168.1.${i % 255}.${Math.floor(i / 255)}`);
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(`1000 requests from different IPs took: ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 1000).toFixed(3)}ms`);
      
      // Should maintain good performance even with many different IPs
      expect(durationMs / 1000).toBeLessThan(5); // Less than 5ms per request
      expect(durationMs).toBeLessThan(2000); // Less than 2 seconds total
    });

    it('should scale well with increasing number of unique IPs', () => {
      const ipCounts = [10, 50, 100, 500, 1000];
      const results: Array<{ ips: number; duration: number; avgPerRequest: number }> = [];

      for (const ipCount of ipCounts) {
        const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        const startTime = process.hrtime.bigint();
        
        // Make one request from each unique IP
        for (let i = 0; i < ipCount; i++) {
          const mockReq = createMockRequest(`10.0.${Math.floor(i / 255)}.${i % 255}`);
          limiter(mockReq as Request, mockRes as Response, mockNext);
        }
        
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        const avgPerRequest = durationMs / ipCount;

        results.push({
          ips: ipCount,
          duration: durationMs,
          avgPerRequest
        });

        console.log(`${ipCount} unique IPs: ${durationMs.toFixed(2)}ms total, ${avgPerRequest.toFixed(3)}ms per request`);
      }

      // Performance should scale reasonably (not exponentially worse)
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      
      // The performance shouldn't degrade more than 10x when IPs increase 100x
      const performanceDegradation = lastResult.avgPerRequest / firstResult.avgPerRequest;
      console.log(`Performance degradation factor: ${performanceDegradation.toFixed(2)}x`);
      
      expect(performanceDegradation).toBeLessThan(10);
      
      // All requests should still be under the 5ms requirement
      results.forEach(result => {
        expect(result.avgPerRequest).toBeLessThan(5);
      });
    });
  });

  describe('Memory Usage Performance', () => {
    it('should have efficient memory usage with many IPs', () => {
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      const store = (limiter as any).store;
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      // Measure initial memory
      const initialStats = store.getStats();
      expect(initialStats.totalKeys).toBe(0);

      // Add many unique IPs
      const ipCount = 1000;
      for (let i = 0; i < ipCount; i++) {
        const mockReq = createMockRequest(`172.16.${Math.floor(i / 255)}.${i % 255}`);
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      // Check memory usage
      const afterStats = store.getStats();
      expect(afterStats.totalKeys).toBe(ipCount);
      expect(afterStats.activeKeys).toBe(ipCount);

      console.log(`Memory usage: ${afterStats.totalKeys} total keys, ${afterStats.activeKeys} active keys`);
      
      // Cleanup should work properly
      store.destroy();
      const cleanupStats = store.getStats();
      expect(cleanupStats.totalKeys).toBe(0);
    });

    it('should cleanup expired entries efficiently', (done) => {
      const limiter = createRateLimiter({ max: 10, windowMs: 100 }); // Short window
      const store = (limiter as any).store;
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      // Add many entries
      for (let i = 0; i < 100; i++) {
        const mockReq = createMockRequest(`192.168.100.${i}`);
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }

      const initialStats = store.getStats();
      expect(initialStats.totalKeys).toBe(100);

      // Wait for entries to expire
      setTimeout(() => {
        const expiredStats = store.getStats();
        console.log(`After expiration: ${expiredStats.totalKeys} total, ${expiredStats.activeKeys} active`);
        
        // Most entries should be considered inactive now
        expect(expiredStats.activeKeys).toBeLessThan(initialStats.totalKeys);
        
        store.destroy();
        done();
      }, 150);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests without performance degradation', async () => {
      const limiter = createRateLimiter({ max: 1000, windowMs: 60000 });
      const mockRes = createMockResponse();

      const startTime = process.hrtime.bigint();
      
      // Create promises for concurrent requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const promise = new Promise<void>((resolve) => {
          const mockReq = createMockRequest(`10.10.10.${i % 10}`);
          const mockNext = jest.fn(() => resolve());
          limiter(mockReq as Request, mockRes as Response, mockNext);
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(`100 concurrent requests took: ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 100).toFixed(3)}ms`);
      
      // Should handle concurrent requests efficiently
      expect(durationMs / 100).toBeLessThan(5);
      expect(durationMs).toBeLessThan(500); // Should complete quickly
    });
  });

  describe('Error Handling Performance', () => {
    it('should maintain performance when handling rate limit violations', () => {
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const startTime = process.hrtime.bigint();
      
      // Make requests that will exceed the limit
      for (let i = 0; i < 100; i++) {
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(`100 requests (90 violations) took: ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 100).toFixed(3)}ms`);
      
      // Error handling shouldn't significantly impact performance
      expect(durationMs / 100).toBeLessThan(5);
      
      // Check that errors were properly generated
      const errorCalls = (mockNext as jest.Mock).mock.calls.filter(call => call[0] && call[0].statusCode === 429);
      expect(errorCalls.length).toBe(90); // 90 requests should have been blocked
    });

    it('should maintain performance during graceful degradation', () => {
      const faultyLimiter = createRateLimiter({
        max: 10,
        windowMs: 60000,
        keyGenerator: () => { throw new Error('Faulty key generator'); }
      });

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const startTime = process.hrtime.bigint();
      
      // Make requests that will cause errors in key generation
      for (let i = 0; i < 100; i++) {
        faultyLimiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(`100 requests with errors took: ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 100).toFixed(3)}ms`);
      
      // Should maintain reasonable performance even with errors
      expect(durationMs / 100).toBeLessThan(10); // Slightly higher threshold for error cases
      
      // All requests should have been allowed through (graceful degradation)
      const errorCalls = (mockNext as jest.Mock).mock.calls.filter(call => call[0]);
      expect(errorCalls.length).toBe(0);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should meet performance requirements under typical API load', () => {
      // Simulate typical API usage: mix of returning users and new IPs
      const limiter = createRateLimiter({ max: 100, windowMs: 3600000 });
      const mockRes = createMockResponse();
      const mockNext = createMockNext();

      const startTime = process.hrtime.bigint();
      
      // Simulate 1000 requests from mix of IPs (80% returning, 20% new)
      for (let i = 0; i < 1000; i++) {
        let ip: string;
        if (i % 5 === 0) {
          // 20% new IPs
          ip = `203.0.113.${i}`;
        } else {
          // 80% returning IPs (cycling through 50 common IPs)
          ip = `198.51.100.${i % 50}`;
        }
        
        const mockReq = createMockRequest(ip);
        limiter(mockReq as Request, mockRes as Response, mockNext);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(`Realistic load test (1000 requests): ${durationMs.toFixed(2)}ms`);
      console.log(`Average per request: ${(durationMs / 1000).toFixed(3)}ms`);
      console.log(`Requests per second capability: ${(1000 / (durationMs / 1000)).toFixed(0)}`);
      
      // Should meet the <5ms per request requirement
      expect(durationMs / 1000).toBeLessThan(5);
      
      // Should handle at least 1000 requests/second
      expect(1000 / (durationMs / 1000)).toBeGreaterThan(1000);
    });

    it('should perform well with different rate limiter configurations', () => {
      const configurations = [
        { name: 'Strict', max: 10, windowMs: 60000 },
        { name: 'Standard', max: 100, windowMs: 60000 },
        { name: 'Lenient', max: 1000, windowMs: 60000 }
      ];

      for (const config of configurations) {
        const limiter = createRateLimiter(config);
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const mockNext = createMockNext();

        const startTime = process.hrtime.bigint();
        
        // Make 100 requests
        for (let i = 0; i < 100; i++) {
          limiter(mockReq as Request, mockRes as Response, mockNext);
        }
        
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        const avgPerRequest = durationMs / 100;

        console.log(`${config.name} config: ${durationMs.toFixed(2)}ms total, ${avgPerRequest.toFixed(3)}ms per request`);
        
        // All configurations should meet performance requirements
        expect(avgPerRequest).toBeLessThan(5);
      }
    });
  });
});