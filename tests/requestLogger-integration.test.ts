import request from 'supertest';
import express, { Application } from 'express';
import { createRequestLogger, requestLogger } from '../src/middleware/requestLogger';
import { Logger } from '../src/types/logger';

// Mock logger for integration testing
class TestLogger implements Logger {
  public logs: Array<{ level: string; message: string }> = [];

  info(message: string): void {
    this.logs.push({ level: 'info', message });
  }

  error(message: string): void {
    this.logs.push({ level: 'error', message });
  }

  warn(message: string): void {
    this.logs.push({ level: 'warn', message });
  }

  clear(): void {
    this.logs = [];
  }

  getLastLog(): { level: string; message: string } | undefined {
    return this.logs[this.logs.length - 1];
  }
}

describe('Request Logger Integration Tests', () => {
  let app: Application;
  let testLogger: TestLogger;

  beforeEach(() => {
    testLogger = new TestLogger();
    app = express();
    
    // Basic test routes
    app.get('/test', (req, res) => {
      res.json({ message: 'test success' });
    });
    
    app.get('/error', (req, res) => {
      res.status(500).json({ error: 'server error' });
    });
    
    app.get('/not-found', (req, res) => {
      res.status(404).json({ error: 'not found' });
    });
    
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.post('/data', express.json(), (req, res) => {
      res.status(201).json({ received: req.body });
    });
  });

  describe('Default request logger integration', () => {
    beforeEach(() => {
      app = express();
      app.use(createRequestLogger({}, testLogger));
      
      // Define routes after middleware
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });
      
      app.get('/error', (req, res) => {
        res.status(500).json({ error: 'server error' });
      });
      
      app.get('/not-found', (req, res) => {
        res.status(404).json({ error: 'not found' });
      });
      
      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      app.post('/data', express.json(), (req, res) => {
        res.status(201).json({ received: req.body });
      });
    });

    it('should log GET requests with full details', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log).toBeDefined();
      expect(log!.level).toBe('info');
      expect(log!.message).toMatch(/\[.*\] GET \/test from .* - 200 \(\d+ms\)/);
    });

    it('should log POST requests', async () => {
      await request(app)
        .post('/data')
        .send({ test: 'data' })
        .expect(201);

      const log = testLogger.getLastLog();
      expect(log).toBeDefined();
      expect(log!.level).toBe('info');
      expect(log!.message).toMatch(/\[.*\] POST \/data from .* - 201 \(\d+ms\)/);
    });

    it('should log 404 errors as warnings', async () => {
      await request(app)
        .get('/not-found')
        .expect(404);

      const log = testLogger.getLastLog();
      expect(log).toBeDefined();
      expect(log!.level).toBe('warn');
      expect(log!.message).toMatch(/\[.*\] GET \/not-found from .* - 404 \(\d+ms\)/);
    });

    it('should log 500 errors as errors', async () => {
      await request(app)
        .get('/error')
        .expect(500);

      const log = testLogger.getLastLog();
      expect(log).toBeDefined();
      expect(log!.level).toBe('error');
      expect(log!.message).toMatch(/\[.*\] GET \/error from .* - 500 \(\d+ms\)/);
    });

    it('should include User-Agent when configured', async () => {
      app.use(createRequestLogger({ includeUserAgent: true }, testLogger));
      app.get('/ua-test', (req, res) => res.json({ ok: true }));

      await request(app)
        .get('/ua-test')
        .set('User-Agent', 'integration-test-agent')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log!.message).toContain('"integration-test-agent"');
    });
  });

  describe('Configuration options integration', () => {
    it('should skip specified paths', async () => {
      app = express();
      app.use(createRequestLogger({ skipPaths: ['/health'] }, testLogger));
      
      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });
      
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });

      await request(app)
        .get('/health')
        .expect(200);

      // Should not log the health check
      expect(testLogger.logs).toHaveLength(0);

      await request(app)
        .get('/test')
        .expect(200);

      // Should log normal requests
      expect(testLogger.logs).toHaveLength(1);
    });

    it('should skip specified methods', async () => {
      app = express();
      app.use(createRequestLogger({ skipMethods: ['OPTIONS'] }, testLogger));
      
      // Add OPTIONS route
      app.options('/options-test', (req, res) => {
        res.header('Access-Control-Allow-Methods', 'GET,POST');
        res.sendStatus(200);
      });

      await request(app)
        .options('/options-test')
        .expect(200);

      // Should not log OPTIONS requests
      expect(testLogger.logs).toHaveLength(0);
    });

    it('should use custom format', async () => {
      app = express();
      const customLogger = createRequestLogger({
        customFormat: (logData) => `CUSTOM: ${logData.method} -> ${logData.url} [${logData.status}]`
      }, testLogger);
      
      app.use(customLogger);
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log!.message).toBe('CUSTOM: GET -> /test [200]');
    });

    it('should handle minimal logging configuration', async () => {
      app = express();
      const minimalLogger = createRequestLogger({
        includeIP: false,
        includeStatus: false,
        includeResponseTime: false,
        includeUserAgent: false
      }, testLogger);
      
      app.use(minimalLogger);
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log!.message).toMatch(/\[.*\] GET \/test$/);
      expect(log!.message).not.toContain('from');
      expect(log!.message).not.toContain('ms');
      expect(log!.message).not.toContain(' - ');
    });
  });

  describe('Multiple requests integration', () => {
    beforeEach(() => {
      app = express();
      app.use(createRequestLogger({}, testLogger));
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });
    });

    it('should log multiple sequential requests', async () => {
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      expect(testLogger.logs).toHaveLength(3);
      testLogger.logs.forEach((log, index) => {
        expect(log.level).toBe('info');
        expect(log.message).toMatch(/\[.*\] GET \/test from .* - 200 \(\d+ms\)/);
      });
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        request(app).get('/test'),
        request(app).get('/test'),
        request(app).get('/test')
      ];

      await Promise.all(promises);

      expect(testLogger.logs).toHaveLength(3);
      testLogger.logs.forEach(log => {
        expect(log.level).toBe('info');
        expect(log.message).toMatch(/\[.*\] GET \/test from .* - 200 \(\d+ms\)/);
      });
    });
  });

  describe('Real app integration', () => {
    it('should work with the actual App class structure', async () => {
      // Simulate the actual app structure
      class TestApp {
        public app: Application;

        constructor() {
          this.app = express();
          this.initializeMiddleware();
          this.initializeRoutes();
        }

        private initializeMiddleware(): void {
          this.app.use(express.json());
          this.app.use(createRequestLogger({}, testLogger));
        }

        private initializeRoutes(): void {
          this.app.get('/api/test', (req, res) => {
            res.json({ message: 'App integration test' });
          });
        }
      }

      const testApp = new TestApp();

      await request(testApp.app)
        .get('/api/test')
        .expect(200);

      const log = testLogger.getLastLog();
      expect(log).toBeDefined();
      expect(log!.level).toBe('info');
      expect(log!.message).toMatch(/\[.*\] GET \/api\/test from .* - 200 \(\d+ms\)/);
    });
  });

  describe('Error handling integration', () => {
    it('should continue working even if logger throws error', async () => {
      const errorLogger: Logger = {
        info: jest.fn().mockImplementation(() => { throw new Error('Logger error'); }),
        error: jest.fn(),
        warn: jest.fn()
      };

      app = express();
      app.use(createRequestLogger({}, errorLogger));
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });

      // Request should still work despite logger error
      await request(app)
        .get('/test')
        .expect(200);

      expect(errorLogger.error).toHaveBeenCalledWith('Request logger error: Logger error');
    });

    it('should handle response send modifications correctly', async () => {
      app = express();
      app.use(createRequestLogger({}, testLogger));
      
      // Add middleware that modifies response
      app.use((req, res, next) => {
        const originalJson = res.json;
        res.json = function(obj: any) {
          return originalJson.call(this, { ...obj, modified: true });
        };
        next();
      });
      
      app.get('/test', (req, res) => {
        res.json({ message: 'test success' });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'test success', modified: true });
      
      const log = testLogger.getLastLog();
      expect(log!.message).toMatch(/\[.*\] GET \/test from .* - 200 \(\d+ms\)/);
    });
  });
});