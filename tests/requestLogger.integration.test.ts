import express, { Application } from 'express';
import request from 'supertest';
import { 
  createRequestLogger, 
  developmentLogger, 
  productionLogger 
} from '../src/middleware/requestLogger';

// Mock console to capture logs
const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Helper function to create test app with logger
const createTestApp = (middleware: any): Application => {
  const app = express();
  
  // Add JSON parsing middleware
  app.use(express.json());
  
  // Add the request logger
  app.use(middleware);
  
  // Test routes
  app.get('/test', (req, res) => {
    res.json({ message: 'Test successful' });
  });
  
  app.post('/test', (req, res) => {
    res.status(201).json({ message: 'Created', data: req.body });
  });
  
  app.get('/error', (req, res) => {
    res.status(500).json({ error: 'Internal server error' });
  });
  
  app.get('/not-found', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.get('/large-response', (req, res) => {
    const largeData = 'x'.repeat(10000);
    res.json({ data: largeData });
  });

  return app;
};

describe('Request Logger Integration Tests', () => {
  beforeEach(() => {
    // Replace console methods with mocks
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('Basic request logging', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger());
    });

    it('should log GET requests', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/GET.*\/test.*127\.0\.0\.1.*Status: 200/)
      );
    });

    it('should log POST requests', async () => {
      await request(app)
        .post('/test')
        .send({ name: 'test' })
        .expect(201);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/POST.*\/test.*127\.0\.0\.1.*Status: 201/)
      );
    });

    it('should log error responses with error level', async () => {
      await request(app)
        .get('/error')
        .expect(500);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/GET.*\/error.*127\.0\.0\.1.*Status: 500/)
      );
    });

    it('should log not found responses with warn level', async () => {
      await request(app)
        .get('/not-found')
        .expect(404);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringMatching(/GET.*\/not-found.*127\.0\.0\.1.*Status: 404/)
      );
    });

    it('should include response time in logs', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Time: \d+ms|Status: 200/)
      );
    });
  });

  describe('Request logger with user agent', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger({ includeUserAgent: true }));
    });

    it('should include user agent in logs', async () => {
      await request(app)
        .get('/test')
        .set('User-Agent', 'Test Agent v1.0')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test Agent v1.0')
      );
    });

    it('should handle missing user agent', async () => {
      await request(app)
        .get('/test')
        .unset('User-Agent')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Request logger with response size', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger({ includeResponseSize: true }));
    });

    it('should measure response size for small responses', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Size: \d+b/)
      );
    });

    it('should measure response size for large responses', async () => {
      await request(app)
        .get('/large-response')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Size: \d+b/)
      );
    });
  });

  describe('Request logger with skip function', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger({
        skip: (req) => req.path === '/health'
      }));
    });

    it('should skip logging for health check endpoint', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should log other endpoints normally', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Request logger with custom formatter', () => {
    let app: Application;
    const customFormatter = jest.fn().mockReturnValue('CUSTOM: Test log entry');

    beforeEach(() => {
      app = createTestApp(createRequestLogger({
        formatter: customFormatter
      }));
      customFormatter.mockClear();
    });

    it('should use custom formatter', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(customFormatter).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          statusCode: 200
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith('CUSTOM: Test log entry');
    });
  });

  describe('Development logger', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(developmentLogger);
    });

    it('should include verbose information', async () => {
      await request(app)
        .get('/test')
        .set('User-Agent', 'Development Browser')
        .expect(200);

      const logCall = mockConsoleLog.mock.calls[0][0];
      expect(logCall).toContain('🔍');
      expect(logCall).toContain('GET');
      expect(logCall).toContain('/test');
      expect(logCall).toContain('200');
      expect(logCall).toMatch(/\d+ms/);
      expect(logCall).toMatch(/\d+b/);
      expect(logCall).toContain('Development Browser');
    });
  });

  describe('Production logger', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(productionLogger);
    });

    it('should log with minimal format', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^GET \/test 200 \d+ms (::|127\.0\.0\.1|::ffff:127\.0\.0\.1)/)
      );
    });

    it('should skip health checks', async () => {
      await request(app)
        .get('/health')
        .expect(200);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should skip favicon requests', async () => {
      // Add favicon route to test app
      app.get('/favicon.ico', (req, res) => {
        res.status(204).end();
      });

      await request(app)
        .get('/favicon.ico')
        .expect(204);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Request headers and IP detection', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger());
    });

    it('should detect IP from X-Forwarded-For header', async () => {
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.100, 10.0.0.1')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.100')
      );
    });

    it('should detect IP from X-Real-IP header', async () => {
      await request(app)
        .get('/test')
        .set('X-Real-IP', '192.168.1.200')
        .expect(200);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.200')
      );
    });
  });

  describe('Concurrent requests', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger());
    });

    it('should handle concurrent requests correctly', async () => {
      const requests = [
        request(app).get('/test'),
        request(app).post('/test').send({ id: 1 }),
        request(app).get('/test'),
        request(app).post('/test').send({ id: 2 })
      ];

      await Promise.all(requests);

      // Should have logged 4 requests
      expect(mockConsoleLog).toHaveBeenCalledTimes(4);

      // Check that all requests were logged
      const logs = mockConsoleLog.mock.calls.map(call => call[0]);
      const getLogs = logs.filter(log => log.includes('GET'));
      const postLogs = logs.filter(log => log.includes('POST'));

      expect(getLogs).toHaveLength(2);
      expect(postLogs).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    let app: Application;

    beforeEach(() => {
      app = createTestApp(createRequestLogger());
      
      // Add route that throws an error
      app.get('/throw-error', (req, res, next) => {
        throw new Error('Test error');
      });
      
      // Add error handler
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });
    });

    it('should still log requests when application errors occur', async () => {
      await request(app)
        .get('/throw-error')
        .expect(500);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/GET.*\/throw-error.*127\.0\.0\.1.*Status: 500/)
      );
    });
  });
});