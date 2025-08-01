/**
 * SuperClaude Visualization Orchestrator
 * Main orchestration service for the visualization system
 */

import { EventEmitter } from 'events';
import winston, { Logger } from 'winston';
import { AgentActivityMonitor } from './monitors/AgentActivityMonitor';
import { SPARCProgressTracker } from './monitors/SPARCProgressTracker';
import { QualityGatesCollector } from './collectors/QualityGatesCollector';
import { WaveSystemVisualizer } from './visualizers/WaveSystemVisualizer';
import { PerformanceMetricsCollector } from './collectors/PerformanceMetricsCollector';
import { MemoryPersistenceViewer } from './monitors/MemoryPersistenceViewer';
import { 
  AgentActivity, 
  SPARCProgress, 
  QualityGate, 
  WaveExecution, 
  PerformanceMetrics, 
  MemoryState, 
  DashboardConfig,
  SystemStatus,
  VisualizationEvent 
} from './types';

export class SuperClaudeVisualizationOrchestrator extends EventEmitter {
  private logger: Logger;
  private agentMonitor: AgentActivityMonitor;
  private sparcTracker: SPARCProgressTracker;
  private qualityGatesCollector: QualityGatesCollector;
  private waveVisualizer: WaveSystemVisualizer;
  private performanceCollector: PerformanceMetricsCollector;
  private memoryViewer: MemoryPersistenceViewer;
  private dashboardConfig: DashboardConfig;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.initializeLogger();
    this.initializeComponents();
    this.setupEventHandlers();
    this.initializeDefaultConfig();
  }

  /**
   * Initialize the orchestrator
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Orchestrator already initialized');
      return;
    }

    this.logger.info('Initializing SuperClaude Visualization Orchestrator...');

    try {
      // Initialize default sessions
      await this.initializeDefaultSessions();
      
      this.isInitialized = true;
      this.logger.info('SuperClaude Visualization Orchestrator initialized successfully');
      
      this.emit('orchestrator_ready');
    } catch (error) {
      this.logger.error(`Failed to initialize orchestrator: ${error}`);
      throw error;
    }
  }

  /**
   * Shutdown the orchestrator
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down SuperClaude Visualization Orchestrator...');
    
    // Clean up resources
    this.removeAllListeners();
    this.isInitialized = false;
    
    this.logger.info('SuperClaude Visualization Orchestrator shut down successfully');
  }

  // Agent Activity Methods
  public startAgent(agentId: string, agentType: AgentActivity['agentType'], task: string, estimatedDuration?: number): void {
    this.agentMonitor.startAgent(agentId, agentType, task, estimatedDuration);
  }

  public updateAgentProgress(agentId: string, progress: number, tokenUsage?: number, newTask?: string): void {
    this.agentMonitor.updateAgentProgress(agentId, progress, tokenUsage, newTask);
  }

  public completeAgent(agentId: string, finalTokenUsage?: number): void {
    this.agentMonitor.completeAgent(agentId, finalTokenUsage);
  }

  public failAgent(agentId: string, error: string): void {
    this.agentMonitor.failAgent(agentId, error);
  }

  public getActiveAgents(): AgentActivity[] {
    return this.agentMonitor.getActiveAgents();
  }

  public getAgentHistory(limit?: number): AgentActivity[] {
    return this.agentMonitor.getActivityHistory(limit);
  }

  public getAgentStatistics(): Record<string, any> {
    return this.agentMonitor.getAgentStatistics();
  }

  // SPARC Progress Methods
  public initializeSPARCSession(sessionId: string): void {
    this.sparcTracker.initializeSession(sessionId);
  }

  public startSPARCPhase(sessionId: string, phaseName: SPARCProgress['phases'][string]['name']): void {
    this.sparcTracker.startPhase(sessionId, phaseName);
  }

  public updateSPARCPhaseProgress(sessionId: string, phaseName: SPARCProgress['phases'][string]['name'], progress: number, qualityScore?: number, artifacts?: string[]): void {
    this.sparcTracker.updatePhaseProgress(sessionId, phaseName, progress, qualityScore, artifacts);
  }

  public completeSPARCPhase(sessionId: string, phaseName: SPARCProgress['phases'][string]['name'], qualityScore: number, artifacts: string[]): void {
    this.sparcTracker.completePhase(sessionId, phaseName, qualityScore, artifacts);
  }

  public getSPARCProgress(sessionId: string): SPARCProgress | undefined {
    return this.sparcTracker.getSession(sessionId);
  }

  public getAllSPARCProgress(): SPARCProgress[] {
    return this.sparcTracker.getActiveSessions();
  }

  public getSPARCHistory(limit?: number): SPARCProgress[] {
    return this.sparcTracker.getSessionHistory(limit);
  }

  public getSPARCStatistics(): Record<string, any> {
    return this.sparcTracker.getSPARCStatistics();
  }

  // Quality Gates Methods
  public async executeQualityGate(sessionId: string, step: QualityGate['step'], context?: Record<string, any>): Promise<QualityGate> {
    return await this.qualityGatesCollector.executeQualityGate(sessionId, step, context);
  }

  public getQualityGates(sessionId: string): QualityGate[] {
    return this.qualityGatesCollector.getQualityGates(sessionId);
  }

  public getAllQualityGates(): Record<string, QualityGate[]> {
    return this.qualityGatesCollector.getAllQualityGates();
  }

  public getQualityGatesStatistics(): Record<string, any> {
    return this.qualityGatesCollector.getQualityGatesStatistics();
  }

  // Wave System Methods
  public startWave(waveId: string, strategy: WaveExecution['strategy'], complexity: number, delegation: WaveExecution['delegation'], totalPhases?: number): void {
    this.waveVisualizer.startWave(waveId, strategy, complexity, delegation, totalPhases);
  }

  public updateWaveProgress(waveId: string, currentPhase: number, performance?: Partial<WaveExecution['performance']>): void {
    this.waveVisualizer.updateWaveProgress(waveId, currentPhase, performance);
  }

  public completeWave(waveId: string, finalPerformance: WaveExecution['performance']): void {
    this.waveVisualizer.completeWave(waveId, finalPerformance);
  }

  public failWave(waveId: string, error: string): void {
    this.waveVisualizer.failWave(waveId, error);
  }

  public getActiveWaves(): WaveExecution[] {
    return this.waveVisualizer.getActiveWaves();
  }

  public getWaveHistory(limit?: number): WaveExecution[] {
    return this.waveVisualizer.getWaveHistory(limit);
  }

  public getWaveStatistics(): Record<string, any> {
    return this.waveVisualizer.getWaveStatistics();
  }

  public getWavePerformanceTrends(timeWindowHours?: number): Record<string, any> {
    return this.waveVisualizer.getWavePerformanceTrends(timeWindowHours);
  }

  public predictOptimalStrategy(complexity: number, delegationType: WaveExecution['delegation']): { recommendedStrategy: WaveExecution['strategy']; confidence: number; reasoning: string } {
    return this.waveVisualizer.predictOptimalStrategy(complexity, delegationType);
  }

  // Performance Metrics Methods
  public initializePerformanceSession(sessionId: string): void {
    this.performanceCollector.initializeSession(sessionId);
  }

  public recordTokenOptimization(sessionId: string, original: number, optimized: number, technique: any): void {
    this.performanceCollector.recordTokenOptimization(sessionId, original, optimized, technique);
  }

  public updateExecutionTime(sessionId: string, phase: string, duration: number): void {
    this.performanceCollector.updateExecutionTime(sessionId, phase, duration);
  }

  public updateQualityMetrics(sessionId: string, codeQuality?: number, testCoverage?: number, securityScore?: number): void {
    this.performanceCollector.updateQualityMetrics(sessionId, codeQuality, testCoverage, securityScore);
  }

  public getPerformanceMetrics(sessionId: string): PerformanceMetrics | undefined {
    return this.performanceCollector.getSessionMetrics(sessionId);
  }

  public getAllPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceCollector.getActiveSessionMetrics();
  }

  public getPerformanceTrends(timeWindowHours?: number): Record<string, any> {
    return this.performanceCollector.getPerformanceTrends(timeWindowHours);
  }

  public getPerformanceBenchmarks(): Record<string, any> {
    return this.performanceCollector.getPerformanceBenchmarks();
  }

  public getTokenOptimizationStats(): Record<string, any> {
    return this.performanceCollector.getTokenOptimizationStats();
  }

  public getResourceUtilization(): Record<string, any> {
    return this.performanceCollector.getResourceUtilizationSummary();
  }

  // Memory Persistence Methods
  public initializeMemoryState(sessionId: string): void {
    this.memoryViewer.initializeMemoryState(sessionId);
  }

  public updateMemoryFile(sessionId: string, filename: string, size: number, type?: any, relevanceScore?: number): void {
    this.memoryViewer.updateMemoryFile(sessionId, filename, size, type, relevanceScore);
  }

  public performMemoryCleanup(sessionId: string, retentionDays?: number): void {
    this.memoryViewer.performMemoryCleanup(sessionId, retentionDays);
  }

  public getMemoryState(sessionId: string): MemoryState | undefined {
    return this.memoryViewer.getMemoryState(sessionId);
  }

  public getAllMemoryStates(): MemoryState[] {
    return this.memoryViewer.getActiveMemoryStates();
  }

  public getMemoryStatistics(): Record<string, any> {
    return this.memoryViewer.getMemoryUsageStatistics();
  }

  public getMemoryTrends(timeWindowHours?: number): Record<string, any> {
    return this.memoryViewer.getMemoryTrends(timeWindowHours);
  }

  public getMemoryOptimization(): Record<string, any> {
    return this.memoryViewer.analyzeOptimizationOpportunities();
  }

  // System Status Methods
  public getSystemStatus(): SystemStatus {
    return this.agentMonitor.getSystemStatus();
  }

  // Dashboard Configuration Methods
  public getDashboardConfig(): DashboardConfig {
    return { ...this.dashboardConfig };
  }

  public updateDashboardConfig(newConfig: Partial<DashboardConfig>): void {
    this.dashboardConfig = { ...this.dashboardConfig, ...newConfig };
    this.logger.info('Dashboard configuration updated');
    this.emit('config_updated', this.dashboardConfig);
  }

  // Demo Data Methods
  public async generateDemoData(): Promise<void> {
    this.logger.info('Generating demo data...');

    // Start demo agents
    this.startAgent('agent-001', 'sparc-orchestrator', 'Coordinating project architecture', 300000);
    this.startAgent('agent-002', 'sparc-coder', 'Implementing core functionality', 600000);
    this.startAgent('agent-003', 'sparc-security-reviewer', 'Security audit in progress', 180000);

    // Initialize SPARC session
    this.initializeSPARCSession('demo-session-001');
    this.startSPARCPhase('demo-session-001', 'specification');
    this.updateSPARCPhaseProgress('demo-session-001', 'specification', 75, 88, ['requirements.md', 'user-stories.md']);

    // Start demo wave
    this.startWave('wave-001', 'systematic', 0.7, 'tasks', 4);
    this.updateWaveProgress('wave-001', 2, { timeReduction: 0.3, qualityImprovement: 0.25, resourceEfficiency: 0.4 });

    // Initialize performance tracking
    this.initializePerformanceSession('demo-session-001');
    this.recordTokenOptimization('demo-session-001', 15000, 6000, 'serena_mcp');
    this.updateQualityMetrics('demo-session-001', 87, 92, 95);

    // Initialize memory state
    this.initializeMemoryState('demo-session-001');
    this.updateMemoryFile('demo-session-001', 'session-context.json', 2048, 'session', 0.9);
    this.updateMemoryFile('demo-session-001', 'persistent-data.json', 4096, 'persistent', 0.8);

    // Execute some quality gates
    await this.executeQualityGate('demo-session-001', 1);
    await this.executeQualityGate('demo-session-001', 2);

    this.logger.info('Demo data generated successfully');
  }

  private initializeLogger(): void {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'superclaudevisualization' },
      transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  private initializeComponents(): void {
    this.agentMonitor = new AgentActivityMonitor(this.logger);
    this.sparcTracker = new SPARCProgressTracker(this.logger);
    this.qualityGatesCollector = new QualityGatesCollector(this.logger);
    this.waveVisualizer = new WaveSystemVisualizer(this.logger);
    this.performanceCollector = new PerformanceMetricsCollector(this.logger);
    this.memoryViewer = new MemoryPersistenceViewer(this.logger);
  }

  private setupEventHandlers(): void {
    // Forward all component events
    this.agentMonitor.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });

    this.sparcTracker.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });

    this.qualityGatesCollector.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });

    this.waveVisualizer.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });

    this.performanceCollector.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });

    this.memoryViewer.on('visualization_event', (event: VisualizationEvent) => {
      this.emit('visualization_event', event);
    });
  }

  private initializeDefaultConfig(): void {
    this.dashboardConfig = {
      refreshInterval: 5000, // 5 seconds
      maxHistoryEntries: 1000,
      enableRealtime: true,
      alertThresholds: {
        tokenUsageWarning: 50000,
        memoryUsageWarning: 100 * 1024 * 1024, // 100MB
        executionTimeWarning: 300000 // 5 minutes
      }
    };
  }

  private async initializeDefaultSessions(): Promise<void> {
    // Create default session if in demo mode
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      await this.generateDemoData();
    }
  }
}