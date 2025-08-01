import request from 'supertest';
import express, { Application } from 'express';
import { requestLogger, standardRequestLogger, developmentRequestLogger } from '../src/middleware/requestLogger';

describe('RequestLogger Integration Tests', () => {
  let app: Application;
  let logMessages: string[];
  let mockLogger: jest.Mock;

  beforeEach(() => {
    logMessages = [];
    mockLogger = jest.fn((message: string) => {
      logMessages.push(message);
    });
    
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Express App Integration', () => {
    test('should log GET requests correctly', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/test', (req, res) => {
        res.status(200).json({ message: 'success' });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET');
      expect(logMessages[0]).toContain('/test');
      expect(logMessages[0]).toContain('(200 -');
      expect(logMessages[0]).toMatch(/\d+ms\)/);
    });

    test('should log POST requests with different status codes', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.post('/users', (req, res) => {
        res.status(201).json({ id: 1, name: 'Test User' });
      });

      await request(app)
        .post('/users')
        .send({ name: 'Test User' })
        .expect(201);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('POST');
      expect(logMessages[0]).toContain('/users');
      expect(logMessages[0]).toContain('(201 -');
    });

    test('should log error responses correctly', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/error', (req, res) => {
        res.status(500).json({ error: 'Internal Server Error' });
      });

      await request(app)
        .get('/error')
        .expect(500);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET');
      expect(logMessages[0]).toContain('/error');
      expect(logMessages[0]).toContain('(500 -');
    });

    test('should handle 404 responses', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      // Add a catch-all route to ensure 404 response
      app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
      });
      
      await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET');
      expect(logMessages[0]).toContain('/nonexistent');
      expect(logMessages[0]).toContain('(404 -');
    });
  });

  describe('Query Parameters and Complex URLs', () => {
    test('should log URLs with query parameters', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/search', (req, res) => {
        res.json({ query: req.query.q });
      });

      await request(app)
        .get('/search?q=test&page=1')
        .expect(200);

      expect(logMessages[0]).toContain('/search?q=test&page=1');
    });

    test('should log encoded URLs correctly', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/user/:id', (req, res) => {
        res.json({ id: req.params.id });
      });

      await request(app)
        .get('/user/test%20user')
        .expect(200);

      expect(logMessages[0]).toContain('/user/test%20user');
    });
  });

  describe('Multiple Requests', () => {
    test('should log multiple sequential requests', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      expect(logMessages).toHaveLength(3);
      logMessages.forEach(message => {
        expect(message).toContain('GET /test');
        expect(message).toContain('(200 -');
      });
    });

    test('should handle concurrent requests', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/concurrent', (req, res) => {
        // Simulate some async work
        setTimeout(() => {
          res.json({ timestamp: Date.now() });
        }, Math.random() * 100);
      });

      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/concurrent').expect(200)
      );

      await Promise.all(promises);

      expect(logMessages).toHaveLength(5);
      logMessages.forEach(message => {
        expect(message).toContain('GET /concurrent');
        expect(message).toContain('(200 -');
      });
    });
  });

  describe('Custom Format Integration', () => {
    test('should work with custom format function', async () => {
      const customFormat = (logData: any) => 
        `${logData.method} ${logData.url} -> ${logData.statusCode}`;

      app.use(requestLogger({ 
        logger: mockLogger,
        format: customFormat
      }));
      app.get('/custom', (req, res) => {
        res.json({ message: 'custom format test' });
      });

      await request(app)
        .get('/custom')
        .expect(200);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toBe('GET /custom -> 200');
    });
  });

  describe('Skip Function Integration', () => {
    test('should skip health check endpoints', async () => {
      app.use(requestLogger({ 
        logger: mockLogger,
        skip: (req) => req.path === '/health'
      }));
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
      app.get('/api', (req, res) => res.json({ data: 'test' }));

      await request(app).get('/health').expect(200);
      await request(app).get('/api').expect(200);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET /api');
    });

    test('should skip based on response status', async () => {
      app.use(requestLogger({ 
        logger: mockLogger,
        skip: (req, res) => req.path === '/notfound'
      }));
      app.get('/exists', (req, res) => res.json({ found: true }));
      app.use((req, res) => {
        res.status(404).json({ error: 'Not found' });
      });

      await request(app).get('/exists').expect(200);
      await request(app).get('/notfound').expect(404);

      // Should only log the successful request
      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET /exists');
    });
  });

  describe('Standard Logger Configurations', () => {
    test('standardRequestLogger integration', async () => {
      let logMessage = '';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation((msg) => {
        logMessage = msg;
      });

      app.use(standardRequestLogger);
      app.get('/standard', (req, res) => {
        res.json({ test: 'standard logger' });
      });

      await request(app)
        .get('/standard')
        .expect(200);

      expect(logMessage).toContain('GET /standard');
      expect(logMessage).toContain('(200 -');
      expect(logMessage).toMatch(/\d+ms\)/);

      consoleSpy.mockRestore();
    });

    test('developmentRequestLogger should skip health and favicon', async () => {
      let logMessages: string[] = [];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation((msg) => {
        logMessages.push(msg);
      });

      app.use(developmentRequestLogger);
      app.get('/health', (req, res) => res.json({ status: 'ok' }));
      app.get('/favicon.ico', (req, res) => res.send(''));
      app.get('/api', (req, res) => res.json({ data: 'test' }));

      await request(app).get('/health').expect(200);
      await request(app).get('/favicon.ico').expect(200);
      await request(app).get('/api').expect(200);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET /api');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle middleware errors gracefully', async () => {
      const errorFormat = () => {
        throw new Error('Format error');
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((msg) => {
        logMessages.push(msg);
      });

      app.use(requestLogger({ format: errorFormat }));
      app.get('/error-test', (req, res) => {
        res.json({ message: 'should still work' });
      });

      await request(app)
        .get('/error-test')
        .expect(200);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Request logger format error:', 
        expect.any(Error)
      );
      
      // Should fallback to default format
      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('GET /error-test');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Request Body Logging', () => {
    test('should log request body when enabled', async () => {
      const customFormat = (logData: any) => 
        `${logData.method} ${logData.url} - Body: ${JSON.stringify(logData.body)}`;

      app.use(requestLogger({ 
        logger: mockLogger,
        includeBody: true,
        format: customFormat
      }));
      
      app.post('/body-test', (req, res) => {
        res.json({ received: req.body });
      });

      await request(app)
        .post('/body-test')
        .send({ name: 'test', value: 123 })
        .expect(200);

      expect(logMessages).toHaveLength(1);
      expect(logMessages[0]).toContain('POST /body-test');
      expect(logMessages[0]).toContain('"name":"test"');
      expect(logMessages[0]).toContain('"value":123');
    });
  });

  describe('Response Time Accuracy', () => {
    test('should measure response time accurately', async () => {
      app.use(requestLogger({ logger: mockLogger, includeResponseTime: true }));
      app.get('/slow', (req, res) => {
        setTimeout(() => {
          res.json({ message: 'slow response' });
        }, 100);
      });

      const start = Date.now();
      await request(app)
        .get('/slow')
        .expect(200);
      const end = Date.now();
      const actualTime = end - start;

      expect(logMessages).toHaveLength(1);
      const loggedTime = parseInt(logMessages[0].match(/(\d+)ms\)/)?.[1] || '0');
      
      // Logged time should be reasonable (within 50ms of actual time)
      expect(loggedTime).toBeGreaterThan(90);
      expect(loggedTime).toBeLessThan(actualTime + 50);
    });
  });
});