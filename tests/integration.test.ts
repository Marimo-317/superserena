import request from 'supertest';
import App from '../src/app';

describe('Integration Tests', () => {
  let app: App;
  let server: any;

  beforeAll(() => {
    app = new App();
    server = app.getApp();
  });

  describe('API Workflow', () => {
    it('should perform complete API workflow', async () => {
      // 1. Health check
      const healthResponse = await request(server)
        .get('/health')
        .expect(200);
      
      expect(healthResponse.body.status).toBe('healthy');

      // 2. Basic hello
      const helloResponse = await request(server)
        .get('/')
        .expect(200);
      
      expect(helloResponse.body.message).toBe('Hello World');

      // 3. API hello
      const apiHelloResponse = await request(server)
        .get('/api/hello')
        .expect(200);
      
      expect(apiHelloResponse.body.message).toBe('Hello World');

      // 4. Personalized hello
      const personalizedResponse = await request(server)
        .get('/api/hello/Integration-Test')
        .expect(200);
      
      expect(personalizedResponse.body.message).toBe('Hello Integration-Test!');
    });

    it('should maintain consistent response format', async () => {
      const endpoints = ['/', '/health', '/api/hello', '/api/hello/test'];
      
      for (const endpoint of endpoints) {
        const response = await request(server).get(endpoint);
        
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
        expect(response.body.version).toBe('1.0.0');
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(server)
        .get('/')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = [];
      const requestCount = 10;
      
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(server)
            .get(`/api/hello/user${i}`)
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.body.message).toBe(`Hello user${index}!`);
      });
    });
  });
});