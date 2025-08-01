import request from 'supertest';
import App from '../src/app';
import { HelloResponse, HealthResponse } from '../src/types';

describe('Hello World API', () => {
  let app: App;
  let server: any;

  beforeAll(() => {
    app = new App();
    server = app.getApp();
  });

  describe('GET /', () => {
    it('should return hello world message', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello World',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      const body: HealthResponse = response.body;
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('1.0.0');
      expect(typeof body.uptime).toBe('number');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/hello', () => {
    it('should return API hello message', async () => {
      const response = await request(server)
        .get('/api/hello')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Hello World',
        version: '1.0.0'
      });
    });
  });

  describe('GET /api/hello/:name', () => {
    it('should return personalized greeting', async () => {
      const name = 'SuperSerena';
      const response = await request(server)
        .get(`/api/hello/${name}`)
        .expect(200);

      const body: HelloResponse = response.body;
      expect(body.message).toBe(`Hello ${name}!`);
      expect(body.name).toBe(name);
      expect(body.version).toBe('1.0.0');
      expect(body.timestamp).toBeDefined();
    });

    it('should handle empty name parameter', async () => {
      const response = await request(server)
        .get('/api/hello/ ')
        .expect(400);

      expect(response.body.message).toBe('Name parameter is required');
    });

    it('should handle special characters in name', async () => {
      const name = 'Test-User_123';
      const response = await request(server)
        .get(`/api/hello/${name}`)
        .expect(200);

      expect(response.body.message).toBe(`Hello ${name}!`);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(server)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(server)
        .post('/')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});