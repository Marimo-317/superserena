/**
 * Visualization API
 * REST endpoints for accessing visualization data
 */

import { Router, Request, Response } from 'express';
import { SuperClaudeVisualizationOrchestrator } from '../VisualizationOrchestrator';
import { Logger } from 'winston';

export class VisualizationAPI {
  private router: Router;
  private orchestrator: SuperClaudeVisualizationOrchestrator;
  private logger: Logger;

  constructor(orchestrator: SuperClaudeVisualizationOrchestrator, logger: Logger) {
    this.router = Router();
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.setupRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  private setupRoutes(): void {
    // System Status
    this.router.get('/status', this.getSystemStatus.bind(this));
    
    // Agent Activity
    this.router.get('/agents', this.getActiveAgents.bind(this));
    this.router.get('/agents/history', this.getAgentHistory.bind(this));
    this.router.get('/agents/statistics', this.getAgentStatistics.bind(this));
    
    // SPARC Progress
    this.router.get('/sparc', this.getSPARCProgress.bind(this));
    this.router.get('/sparc/history', this.getSPARCHistory.bind(this));
    this.router.get('/sparc/statistics', this.getSPARCStatistics.bind(this));
    
    // Quality Gates
    this.router.get('/quality-gates', this.getQualityGates.bind(this));
    this.router.get('/quality-gates/statistics', this.getQualityGatesStatistics.bind(this));
    this.router.post('/quality-gates/execute', this.executeQualityGate.bind(this));
    
    // Wave System
    this.router.get('/waves', this.getActiveWaves.bind(this));
    this.router.get('/waves/history', this.getWaveHistory.bind(this));
    this.router.get('/waves/statistics', this.getWaveStatistics.bind(this));
    this.router.get('/waves/trends', this.getWavePerformanceTrends.bind(this));
    this.router.post('/waves/predict', this.predictOptimalStrategy.bind(this));
    
    // Performance Metrics
    this.router.get('/performance', this.getPerformanceMetrics.bind(this));
    this.router.get('/performance/trends', this.getPerformanceTrends.bind(this));
    this.router.get('/performance/benchmarks', this.getPerformanceBenchmarks.bind(this));
    this.router.get('/performance/token-optimization', this.getTokenOptimizationStats.bind(this));
    this.router.get('/performance/resources', this.getResourceUtilization.bind(this));
    
    // Memory Persistence
    this.router.get('/memory', this.getMemoryStates.bind(this));
    this.router.get('/memory/statistics', this.getMemoryStatistics.bind(this));
    this.router.get('/memory/trends', this.getMemoryTrends.bind(this));
    this.router.get('/memory/optimization', this.getMemoryOptimization.bind(this));
    this.router.post('/memory/cleanup', this.performMemoryCleanup.bind(this));
    
    // Dashboard Configuration
    this.router.get('/config', this.getDashboardConfig.bind(this));
    this.router.put('/config', this.updateDashboardConfig.bind(this));
    
    // Real-time Events (for WebSocket info)
    this.router.get('/events/info', this.getEventInfo.bind(this));
  }

  // System Status Endpoints
  private async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.orchestrator.getSystemStatus();
      res.json(status);
    } catch (error) {
      this.handleError(res, error, 'Failed to get system status');
    }
  }

  // Agent Activity Endpoints
  private async getActiveAgents(req: Request, res: Response): Promise<void> {
    try {
      const agents = this.orchestrator.getActiveAgents();
      res.json(agents);
    } catch (error) {
      this.handleError(res, error, 'Failed to get active agents');
    }
  }

  private async getAgentHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = this.orchestrator.getAgentHistory(limit);
      res.json(history);
    } catch (error) {
      this.handleError(res, error, 'Failed to get agent history');
    }
  }

  private async getAgentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.orchestrator.getAgentStatistics();
      res.json(statistics);
    } catch (error) {
      this.handleError(res, error, 'Failed to get agent statistics');
    }
  }

  // SPARC Progress Endpoints
  private async getSPARCProgress(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        const progress = this.orchestrator.getSPARCProgress(sessionId);
        res.json(progress);
      } else {
        const allProgress = this.orchestrator.getAllSPARCProgress();
        res.json(allProgress);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to get SPARC progress');
    }
  }

  private async getSPARCHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = this.orchestrator.getSPARCHistory(limit);
      res.json(history);
    } catch (error) {
      this.handleError(res, error, 'Failed to get SPARC history');
    }
  }

  private async getSPARCStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.orchestrator.getSPARCStatistics();
      res.json(statistics);
    } catch (error) {
      this.handleError(res, error, 'Failed to get SPARC statistics');
    }
  }

  // Quality Gates Endpoints
  private async getQualityGates(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        const gates = this.orchestrator.getQualityGates(sessionId);
        res.json(gates);
      } else {
        const allGates = this.orchestrator.getAllQualityGates();
        res.json(allGates);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to get quality gates');
    }
  }

  private async getQualityGatesStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.orchestrator.getQualityGatesStatistics();
      res.json(statistics);
    } catch (error) {
      this.handleError(res, error, 'Failed to get quality gates statistics');
    }
  }

  private async executeQualityGate(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, step, context } = req.body;
      
      if (!sessionId || !step) {
        res.status(400).json({ error: 'sessionId and step are required' });
        return;
      }

      const result = await this.orchestrator.executeQualityGate(sessionId, step, context || {});
      res.json(result);
    } catch (error) {
      this.handleError(res, error, 'Failed to execute quality gate');
    }
  }

  // Wave System Endpoints
  private async getActiveWaves(req: Request, res: Response): Promise<void> {
    try {
      const waves = this.orchestrator.getActiveWaves();
      res.json(waves);
    } catch (error) {
      this.handleError(res, error, 'Failed to get active waves');
    }
  }

  private async getWaveHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = this.orchestrator.getWaveHistory(limit);
      res.json(history);
    } catch (error) {
      this.handleError(res, error, 'Failed to get wave history');
    }
  }

  private async getWaveStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.orchestrator.getWaveStatistics();
      res.json(statistics);
    } catch (error) {
      this.handleError(res, error, 'Failed to get wave statistics');
    }
  }

  private async getWavePerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : 24;
      const trends = this.orchestrator.getWavePerformanceTrends(timeWindow);
      res.json(trends);
    } catch (error) {
      this.handleError(res, error, 'Failed to get wave performance trends');
    }
  }

  private async predictOptimalStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { complexity, delegationType } = req.body;
      
      if (complexity === undefined || !delegationType) {
        res.status(400).json({ error: 'complexity and delegationType are required' });
        return;
      }

      const prediction = this.orchestrator.predictOptimalStrategy(complexity, delegationType);
      res.json(prediction);
    } catch (error) {
      this.handleError(res, error, 'Failed to predict optimal strategy');
    }
  }

  // Performance Metrics Endpoints
  private async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        const metrics = this.orchestrator.getPerformanceMetrics(sessionId);
        res.json(metrics);
      } else {
        const allMetrics = this.orchestrator.getAllPerformanceMetrics();
        res.json(allMetrics);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to get performance metrics');
    }
  }

  private async getPerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : 24;
      const trends = this.orchestrator.getPerformanceTrends(timeWindow);
      res.json(trends);
    } catch (error) {
      this.handleError(res, error, 'Failed to get performance trends');
    }
  }

  private async getPerformanceBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const benchmarks = this.orchestrator.getPerformanceBenchmarks();
      res.json(benchmarks);
    } catch (error) {
      this.handleError(res, error, 'Failed to get performance benchmarks');
    }
  }

  private async getTokenOptimizationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.orchestrator.getTokenOptimizationStats();
      res.json(stats);
    } catch (error) {
      this.handleError(res, error, 'Failed to get token optimization stats');
    }
  }

  private async getResourceUtilization(req: Request, res: Response): Promise<void> {
    try {
      const utilization = this.orchestrator.getResourceUtilization();
      res.json(utilization);
    } catch (error) {
      this.handleError(res, error, 'Failed to get resource utilization');
    }
  }

  // Memory Persistence Endpoints
  private async getMemoryStates(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId as string;
      if (sessionId) {
        const state = this.orchestrator.getMemoryState(sessionId);
        res.json(state);
      } else {
        const allStates = this.orchestrator.getAllMemoryStates();
        res.json(allStates);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to get memory states');
    }
  }

  private async getMemoryStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.orchestrator.getMemoryStatistics();
      res.json(statistics);
    } catch (error) {
      this.handleError(res, error, 'Failed to get memory statistics');
    }
  }

  private async getMemoryTrends(req: Request, res: Response): Promise<void> {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : 24;
      const trends = this.orchestrator.getMemoryTrends(timeWindow);
      res.json(trends);
    } catch (error) {
      this.handleError(res, error, 'Failed to get memory trends');
    }
  }

  private async getMemoryOptimization(req: Request, res: Response): Promise<void> {
    try {
      const optimization = this.orchestrator.getMemoryOptimization();
      res.json(optimization);
    } catch (error) {
      this.handleError(res, error, 'Failed to get memory optimization');
    }
  }

  private async performMemoryCleanup(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, retentionDays } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      this.orchestrator.performMemoryCleanup(sessionId, retentionDays || 7);
      res.json({ success: true, message: 'Memory cleanup initiated' });
    } catch (error) {
      this.handleError(res, error, 'Failed to perform memory cleanup');
    }
  }

  // Dashboard Configuration Endpoints
  private async getDashboardConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = this.orchestrator.getDashboardConfig();
      res.json(config);
    } catch (error) {
      this.handleError(res, error, 'Failed to get dashboard config');
    }
  }

  private async updateDashboardConfig(req: Request, res: Response): Promise<void> {
    try {
      const newConfig = req.body;
      this.orchestrator.updateDashboardConfig(newConfig);
      res.json({ success: true, message: 'Dashboard config updated' });
    } catch (error) {
      this.handleError(res, error, 'Failed to update dashboard config');
    }
  }

  // Event Info Endpoint
  private async getEventInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = {
        websocketPort: process.env.WEBSOCKET_PORT || 3001,
        availableEvents: [
          'agent_start',
          'agent_complete',
          'sparc_phase_change',
          'quality_gate',
          'wave_start',
          'wave_complete',
          'token_optimization',
          'memory_update',
          'system_alert'
        ],
        connectionInstructions: 'Connect to WebSocket at ws://localhost:3001 to receive real-time updates'
      };
      res.json(info);
    } catch (error) {
      this.handleError(res, error, 'Failed to get event info');
    }
  }

  private handleError(res: Response, error: any, message: string): void {
    this.logger.error(`${message}: ${error.message}`);
    res.status(500).json({
      error: message,
      details: error.message
    });
  }
}