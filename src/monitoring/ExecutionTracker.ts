/**
 * SuperClaude Execution Tracker
 * Real-time monitoring and tracking of AI orchestration operations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ExecutionSession,
  AgentActivity,
  SparcPhase,
  QualityGate,
  WaveExecution,
  PerformanceMetrics,
  MemoryState,
  MonitoringConfig,
  WSEvents
} from '../types/monitoring';

export class ExecutionTracker extends EventEmitter {
  private currentSession: ExecutionSession | null = null;
  private sessions: ExecutionSession[] = [];
  private config: MonitoringConfig;
  private logDir: string;
  private startTime: Date = new Date();

  constructor(config: MonitoringConfig, logDir: string = '.superclaud-logs') {
    super();
    this.config = config;
    this.logDir = logDir;
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Start a new execution session
   */
  public async startSession(trigger: ExecutionSession['trigger']): Promise<string> {
    const sessionId = uuidv4();
    const session: ExecutionSession = {
      sessionId,
      startTime: new Date(),
      trigger,
      framework: {
        version: '1.0.0',
        persona: 'auto-detected',
        commands: [],
        flags: []
      },
      agents: [],
      sparc: this.initializeSPARCPhases(),
      qualityGates: this.initializeQualityGates(),
      waves: [],
      performance: this.initializePerformanceMetrics(sessionId),
      memory: this.initializeMemoryState(sessionId),
      artifacts: [],
      status: 'initializing'
    };

    this.currentSession = session;
    this.sessions.push(session);
    
    // Emit session start event
    this.emit('session-start', session);
    
    // Log session start
    await this.logEvent('session-start', { sessionId, trigger });
    
    // Update session status to running
    setTimeout(() => {
      if (this.currentSession?.sessionId === sessionId) {
        this.updateSessionStatus('running');
      }
    }, 1000);

    return sessionId;
  }

  /**
   * Update agent activity
   */
  public async updateAgent(agentUpdate: Partial<AgentActivity> & { agentId: string }): Promise<void> {
    if (!this.currentSession) return;

    const existingAgentIndex = this.currentSession.agents.findIndex(
      agent => agent.agentId === agentUpdate.agentId
    );

    if (existingAgentIndex >= 0) {
      // Update existing agent
      this.currentSession.agents[existingAgentIndex] = {
        ...this.currentSession.agents[existingAgentIndex],
        ...agentUpdate
      };
    } else {
      // Add new agent
      const newAgent: AgentActivity = {
        agentType: agentUpdate.agentType || 'general-purpose',
        status: agentUpdate.status || 'active',
        currentTask: agentUpdate.currentTask || 'Initializing...',
        progress: agentUpdate.progress || 0,
        startTime: agentUpdate.startTime || new Date(),
        tokenUsage: agentUpdate.tokenUsage || {
          input: 0,
          output: 0,
          total: 0,
          optimized: 0,
          reductionPercentage: 0
        },
        evidence: agentUpdate.evidence || [],
        ...agentUpdate
      };
      this.currentSession.agents.push(newAgent);
    }

    // Emit agent update event
    this.emit('agent-update', this.currentSession.agents[existingAgentIndex >= 0 ? existingAgentIndex : this.currentSession.agents.length - 1]);
    
    // Update session
    this.emit('session-update', { agents: this.currentSession.agents });
    
    await this.logEvent('agent-update', agentUpdate);
  }

  /**
   * Update SPARC methodology phase
   */
  public async updateSPARCPhase(phaseUpdate: Partial<SparcPhase> & { phase: SparcPhase['phase'] }): Promise<void> {
    if (!this.currentSession) return;

    const phaseIndex = this.currentSession.sparc.findIndex(p => p.phase === phaseUpdate.phase);
    if (phaseIndex >= 0) {
      this.currentSession.sparc[phaseIndex] = {
        ...this.currentSession.sparc[phaseIndex],
        ...phaseUpdate
      };

      // Emit SPARC update event
      this.emit('sparc-update', this.currentSession.sparc[phaseIndex]);
      
      // Update session
      this.emit('session-update', { sparc: this.currentSession.sparc });
      
      await this.logEvent('sparc-update', phaseUpdate);
    }
  }

  /**
   * Update quality gate status
   */
  public async updateQualityGate(gateUpdate: Partial<QualityGate> & { step: QualityGate['step'] }): Promise<void> {
    if (!this.currentSession) return;

    const gateIndex = this.currentSession.qualityGates.findIndex(g => g.step === gateUpdate.step);
    if (gateIndex >= 0) {
      this.currentSession.qualityGates[gateIndex] = {
        ...this.currentSession.qualityGates[gateIndex],
        ...gateUpdate,
        timestamp: new Date()
      };

      // Emit quality gate event
      this.emit('quality-gate', this.currentSession.qualityGates[gateIndex]);
      
      // Update session
      this.emit('session-update', { qualityGates: this.currentSession.qualityGates });
      
      await this.logEvent('quality-gate', gateUpdate);
    }
  }

  /**
   * Add or update wave execution
   */
  public async updateWave(waveUpdate: Partial<WaveExecution> & { waveId: string }): Promise<void> {
    if (!this.currentSession) return;

    const existingWaveIndex = this.currentSession.waves.findIndex(w => w.waveId === waveUpdate.waveId);

    if (existingWaveIndex >= 0) {
      // Update existing wave
      this.currentSession.waves[existingWaveIndex] = {
        ...this.currentSession.waves[existingWaveIndex],
        ...waveUpdate
      };
    } else {
      // Add new wave
      const newWave: WaveExecution = {
        strategy: waveUpdate.strategy || 'systematic',
        currentPhase: waveUpdate.currentPhase || 1,
        totalPhases: waveUpdate.totalPhases || 5,
        complexity: waveUpdate.complexity || 0.7,
        delegation: waveUpdate.delegation || 'auto',
        startTime: waveUpdate.startTime || new Date(),
        performance: waveUpdate.performance || {
          timeReduction: 0,
          qualityImprovement: 0,
          resourceEfficiency: 0,
          tokenOptimization: 0
        },
        phases: waveUpdate.phases || [],
        ...waveUpdate
      };
      this.currentSession.waves.push(newWave);
    }

    // Emit wave update event
    const updatedWave = this.currentSession.waves[existingWaveIndex >= 0 ? existingWaveIndex : this.currentSession.waves.length - 1];
    this.emit('wave-update', updatedWave);
    
    // Update session
    this.emit('session-update', { waves: this.currentSession.waves });
    
    await this.logEvent('wave-update', waveUpdate);
  }

  /**
   * Update performance metrics
   */
  public async updatePerformance(performanceUpdate: Partial<PerformanceMetrics>): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.performance = {
      ...this.currentSession.performance,
      ...performanceUpdate,
      timestamp: new Date()
    };

    // Emit performance update event
    this.emit('performance-update', this.currentSession.performance);
    
    // Update session
    this.emit('session-update', { performance: this.currentSession.performance });
    
    await this.logEvent('performance-update', performanceUpdate);
  }

  /**
   * Update memory state
   */
  public async updateMemory(memoryUpdate: Partial<MemoryState>): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.memory = {
      ...this.currentSession.memory,
      ...memoryUpdate
    };

    // Emit memory update event
    this.emit('memory-update', this.currentSession.memory);
    
    // Update session
    this.emit('session-update', { memory: this.currentSession.memory });
    
    await this.logEvent('memory-update', memoryUpdate);
  }

  /**
   * End current session
   */
  public async endSession(status: 'completed' | 'error' | 'cancelled' = 'completed'): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    this.currentSession.status = status;

    // Calculate final performance metrics
    const executionTime = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    this.currentSession.performance.executionTime.total = executionTime;

    // Emit session end event
    this.emit('session-end', this.currentSession);
    
    // Save session to file
    await this.saveSessionToFile(this.currentSession);
    
    await this.logEvent('session-end', { 
      sessionId: this.currentSession.sessionId, 
      status, 
      duration: executionTime 
    });

    this.currentSession = null;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): ExecutionSession | null {
    return this.currentSession;
  }

  /**
   * Get session history
   */
  public getSessionHistory(): ExecutionSession[] {
    return this.sessions;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): ExecutionSession | undefined {
    return this.sessions.find(s => s.sessionId === sessionId);
  }

  private updateSessionStatus(status: ExecutionSession['status']): void {
    if (this.currentSession) {
      this.currentSession.status = status;
      this.emit('session-update', { status });
    }
  }

  private initializeSPARCPhases(): SparcPhase[] {
    const phases: SparcPhase['phase'][] = ['specification', 'pseudocode', 'architecture', 'refinement', 'completion'];
    return phases.map(phase => ({
      phase,
      status: 'pending',
      progress: 0,
      artifacts: [],
      qualityScore: 0,
      assignedAgents: [],
      evidence: {
        documents: [],
        codeFiles: [],
        testResults: [],
        qualityMetrics: {}
      }
    }));
  }

  private initializeQualityGates(): QualityGate[] {
    const gates = [
      { step: 1, name: 'Syntax Validation', description: 'Code syntax and structure validation' },
      { step: 2, name: 'Type Checking', description: 'TypeScript type validation' },
      { step: 3, name: 'Linting', description: 'Code quality and style validation' },
      { step: 4, name: 'Security Audit', description: 'Security vulnerability assessment' },
      { step: 5, name: 'Testing', description: 'Unit and integration test validation' },
      { step: 6, name: 'Performance', description: 'Performance benchmark validation' },
      { step: 7, name: 'Documentation', description: 'Documentation completeness validation' },
      { step: 8, name: 'Integration', description: 'System integration validation' }
    ] as const;

    return gates.map(gate => ({
      step: gate.step,
      name: gate.name,
      description: gate.description,
      status: 'skipped' as const,
      evidence: [],
      metrics: {},
      threshold: {},
      timestamp: new Date(),
      executionTime: 0
    }));
  }

  private initializePerformanceMetrics(sessionId: string): PerformanceMetrics {
    return {
      sessionId,
      timestamp: new Date(),
      tokenOptimization: {
        original: 0,
        optimized: 0,
        reduction: 0,
        technique: 'serena_mcp'
      },
      executionTime: {
        total: 0,
        phases: {},
        agents: {},
        toolUsage: {}
      },
      qualityMetrics: {
        codeQuality: 0,
        testCoverage: 0,
        securityScore: 0,
        performanceScore: 0,
        maintainabilityIndex: 0
      },
      resourceUtilization: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkCalls: 0,
        fileOperations: 0
      }
    };
  }

  private initializeMemoryState(sessionId: string): MemoryState {
    return {
      sessionId,
      contextRetention: 100,
      crossSessionData: [],
      memoryFiles: [],
      totalMemoryUsage: 0,
      optimizationLevel: 0
    };
  }

  private async logEvent(eventType: string, data: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession?.sessionId || 'no-session',
      eventType,
      data
    };

    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write log entry:', error);
    }
  }

  private async saveSessionToFile(session: ExecutionSession): Promise<void> {
    const sessionFile = path.join(this.logDir, `session-${session.sessionId}.json`);
    
    try {
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Load session from file
   */
  public async loadSession(sessionId: string): Promise<ExecutionSession | null> {
    const sessionFile = path.join(this.logDir, `session-${sessionId}.json`);
    
    try {
      const data = await fs.readFile(sessionFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Get summary statistics
   */
  public getStatistics() {
    const completedSessions = this.sessions.filter(s => s.status === 'completed');
    
    return {
      totalSessions: this.sessions.length,
      completedSessions: completedSessions.length,
      averageExecutionTime: completedSessions.reduce((acc, s) => {
        if (s.endTime) {
          return acc + (s.endTime.getTime() - s.startTime.getTime());
        }
        return acc;
      }, 0) / completedSessions.length || 0,
      averageTokenReduction: completedSessions.reduce((acc, s) => 
        acc + s.performance.tokenOptimization.reduction, 0) / completedSessions.length || 0,
      averageQualityScore: completedSessions.reduce((acc, s) => {
        const scores = Object.values(s.performance.qualityMetrics);
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;
        return acc + avgScore;
      }, 0) / completedSessions.length || 0
    };
  }
}