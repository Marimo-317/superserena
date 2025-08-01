import request from 'supertest';
import express, { Application } from 'express';
import { createRequestLogger, skipHealthChecks } from '../src/middleware/requestLogger';
import { Logger } from '../src/types/logger';

// Mock logger for integration testing
class TestLogger implements Logger {
  public logs: Array<{ level: string; message: string }> = [];

  info(message: string): void {
    this.logs.push({ level: 'info', message });
  }

  warn(message: string): void {
    this.logs.push({ level: 'warn', message });
  }

  error(message: string): void {
    this.logs.push({ level: 'error', message });
  }

  reset(): void {
    this.logs = [];
  }

  getLastLog(): { level: string; message: string } | undefined {
    return this.logs[this.logs.length - 1];
  }
}

describe('RequestLogger Integration Tests', () => {
  let app: Application;
  let testLogger: TestLogger;

  beforeEach(() => {
    app = express();
    testLogger = new TestLogger();
    
    // Setup basic Express app
    app.use(express.json());
    
    // Add request logger middleware
    app.use(createRequestLogger({
      includeResponseTime: true,
      includeUserAgent: true
    }, testLogger));
    
    // Test routes
    app.get('/', (req, res) => {
      res.json({ message: 'Hello World' });
    });
    
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
    
    app.post('/api/data', (req, res) => {
      res.status(201).json({ data: req.body, message: 'Created' });
    });
    
    app.get('/error', (req, res) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });
    
    app.get('/not-found', (req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });
  });

  afterEach(() => {
    testLogger.reset();
  });

  describe('Basic Request Logging', () => {
    it('should log GET requests with 200 status', async () => {
      await request(app)
        .get('/')
        .expect(200);

      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.level).toBe('info');
      expect(log?.message).toMatch(/\[.*\] GET \/ from ::ffff:127\.0\.0\.1 - 200 - \d+ms/);
    });

    it('should log POST requests with request data', async () => {
      const testData = { name: 'test', value: 123 };
      
      await request(app)
        .post('/api/data')
        .send(testData)
        .expect(201);

      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.level).toBe('info');
      expect(log?.message).toMatch(/\[.*\] POST \/api\/data from ::ffff:127\.0\.0\.1 - 201 - \d+ms/);
    });

    it('should include user agent in logs', async () => {
      await request(app)
        .get('/')
        .set('User-Agent', 'test-browser/1.0')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log?.message).toContain('test-browser/1.0');
    });

    it('should include response time in logs', async () => {
      await request(app)
        .get('/')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log?.message).toMatch(/\d+ms/);
    });
  });

  describe('Error Status Code Logging', () => {
    it('should log 404 errors as warnings', async () => {
      await request(app)
        .get('/not-found')
        .expect(404);

      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.level).toBe('warn');
      expect(log?.message).toContain('404');
    });

    it('should log 500 errors as errors', async () => {
      await request(app)
        .get('/error')
        .expect(500);

      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.level).toBe('error');
      expect(log?.message).toContain('500');
    });
  });

  describe('Skip Functionality', () => {
    it('should skip health check endpoints when configured', async () => {
      // Create new app with skip configuration
      const appWithSkip = express();
      appWithSkip.use(express.json());
      
      // Add request logger with skip health checks
      appWithSkip.use(createRequestLogger({
        skip: skipHealthChecks(['/health'])
      }, testLogger));
      
      appWithSkip.get('/health', (req, res) => {
        res.json({ status: 'healthy' });
      });
      
      appWithSkip.get('/api/test', (req, res) => {
        res.json({ message: 'test' });
      });

      // Health check should not be logged
      await request(appWithSkip)
        .get('/health')
        .expect(200);

      expect(testLogger.logs).toHaveLength(0);

      // Regular endpoint should be logged
      await request(appWithSkip)
        .get('/api/test')
        .expect(200);

      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.message).toContain('/api/test');
    });
  });

  describe('Custom Logger Integration', () => {
    it('should work with custom logger implementation', async () => {
      class CustomLogger implements Logger {
        public messages: string[] = [];

        info(message: string): void {
          this.messages.push(`INFO: ${message}`);
        }

        warn(message: string): void {
          this.messages.push(`WARN: ${message}`);
        }

        error(message: string): void {
          this.messages.push(`ERROR: ${message}`);
        }
      }

      const customLogger = new CustomLogger();
      const customApp = express();
      
      customApp.use(createRequestLogger({}, customLogger));
      customApp.get('/test', (req, res) => res.json({ test: true }));

      await request(customApp)
        .get('/test')
        .expect(200);

      expect(customLogger.messages).toHaveLength(1);
      expect(customLogger.messages[0]).toMatch(/^INFO: \[.*\] GET \/test/);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests correctly', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app).get(`/?id=${i}`)
      );

      await Promise.all(requests);

      expect(testLogger.logs).toHaveLength(5);
      
      // Each request should have its own log entry
      testLogger.logs.forEach((log, index) => {
        expect(log.level).toBe('info');
        expect(log.message).toContain(`/?id=${index}`);
      });
    });
  });

  describe('Custom Format Integration', () => {
    it('should use custom format function in real requests', async () => {
      const customApp = express();
      
      customApp.use(createRequestLogger({
        format: (logData) => `CUSTOM_FORMAT: ${logData.method} ${logData.url} -> ${logData.statusCode}`
      }, testLogger));
      
      customApp.get('/custom', (req, res) => res.json({ custom: true }));

      await request(customApp)
        .get('/custom')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log?.message).toBe('CUSTOM_FORMAT: GET /custom -> 200');
    });
  });

  describe('Request Body Integration', () => {
    it('should handle request body logging when enabled', async () => {
      const bodyApp = express();
      bodyApp.use(express.json());
      
      // Custom format that includes body information
      bodyApp.use(createRequestLogger({
        includeBody: true,
        format: (logData) => {
          const bodyInfo = logData.body ? ` body:${JSON.stringify(logData.body)}` : '';
          return `${logData.method} ${logData.url}${bodyInfo}`;
        }
      }, testLogger));
      
      bodyApp.post('/data', (req, res) => res.json({ received: true }));

      await request(bodyApp)
        .post('/data')
        .send({ test: 'data', number: 42 })
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log?.message).toContain('body:{"test":"data","number":42}');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle response errors gracefully', async () => {
      const errorApp = express();
      
      errorApp.use(createRequestLogger({}, testLogger));
      
      // Route that triggers a response error
      errorApp.get('/response-error', (req, res) => {
        // Simulate response error
        res.on('error', () => {
          // This would normally be handled by the middleware
        });
        
        res.json({ message: 'success' });
      });

      await request(errorApp)
        .get('/response-error')
        .expect(200);

      // Should still log the successful request
      expect(testLogger.logs).toHaveLength(1);
      const log = testLogger.getLastLog();
      expect(log?.level).toBe('info');
      expect(log?.message).toContain('GET /response-error');
    });
  });
});