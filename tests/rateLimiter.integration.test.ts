import request from 'supertest';
import express, { Application } from 'express';
import { createRateLimiter, rateLimiter } from '../src/middleware/rateLimiter';
import { errorHandler } from '../src/middleware/errorHandler';

describe('Rate Limiter Integration Tests', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    
    // Basic middleware
    app.use(express.json());
    
    // Test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'Test endpoint', ip: req.ip });
    });

    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    app.get('/api/data', (req, res) => {
      res.json({ data: 'Some important data' });
    });

    // Error handling
    app.use(errorHandler);
  });

  describe('Default rate limiter integration', () => {
    beforeEach(() => {
      // Don't apply the default rate limiter here since it has high limits
      // We'll use custom limiters in individual tests
    });

    it('should allow requests within the default limit', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));
      
      const responses = [];
      
      // Make several requests (within limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(testApp).get('/test');
        responses.push(response);
      }

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
      });
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Create a stricter limiter for testing
      const testApp = express();
      const strictLimiter = createRateLimiter({ max: 2, windowMs: 60000 });
      
      testApp.use(strictLimiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));
      testApp.use(errorHandler);

      // First two requests should pass
      const response1 = await request(testApp).get('/test');
      expect(response1.status).toBe(200);

      const response2 = await request(testApp).get('/test');
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await request(testApp).get('/test');
      expect(response3.status).toBe(429);
      expect(response3.body.message).toContain('Too many requests');
      expect(response3.headers['retry-after']).toBeDefined();
    });

    it('should set correct rate limit headers', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));

      const response = await request(testApp).get('/test');
      
      expect(response.headers['x-ratelimit-limit']).toBe('10');
      expect(response.headers['x-ratelimit-remaining']).toBe('9');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(response.headers['x-ratelimit-window']).toBe('60000');
    });
  });

  describe('Custom rate limiter configurations', () => {
    it('should work with different limits for different endpoints', async () => {
      const app = express();
      
      // Strict limiter for sensitive endpoint
      const strictLimiter = createRateLimiter({ max: 1, windowMs: 60000 });
      app.use('/api/sensitive', strictLimiter);
      
      // Lenient limiter for public endpoint
      const lenientLimiter = createRateLimiter({ max: 100, windowMs: 60000 });
      app.use('/api/public', lenientLimiter);

      app.get('/api/sensitive', (req, res) => res.json({ data: 'sensitive' }));
      app.get('/api/public', (req, res) => res.json({ data: 'public' }));
      app.use(errorHandler);

      // Test strict endpoint
      const sensitiveResponse1 = await request(app).get('/api/sensitive');
      expect(sensitiveResponse1.status).toBe(200);

      const sensitiveResponse2 = await request(app).get('/api/sensitive');
      expect(sensitiveResponse2.status).toBe(429);

      // Test lenient endpoint (should allow many requests)
      for (let i = 0; i < 10; i++) {
        const publicResponse = await request(app).get('/api/public');
        expect(publicResponse.status).toBe(200);
      }
    });

    it('should respect IP whitelisting', async () => {
      const testApp = express();
      
      // Note: In real integration tests, we can't easily change the IP
      // This test demonstrates the concept, but the IP will always be ::ffff:127.0.0.1 or similar
      const limiter = createRateLimiter({ 
        max: 1, 
        windowMs: 60000,
        whitelist: ['::ffff:127.0.0.1', '127.0.0.1'] // Common localhost representations
      });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test', ip: req.ip }));
      testApp.use(errorHandler);

      // Multiple requests should pass due to whitelisting
      for (let i = 0; i < 5; i++) {
        const response = await request(testApp).get('/test');
        expect(response.status).toBe(200);
      }
    });

    it('should work with custom key generator', async () => {
      const testApp = express();
      
      const limiter = createRateLimiter({
        max: 2,
        windowMs: 60000,
        keyGenerator: (req) => req.headers['x-user-id'] as string || 'anonymous'
      });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));
      testApp.use(errorHandler);

      // Two requests with same user-id
      const response1 = await request(testApp)
        .get('/test')
        .set('X-User-ID', 'user123');
      expect(response1.status).toBe(200);

      const response2 = await request(testApp)
        .get('/test')
        .set('X-User-ID', 'user123');
      expect(response2.status).toBe(200);

      // Third request with same user-id should be blocked
      const response3 = await request(testApp)
        .get('/test')
        .set('X-User-ID', 'user123');
      expect(response3.status).toBe(429);

      // Request with different user-id should pass
      const response4 = await request(testApp)
        .get('/test')
        .set('X-User-ID', 'user456');
      expect(response4.status).toBe(200);
    });

    it('should work with skip function', async () => {
      const testApp = express();
      
      const limiter = createRateLimiter({
        max: 1,
        windowMs: 60000,
        skip: (req) => req.path === '/health'
      });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));
      testApp.get('/health', (req, res) => res.json({ status: 'healthy' }));
      testApp.use(errorHandler);

      // Health endpoint should never be rate limited
      for (let i = 0; i < 5; i++) {
        const response = await request(testApp).get('/health');
        expect(response.status).toBe(200);
      }

      // Regular endpoint should be rate limited
      const testResponse1 = await request(testApp).get('/test');
      expect(testResponse1.status).toBe(200);

      const testResponse2 = await request(testApp).get('/test');
      expect(testResponse2.status).toBe(429);
    });
  });

  describe('Error handling integration', () => {
    it('should integrate properly with error handler middleware', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ max: 1, windowMs: 60000 });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));
      testApp.use(errorHandler);

      // First request passes
      const response1 = await request(testApp).get('/test');
      expect(response1.status).toBe(200);

      // Second request should return properly formatted error
      const response2 = await request(testApp).get('/test');
      expect(response2.status).toBe(429);
      expect(response2.body).toHaveProperty('message');
      expect(response2.body).toHaveProperty('timestamp');
      expect(response2.body.message).toContain('Too many requests');
    });

    it('should handle graceful degradation on middleware errors', async () => {
      const testApp = express();
      
      // Create a limiter that will cause an error
      const faultyLimiter = createRateLimiter({
        max: 5,
        windowMs: 60000,
        keyGenerator: () => { throw new Error('Key generator error'); }
      });
      
      testApp.use(faultyLimiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));

      // Should continue working despite the error
      const response = await request(testApp).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('test');
    });
  });

  describe('Performance integration', () => {
    it('should handle concurrent requests properly', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => {
        res.json({ message: 'test', timestamp: Date.now() });
      });
      testApp.use(errorHandler);

      // Make concurrent requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(testApp).get('/test'));
      }

      const responses = await Promise.all(promises);
      
      // All should succeed (within limit)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Check that rate limiting headers are present
      responses.forEach(response => {
        expect(response.headers['x-ratelimit-limit']).toBe('10');
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });
    });

    it('should maintain performance under load', async () => {
      const testApp = express();
      const limiter = createRateLimiter({ max: 1000, windowMs: 60000 });
      
      testApp.use(limiter);
      testApp.get('/test', (req, res) => res.json({ message: 'test' }));

      const startTime = Date.now();
      
      // Make 100 requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(request(testApp).get('/test'));
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 requests
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical API usage patterns', async () => {
      const apiApp = express();
      
      // Different limits for different API tiers
      const publicLimiter = createRateLimiter({ max: 100, windowMs: 3600000 }); // 100/hour
      const apiLimiter = createRateLimiter({ max: 1000, windowMs: 3600000 }); // 1000/hour
      const premiumLimiter = createRateLimiter({ max: 10000, windowMs: 3600000 }); // 10000/hour

      apiApp.use('/api/public', publicLimiter);
      apiApp.use('/api/standard', apiLimiter);
      apiApp.use('/api/premium', premiumLimiter);

      apiApp.get('/api/public/data', (req, res) => res.json({ tier: 'public', data: 'public data' }));
      apiApp.get('/api/standard/data', (req, res) => res.json({ tier: 'standard', data: 'standard data' }));
      apiApp.get('/api/premium/data', (req, res) => res.json({ tier: 'premium', data: 'premium data' }));
      
      apiApp.use(errorHandler);

      // Test all tiers work
      const publicResponse = await request(apiApp).get('/api/public/data');
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.tier).toBe('public');

      const standardResponse = await request(apiApp).get('/api/standard/data');
      expect(standardResponse.status).toBe(200);
      expect(standardResponse.body.tier).toBe('standard');

      const premiumResponse = await request(apiApp).get('/api/premium/data');
      expect(premiumResponse.status).toBe(200);
      expect(premiumResponse.body.tier).toBe('premium');
    });

    it('should work with authentication and user-based limiting', async () => {
      const authApp = express();
      
      // User-based rate limiting
      const userLimiter = createRateLimiter({
        max: 10,
        windowMs: 60000,
        keyGenerator: (req) => {
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7); // Extract token
          }
          return req.ip || 'anonymous';
        }
      });

      authApp.use(userLimiter);
      authApp.get('/api/user/profile', (req, res) => {
        res.json({ 
          profile: 'user profile data',
          token: req.headers.authorization?.substring(7) || 'none'
        });
      });
      authApp.use(errorHandler);

      // Test with different tokens
      const token1Response = await request(authApp)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token123');
      expect(token1Response.status).toBe(200);

      const token2Response = await request(authApp)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token456');
      expect(token2Response.status).toBe(200);

      // Multiple requests with same token (9 total, should reach limit)
      for (let i = 0; i < 8; i++) {
        const response = await request(authApp)
          .get('/api/user/profile')
          .set('Authorization', 'Bearer token123');
        expect(response.status).toBe(200);
      }

      // 11th request with same token should be blocked
      const blockedResponse = await request(authApp)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer token123');
      expect(blockedResponse.status).toBe(429);
    });
  });
});