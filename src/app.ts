import express, { Application } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import { helloRoutes } from './routes/helloRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { SuperClaudeVisualizationOrchestrator } from './visualization/VisualizationOrchestrator';
import { VisualizationAPI } from './visualization/api/VisualizationAPI';
import { VisualizationWebSocketServer } from './visualization/WebSocketServer';
import winston from 'winston';

class App {
  public app: Application;
  private server: Server;
  private readonly port: number;
  private readonly wsPort: number;
  private orchestrator: SuperClaudeVisualizationOrchestrator;
  private visualizationAPI: VisualizationAPI;
  private wsServer: VisualizationWebSocketServer;
  private logger: winston.Logger;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.wsPort = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);
    
    this.initializeLogger();
    this.initializeVisualization();
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
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    this.app.use('/', helloRoutes);
    this.app.use('/api/visualization', this.visualizationAPI.getRouter());
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async listen(): Promise<void> {
    await this.orchestrator.initialize();
    
    this.server.listen(this.port, () => {
      console.log(`🚀 SuperClaude Visualization API is running on port ${this.port}`);
      console.log(`🌐 WebSocket server is running on port ${this.wsPort}`);
      console.log(`📍 Available endpoints:`);
      console.log(`   GET / - Hello World`);
      console.log(`   GET /health - Health Check`);
      console.log(`   GET /api/hello - API Hello`);
      console.log(`   GET /api/hello/:name - Personalized Hello`);
      console.log(`   GET /api/visualization/* - Visualization API`);
      console.log(`   WebSocket: ws://localhost:${this.wsPort} - Real-time updates`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
    });

    this.wsServer.start();
    this.wsServer.startPeriodicUpdates(5000);
  }

  public getApp(): Application {
    return this.app;
  }

  public getServer(): Server {
    return this.server;
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down application...');
    
    this.wsServer.stop();
    await this.orchestrator.shutdown();
    
    this.server.close(() => {
      this.logger.info('Application shut down successfully');
    });
  }

  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'superclaudeapi' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  private initializeVisualization(): void {
    this.orchestrator = new SuperClaudeVisualizationOrchestrator();
    this.visualizationAPI = new VisualizationAPI(this.orchestrator, this.logger);
    this.wsServer = new VisualizationWebSocketServer(this.server, this.orchestrator, this.logger);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const app = new App();
  app.listen().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
}

export default App;