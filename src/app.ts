import express, { Application } from 'express';
import cors from 'cors';
import { helloRoutes } from './routes/helloRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

class App {
  public app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    this.app.use('/', helloRoutes);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Hello World API is running on port ${this.port}`);
      console.log(`📍 Available endpoints:`);
      console.log(`   GET / - Hello World`);
      console.log(`   GET /health - Health Check`);
      console.log(`   GET /api/hello - API Hello`);
      console.log(`   GET /api/hello/:name - Personalized Hello`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const app = new App();
  app.listen();
}

export default App;