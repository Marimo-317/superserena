import request from 'supertest';
import express, { Application } from 'express';
import { requestLogger, requestLoggerWithTiming, requestLoggerWithHealthSkip } from '../src/middleware/requestLogger';

describe('Request Logger Integration Tests', () => {
  let app: Application;
  let logMessages: string[];
  let mockLogger: jest.Mock;

  beforeEach(() => {
    logMessages = [];
    mockLogger = jest.fn((message: string) => {
      logMessages.push(message);
    });

    app = express();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Integration', () => {
    it('should log requests to Express app with basic middleware', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/test', (req, res) => res.json({ message: 'test' }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/test from/);
      expect(response.body).toEqual({ message: 'test' });
    });

    it('should log different HTTP methods correctly', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/get-test', (req, res) => res.json({ method: 'GET' }));
      app.post('/post-test', (req, res) => res.json({ method: 'POST' }));
      app.put('/put-test', (req, res) => res.json({ method: 'PUT' }));
      app.delete('/delete-test', (req, res) => res.json({ method: 'DELETE' }));

      await request(app).get('/get-test').expect(200);
      await request(app).post('/post-test').expect(200);
      await request(app).put('/put-test').expect(200);
      await request(app).delete('/delete-test').expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(4);
      
      const methods = mockLogger.mock.calls.map(call => {
        const match = call[0].match(/] (\w+) /);
        return match ? match[1] : null;
      });

      expect(methods).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    });

    it('should log requests with query parameters', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/search', (req, res) => res.json({ query: req.query }));

      await request(app)
        .get('/search?q=test&page=1')
        .expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('/search?q=test&page=1');
    });
  });

  describe('Response Time Integration', () => {
    it('should log response time and status code with timing middleware', async () => {
      app.use(requestLogger({ 
        includeResponseTime: true,
        logger: mockLogger 
      }));
      
      app.get('/timing-test', (req, res) => {
        // Add small delay to ensure measurable response time
        setTimeout(() => res.status(201).json({ message: 'delayed response' }), 10);
      });

      await request(app)
        .get('/timing-test')
        .expect(201);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/timing-test from .+ - 201 \(\d+ms\)$/);
    });

    it('should log different status codes correctly', async () => {
      app.use(requestLogger({ 
        includeResponseTime: true,
        logger: mockLogger 
      }));
      
      app.get('/success', (req, res) => res.status(200).json({ status: 'ok' }));
      app.get('/not-found', (req, res) => res.status(404).json({ error: 'not found' }));
      app.get('/server-error', (req, res) => res.status(500).json({ error: 'server error' }));

      await request(app).get('/success').expect(200);
      await request(app).get('/not-found').expect(404);
      await request(app).get('/server-error').expect(500);

      expect(mockLogger).toHaveBeenCalledTimes(3);
      
      const statusCodes = mockLogger.mock.calls.map(call => {
        const match = call[0].match(/ - (\d+) \(/);
        return match ? parseInt(match[1]) : null;
      });

      expect(statusCodes).toEqual([200, 404, 500]);
    });
  });

  describe('Skip Functionality Integration', () => {
    it('should skip health check endpoints with health skip middleware', async () => {
      app.use(requestLogger({
        skip: (url: string) => url === '/health' || url === '/ping' || url === '/status',
        logger: mockLogger
      }));
      
      app.get('/health', (req, res) => res.json({ status: 'healthy' }));
      app.get('/ping', (req, res) => res.json({ pong: true }));
      app.get('/status', (req, res) => res.json({ status: 'ok' }));
      app.get('/api/data', (req, res) => res.json({ data: 'test' }));

      await request(app).get('/health').expect(200);
      await request(app).get('/ping').expect(200);
      await request(app).get('/status').expect(200);
      await request(app).get('/api/data').expect(200);

      // Only the /api/data request should be logged
      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('/api/data');
    });

    it('should work with custom skip logic', async () => {
      app.use(requestLogger({
        skip: (url: string) => url.startsWith('/internal'),
        logger: mockLogger
      }));
      
      app.get('/internal/metrics', (req, res) => res.json({ metrics: {} }));
      app.get('/internal/debug', (req, res) => res.json({ debug: true }));
      app.get('/public/api', (req, res) => res.json({ data: 'public' }));

      await request(app).get('/internal/metrics').expect(200);
      await request(app).get('/internal/debug').expect(200);
      await request(app).get('/public/api').expect(200);

      // Only the /public/api request should be logged
      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('/public/api');
    });
  });

  describe('Custom Format Integration', () => {
    it('should use custom format function in Express app', async () => {
      const customFormat = (logData: any) => `CUSTOM LOG: ${logData.method} ${logData.url} [${logData.ip}]`;
      
      app.use(requestLogger({ 
        format: customFormat,
        logger: mockLogger 
      }));
      app.get('/custom', (req, res) => res.json({ message: 'custom format test' }));

      await request(app)
        .get('/custom')
        .expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toMatch(/^CUSTOM LOG: GET \/custom \[.+\]$/);
    });
  });

  describe('Error Handling Integration', () => {
    it('should continue to work even when route throws error', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      
      app.get('/error-route', (req, res) => {
        throw new Error('Route error');
      });
      
      // Add error handler to prevent test failure
      app.use((err: any, req: any, res: any, next: any) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      await request(app)
        .get('/error-route')
        .expect(500);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('GET /error-route');
    });

    it('should handle middleware errors gracefully with response time logging', async () => {
      const errorFormat = () => {
        throw new Error('Format error');
      };
      
      app.use(requestLogger({ 
        format: errorFormat,
        includeResponseTime: true,
        logger: mockLogger 
      }));
      
      app.get('/format-error', (req, res) => res.json({ message: 'test' }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .get('/format-error')
        .expect(200);

      // Should still log with fallback format
      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/format-error from .+ - 200 \(\d+ms\)$/);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Multiple Middleware Integration', () => {
    it('should work with other Express middleware', async () => {
      app.use(express.json());
      app.use(requestLogger({ logger: mockLogger }));
      
      app.post('/json-test', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { name: 'test', value: 123 };

      await request(app)
        .post('/json-test')
        .send(testData)
        .expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('POST /json-test');
    });

    it('should work with CORS middleware', async () => {
      const cors = require('cors');
      
      app.use(cors());
      app.use(requestLogger({ logger: mockLogger }));
      
      app.get('/cors-test', (req, res) => {
        res.json({ cors: 'enabled' });
      });

      await request(app)
        .get('/cors-test')
        .expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(1);
      const logMessage = mockLogger.mock.calls[0][0];
      expect(logMessage).toContain('GET /cors-test');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle high-frequency requests', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/ping', (req, res) => res.json({ pong: true }));

      // Make multiple concurrent requests
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/ping').expect(200)
      );

      await Promise.all(requests);

      expect(mockLogger).toHaveBeenCalledTimes(10);
      
      // Verify all requests were logged
      mockLogger.mock.calls.forEach(call => {
        expect(call[0]).toContain('GET /ping');
      });
    });

    it('should work with parameterized routes', async () => {
      app.use(requestLogger({ logger: mockLogger }));
      app.get('/users/:id', (req, res) => {
        res.json({ userId: req.params.id });
      });

      await request(app).get('/users/123').expect(200);
      await request(app).get('/users/abc').expect(200);

      expect(mockLogger).toHaveBeenCalledTimes(2);
      expect(mockLogger.mock.calls[0][0]).toContain('/users/123');
      expect(mockLogger.mock.calls[1][0]).toContain('/users/abc');
    });
  });
});