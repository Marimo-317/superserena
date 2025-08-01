/**
 * SuperClaude Monitoring REST API
 * HTTP endpoints for dashboard data access
 */

import express, { Request, Response, Router } from 'express';
import { ExecutionTracker } from './ExecutionTracker';
import { SuperClaudeWebSocketServer } from './WebSocketServer';
import { MonitoringConfig } from '../types/monitoring';

export class MonitoringAPI {
  private router: Router;
  private tracker: ExecutionTracker;
  private wsServer: SuperClaudeWebSocketServer;
  private config: MonitoringConfig;

  constructor(tracker: ExecutionTracker, wsServer: SuperClaudeWebSocketServer, config: MonitoringConfig) {
    this.router = express.Router();
    this.tracker = tracker;
    this.wsServer = wsServer;
    this.config = config;
    
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Session management
    this.router.get('/sessions', this.getSessions.bind(this));
    this.router.get('/sessions/:id', this.getSession.bind(this));
    this.router.post('/sessions', this.createSession.bind(this));
    this.router.put('/sessions/:id', this.updateSession.bind(this));
    this.router.delete('/sessions/:id', this.deleteSession.bind(this));

    // Current session
    this.router.get('/current-session', this.getCurrentSession.bind(this));
    this.router.put('/current-session/end', this.endCurrentSession.bind(this));

    // Agent management
    this.router.post('/agents', this.updateAgent.bind(this));
    this.router.get('/agents/active', this.getActiveAgents.bind(this));

    // SPARC methodology
    this.router.post('/sparc', this.updateSPARCPhase.bind(this));
    this.router.get('/sparc/current', this.getCurrentSPARCStatus.bind(this));

    // Quality gates
    this.router.post('/quality-gates', this.updateQualityGate.bind(this));
    this.router.get('/quality-gates/current', this.getCurrentQualityGates.bind(this));

    // Wave system
    this.router.post('/waves', this.updateWave.bind(this));
    this.router.get('/waves/active', this.getActiveWaves.bind(this));

    // Performance metrics
    this.router.post('/performance', this.updatePerformance.bind(this));
    this.router.get('/performance/current', this.getCurrentPerformance.bind(this));
    this.router.get('/performance/history', this.getPerformanceHistory.bind(this));

    // Memory state
    this.router.post('/memory', this.updateMemory.bind(this));
    this.router.get('/memory/current', this.getCurrentMemory.bind(this));

    // Statistics and analytics
    this.router.get('/statistics', this.getStatistics.bind(this));
    this.router.get('/analytics/summary', this.getAnalyticsSummary.bind(this));
    this.router.get('/analytics/trends', this.getTrends.bind(this));

    // Configuration
    this.router.get('/config', this.getConfig.bind(this));
    this.router.put('/config', this.updateConfig.bind(this));

    // Server status
    this.router.get('/status', this.getServerStatus.bind(this));
    this.router.get('/health', this.getHealthCheck.bind(this));

    // Logs and debugging
    this.router.get('/logs/:date', this.getLogs.bind(this));
    this.router.get('/debug/websocket', this.getWebSocketInfo.bind(this));
  }

  // Session endpoints
  private async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      let sessions = this.tracker.getSessionHistory();

      if (status) {
        sessions = sessions.filter(s => s.status === status);
      }

      const paginatedSessions = sessions
        .slice(Number(offset), Number(offset) + Number(limit))
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      res.json({
        sessions: paginatedSessions,
        total: sessions.length,
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  }

  private async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const session = this.tracker.getSession(id) || await this.tracker.loadSession(id);
      
      if (session) {
        res.json({ session });
      } else {
        res.status(404).json({ error: 'Session not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve session' });
    }
  }

  private async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { trigger } = req.body;
      const sessionId = await this.tracker.startSession(trigger);
      res.status(201).json({ sessionId });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  private async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Implementation would depend on specific update requirements
      res.json({ success: true, sessionId: id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update session' });
    }
  }

  private async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Implementation for session deletion
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete session' });
    }
  }

  // Current session endpoints
  private async getCurrentSession(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      res.json({ session: currentSession });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve current session' });
    }
  }

  private async endCurrentSession(req: Request, res: Response): Promise<void> {
    try {
      const { status = 'completed' } = req.body;
      await this.tracker.endSession(status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to end current session' });
    }
  }

  // Agent endpoints
  private async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const agentUpdate = req.body;
      await this.tracker.updateAgent(agentUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update agent' });
    }
  }

  private async getActiveAgents(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const activeAgents = currentSession?.agents.filter(a => a.status === 'active') || [];
      res.json({ agents: activeAgents });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve active agents' });
    }
  }

  // SPARC endpoints
  private async updateSPARCPhase(req: Request, res: Response): Promise<void> {
    try {
      const phaseUpdate = req.body;
      await this.tracker.updateSPARCPhase(phaseUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update SPARC phase' });
    }
  }

  private async getCurrentSPARCStatus(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const sparcPhases = currentSession?.sparc || [];
      res.json({ phases: sparcPhases });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve SPARC status' });
    }
  }

  // Quality gates endpoints
  private async updateQualityGate(req: Request, res: Response): Promise<void> {
    try {
      const gateUpdate = req.body;
      await this.tracker.updateQualityGate(gateUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update quality gate' });
    }
  }

  private async getCurrentQualityGates(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const qualityGates = currentSession?.qualityGates || [];
      res.json({ gates: qualityGates });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve quality gates' });
    }
  }

  // Wave system endpoints
  private async updateWave(req: Request, res: Response): Promise<void> {
    try {
      const waveUpdate = req.body;
      await this.tracker.updateWave(waveUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update wave' });
    }
  }

  private async getActiveWaves(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const activeWaves = currentSession?.waves || [];
      res.json({ waves: activeWaves });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve active waves' });
    }
  }

  // Performance endpoints
  private async updatePerformance(req: Request, res: Response): Promise<void> {
    try {
      const performanceUpdate = req.body;
      await this.tracker.updatePerformance(performanceUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update performance metrics' });
    }
  }

  private async getCurrentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const performance = currentSession?.performance;
      res.json({ performance });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve performance metrics' });
    }
  }

  private async getPerformanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const sessions = this.tracker.getSessionHistory();
      const performanceHistory = sessions
        .filter(s => s.status === 'completed')
        .map(s => ({
          sessionId: s.sessionId,
          timestamp: s.startTime,
          performance: s.performance
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 100);

      res.json({ history: performanceHistory });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve performance history' });
    }
  }

  // Memory endpoints
  private async updateMemory(req: Request, res: Response): Promise<void> {
    try {
      const memoryUpdate = req.body;
      await this.tracker.updateMemory(memoryUpdate);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update memory state' });
    }
  }

  private async getCurrentMemory(req: Request, res: Response): Promise<void> {
    try {
      const currentSession = this.tracker.getCurrentSession();
      const memory = currentSession?.memory;
      res.json({ memory });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve memory state' });
    }
  }

  // Statistics endpoints
  private async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.tracker.getStatistics();
      res.json({ statistics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  }

  private async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const sessions = this.tracker.getSessionHistory();
      const completedSessions = sessions.filter(s => s.status === 'completed');
      
      const summary = {
        overview: {
          totalSessions: sessions.length,
          completedSessions: completedSessions.length,
          successRate: completedSessions.length / sessions.length * 100,
          averageExecutionTime: this.calculateAverageExecutionTime(completedSessions),
        },
        performance: {
          averageTokenReduction: this.calculateAverageTokenReduction(completedSessions),
          averageQualityScore: this.calculateAverageQualityScore(completedSessions),
          averageResourceEfficiency: this.calculateAverageResourceEfficiency(completedSessions),
        },
        agents: this.getAgentStatistics(completedSessions),
        sparc: this.getSPARCStatistics(completedSessions),
        waves: this.getWaveStatistics(completedSessions)
      };

      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve analytics summary' });
    }
  }

  private async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const { period = '7d' } = req.query;
      const sessions = this.tracker.getSessionHistory();
      
      // Implementation for trend analysis
      const trends = {
        executionTime: [],
        tokenReduction: [],
        qualityScore: [],
        successRate: []
      };

      res.json({ trends });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve trends' });
    }
  }

  // Configuration endpoints
  private async getConfig(req: Request, res: Response): Promise<void> {
    try {
      res.json({ config: this.config });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve configuration' });
    }
  }

  private async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const newConfig = req.body;
      this.config = { ...this.config, ...newConfig };
      res.json({ success: true, config: this.config });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }

  // Status endpoints
  private async getServerStatus(req: Request, res: Response): Promise<void> {
    try {
      const wsInfo = this.wsServer.getServerInfo();
      const status = {
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        webSocket: wsInfo,
        tracker: {
          currentSession: !!this.tracker.getCurrentSession(),
          totalSessions: this.tracker.getSessionHistory().length
        }
      };

      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve server status' });
    }
  }

  private async getHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({ status: 'healthy', timestamp: new Date() });
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  }

  // Utility endpoints
  private async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      // Implementation for log retrieval
      res.json({ logs: [] });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }

  private async getWebSocketInfo(req: Request, res: Response): Promise<void> {
    try {
      const wsInfo = this.wsServer.getServerInfo();
      res.json({ websocket: wsInfo });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve WebSocket info' });
    }
  }

  // Helper methods
  private calculateAverageExecutionTime(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((acc, s) => {
      if (s.endTime) {
        return acc + (s.endTime.getTime() - s.startTime.getTime());
      }
      return acc;
    }, 0) / sessions.length;
  }

  private calculateAverageTokenReduction(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((acc, s) => acc + s.performance.tokenOptimization.reduction, 0) / sessions.length;
  }

  private calculateAverageQualityScore(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((acc, s) => {
      const scores = Object.values(s.performance.qualityMetrics) as number[];
      const avgScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length || 0;
      return acc + avgScore;
    }, 0) / sessions.length;
  }

  private calculateAverageResourceEfficiency(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    return sessions.reduce((acc, s) => {
      const waves = s.waves || [];
      const avgEfficiency = waves.reduce((waveAcc: number, wave: any) => 
        waveAcc + wave.performance.resourceEfficiency, 0) / waves.length || 0;
      return acc + avgEfficiency;
    }, 0) / sessions.length;
  }

  private getAgentStatistics(sessions: any[]) {
    const agentStats: Record<string, any> = {};
    
    sessions.forEach(session => {
      session.agents.forEach((agent: any) => {
        if (!agentStats[agent.agentType]) {
          agentStats[agent.agentType] = {
            totalExecutions: 0,
            totalTokens: 0,
            averageProgress: 0,
            successRate: 0
          };
        }
        
        agentStats[agent.agentType].totalExecutions++;
        agentStats[agent.agentType].totalTokens += agent.tokenUsage.total;
        agentStats[agent.agentType].averageProgress += agent.progress;
        if (agent.status === 'completed') {
          agentStats[agent.agentType].successRate++;
        }
      });
    });

    // Calculate averages
    Object.keys(agentStats).forEach(agentType => {
      const stat = agentStats[agentType];
      stat.averageProgress /= stat.totalExecutions;
      stat.successRate = (stat.successRate / stat.totalExecutions) * 100;
    });

    return agentStats;
  }

  private getSPARCStatistics(sessions: any[]) {
    const sparcStats = {
      averagePhaseCompletion: {} as Record<string, number>,
      averageQualityScore: {} as Record<string, number>,
      phaseSuccessRate: {} as Record<string, number>
    };

    const phases = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
    
    phases.forEach(phase => {
      sparcStats.averagePhaseCompletion[phase] = 0;
      sparcStats.averageQualityScore[phase] = 0;
      sparcStats.phaseSuccessRate[phase] = 0;
    });

    sessions.forEach(session => {
      session.sparc.forEach((phase: any) => {
        sparcStats.averagePhaseCompletion[phase.phase] += phase.progress;
        sparcStats.averageQualityScore[phase.phase] += phase.qualityScore;
        if (phase.status === 'completed') {
          sparcStats.phaseSuccessRate[phase.phase]++;
        }
      });
    });

    // Calculate averages
    phases.forEach(phase => {
      sparcStats.averagePhaseCompletion[phase] /= sessions.length;
      sparcStats.averageQualityScore[phase] /= sessions.length;
      sparcStats.phaseSuccessRate[phase] = (sparcStats.phaseSuccessRate[phase] / sessions.length) * 100;
    });

    return sparcStats;
  }

  private getWaveStatistics(sessions: any[]) {
    const waveStats = {
      totalWaves: 0,
      averageComplexity: 0,
      averageTimeReduction: 0,
      averageQualityImprovement: 0,
      strategyDistribution: {} as Record<string, number>
    };

    sessions.forEach(session => {
      session.waves.forEach((wave: any) => {
        waveStats.totalWaves++;
        waveStats.averageComplexity += wave.complexity;
        waveStats.averageTimeReduction += wave.performance.timeReduction;
        waveStats.averageQualityImprovement += wave.performance.qualityImprovement;
        
        if (!waveStats.strategyDistribution[wave.strategy]) {
          waveStats.strategyDistribution[wave.strategy] = 0;
        }
        waveStats.strategyDistribution[wave.strategy]++;
      });
    });

    if (waveStats.totalWaves > 0) {
      waveStats.averageComplexity /= waveStats.totalWaves;
      waveStats.averageTimeReduction /= waveStats.totalWaves;
      waveStats.averageQualityImprovement /= waveStats.totalWaves;
    }

    return waveStats;
  }

  public getRouter(): Router {
    return this.router;
  }
}