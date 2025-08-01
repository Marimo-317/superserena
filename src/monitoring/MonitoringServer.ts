/**
 * SuperClaude Monitoring Server
 * Integrated monitoring server with WebSocket and REST API
 */

import express, { Express } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import cors from 'cors';
import { ExecutionTracker } from './ExecutionTracker';
import { SuperClaudeWebSocketServer } from './WebSocketServer';
import { MonitoringAPI } from './MonitoringAPI';
import { MonitoringConfig } from '../types/monitoring';
import path from 'path';

export class MonitoringServer {
  private app!: Express;
  private httpServer!: HTTPServer;
  private tracker!: ExecutionTracker;
  private wsServer!: SuperClaudeWebSocketServer;
  private api!: MonitoringAPI;
  private config: MonitoringConfig;
  private isRunning: boolean = false;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enableRealTimeUpdates: true,
      logLevel: 'info',
      retentionDays: 30,
      maxSessionHistory: 1000,
      performanceThresholds: {
        maxExecutionTime: 300000, // 5 minutes
        minTokenReduction: 30, // 30%
        minQualityScore: 80 // 80/100
      },
      alerting: {
        enableSlackNotifications: false,
        enableEmailNotifications: false
      },
      ...config
    };

    this.initializeApp();
    this.initializeServices();
  }

  private initializeApp(): void {
    this.app = express();
    this.httpServer = createServer(this.app);

    // Middleware
    this.app.use(cors({
      origin: "*", // Configure based on security requirements
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files for dashboard
    this.app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist')));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });

    // Serve dashboard at root
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
    });
  }

  private initializeServices(): void {
    // Initialize execution tracker
    this.tracker = new ExecutionTracker(this.config);

    // Initialize WebSocket server
    this.wsServer = new SuperClaudeWebSocketServer(this.httpServer, this.tracker);

    // Initialize REST API
    this.api = new MonitoringAPI(this.tracker, this.wsServer, this.config);
    this.app.use('/api/monitoring', this.api.getRouter());

    // Setup error handling
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: this.config.logLevel === 'debug' ? err.message : 'Something went wrong'
      });
    });

    // Process error handlers
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown('SIGTERM');
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  /**
   * Start the monitoring server
   */
  public async start(port: number = 3001): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(port, () => {
        this.isRunning = true;
        console.log(`🚀 SuperClaude Monitoring Server started on port ${port}`);
        console.log(`📊 Dashboard: http://localhost:${port}`);
        console.log(`🔌 WebSocket: ws://localhost:${port}`);
        console.log(`🌐 API: http://localhost:${port}/api/monitoring`);
        resolve();
      });

      this.httpServer.on('error', (error) => {
        console.error('Failed to start monitoring server:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the monitoring server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Monitoring server is not running');
      return;
    }

    return new Promise((resolve) => {
      console.log('Stopping SuperClaude Monitoring Server...');
      
      // Close WebSocket server
      this.wsServer.shutdown();

      // Close HTTP server
      this.httpServer.close(() => {
        this.isRunning = false;
        console.log('Monitoring server stopped successfully');
        resolve();
      });
    });
  }

  /**
   * Get execution tracker instance
   */
  public getTracker(): ExecutionTracker {
    return this.tracker;
  }

  /**
   * Get WebSocket server instance
   */
  public getWebSocketServer(): SuperClaudeWebSocketServer {
    return this.wsServer;
  }

  /**
   * Get current configuration
   */
  public getConfig(): MonitoringConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Configuration updated');
  }

  /**
   * Get server status
   */
  public getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      connectedClients: this.wsServer.getConnectedClients(),
      activeSession: !!this.tracker.getCurrentSession(),
      totalSessions: this.tracker.getSessionHistory().length,
      statistics: this.tracker.getStatistics()
    };
  }

  /**
   * Simulate SuperClaude execution for demo purposes
   */
  public async simulateExecution(): Promise<string> {
    console.log('🎭 Starting SuperClaude execution simulation...');
    
    // Start session
    const sessionId = await this.tracker.startSession({
      type: 'manual',
      source: 'simulation',
      user: 'demo-user'
    });

    // Simulate agents
    const agents = [
      { type: 'sparc-orchestrator', task: 'Coordinating multi-agent execution' },
      { type: 'sparc-architect', task: 'Designing system architecture' },
      { type: 'sparc-coder', task: 'Implementing code features' },
      { type: 'sparc-security-reviewer', task: 'Security vulnerability assessment' },
      { type: 'sparc-performance', task: 'Performance optimization' }
    ];

    // Start agents sequentially with delays
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      await this.tracker.updateAgent({
        agentId: `agent-${i + 1}`,
        agentType: agent.type as any,
        status: 'active',
        currentTask: agent.task,
        progress: 0,
        startTime: new Date(),
        tokenUsage: {
          input: 1000,
          output: 800,
          total: 1800,
          optimized: 1200,
          reductionPercentage: 33.3
        },
        evidence: [`Started ${agent.task.toLowerCase()}`]
      });

      // Simulate progress
      for (let progress = 25; progress <= 100; progress += 25) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.tracker.updateAgent({
          agentId: `agent-${i + 1}`,
          progress,
          status: progress === 100 ? 'completed' : 'active',
          evidence: [`Progress: ${progress}% - ${agent.task}`]
        });
      }
    }

    // Simulate SPARC phases
    const phases = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
    for (let i = 0; i < phases.length; i++) {
      await this.tracker.updateSPARCPhase({
        phase: phases[i] as any,
        status: 'in_progress',
        progress: 50,
        qualityScore: 85 + i * 2,
        artifacts: [`${phases[i]}.md`],
        assignedAgents: [`agent-${i + 1}`],
        evidence: {
          documents: [`${phases[i]}-requirements.md`],
          codeFiles: [`${phases[i]}.ts`],
          testResults: [`${phases[i]}.test.ts`],
          qualityMetrics: { complexity: 0.3 + i * 0.1, coverage: 90 + i }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      await this.tracker.updateSPARCPhase({
        phase: phases[i] as any,
        status: 'completed',
        progress: 100,
        completionTime: new Date()
      });
    }

    // Simulate quality gates
    for (let step = 1; step <= 8; step++) {
      await this.tracker.updateQualityGate({
        step: step as any,
        status: 'in_progress',
        evidence: [{
          type: 'test_result',
          data: { passed: true, score: 90 + step },
          timestamp: new Date()
        }],
        metrics: { score: 90 + step },
        executionTime: 1000 + step * 100
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      await this.tracker.updateQualityGate({
        step: step as any,
        status: 'passed'
      });
    }

    // Simulate wave execution
    await this.tracker.updateWave({
      waveId: 'demo-wave-1',
      strategy: 'systematic',
      currentPhase: 1,
      totalPhases: 5,
      complexity: 0.8,
      delegation: 'tasks',
      performance: {
        timeReduction: 45,
        qualityImprovement: 30,
        resourceEfficiency: 60,
        tokenOptimization: 35
      },
      phases: [
        { name: 'Analysis', status: 'completed', agents: ['agent-1'], startTime: new Date(), endTime: new Date() },
        { name: 'Design', status: 'active', agents: ['agent-2'] },
        { name: 'Implementation', status: 'pending', agents: [] },
        { name: 'Testing', status: 'pending', agents: [] },
        { name: 'Deployment', status: 'pending', agents: [] }
      ]
    });

    // Update performance metrics
    await this.tracker.updatePerformance({
      tokenOptimization: {
        original: 50000,
        optimized: 32000,
        reduction: 36,
        technique: 'serena_mcp'
      },
      executionTime: {
        total: 45000,
        phases: {
          specification: 5000,
          pseudocode: 8000,
          architecture: 12000,
          refinement: 15000,
          completion: 5000
        },
        agents: {
          'agent-1': 10000,
          'agent-2': 12000,
          'agent-3': 8000,
          'agent-4': 10000,
          'agent-5': 5000
        },
        toolUsage: {
          'Read': 2000,
          'Write': 3000,
          'Edit': 5000,
          'Bash': 8000
        }
      },
      qualityMetrics: {
        codeQuality: 92,
        testCoverage: 89,
        securityScore: 95,
        performanceScore: 88,
        maintainabilityIndex: 91
      },
      resourceUtilization: {
        cpuUsage: 45,
        memoryUsage: 512,
        networkCalls: 25,
        fileOperations: 150
      }
    });

    // Update memory state
    await this.tracker.updateMemory({
      contextRetention: 95,
      crossSessionData: ['previous-architecture.md', 'performance-baseline.json'],
      memoryFiles: [
        {
          name: 'project-context.md',
          path: '.serena/memories/project-context.md',
          size: 2048,
          lastAccessed: new Date(),
          relevanceScore: 95
        },
        {
          name: 'performance-data.json',
          path: '.serena/memories/performance-data.json',
          size: 1024,
          lastAccessed: new Date(),
          relevanceScore: 88
        }
      ],
      totalMemoryUsage: 3072,
      optimizationLevel: 85
    });

    // Complete simulation
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.tracker.endSession('completed');

    console.log('✅ SuperClaude execution simulation completed!');
    return sessionId;
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // End current session if any
      if (this.tracker.getCurrentSession()) {
        await this.tracker.endSession('cancelled');
      }

      // Stop server
      await this.stop();
      
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}