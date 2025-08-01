/**
 * SuperClaude Operation Visualization Types
 * Core interfaces for monitoring AI orchestration
 */

export interface AgentActivity {
  agentType: 'sparc-orchestrator' | 'sparc-architect' | 'sparc-security-reviewer' | 
            'sparc-performance' | 'sparc-devops' | 'sparc-coder' | 'sparc-tdd' | 'general-purpose';
  status: 'idle' | 'active' | 'completed' | 'error';
  currentTask: string;
  progress: number;
  startTime: Date;
  estimatedCompletion: Date;
  tokenUsage: number;
  agentId: string;
}

export interface SPARCPhase {
  name: 'specification' | 'pseudocode' | 'architecture' | 'refinement' | 'completion';
  status: 'completed' | 'in_progress' | 'pending' | 'error';
  artifacts: string[];
  progress: number;
  qualityScore: number;
  startTime?: Date;
  endTime?: Date;
}

export interface SPARCProgress {
  sessionId: string;
  phases: Record<string, SPARCPhase>;
  overallProgress: number;
  currentPhase: string;
  estimatedCompletion: Date;
}

export interface QualityGate {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  name: string;
  status: 'passed' | 'failed' | 'in_progress' | 'skipped';
  evidence: string[];
  metrics: Record<string, number>;
  timestamp: Date;
  executionTime: number;
}

export interface WaveExecution {
  waveId: string;
  strategy: 'progressive' | 'systematic' | 'adaptive' | 'enterprise';
  currentPhase: number;
  totalPhases: number;
  complexity: number;
  delegation: 'files' | 'folders' | 'tasks';
  performance: {
    timeReduction: number;
    qualityImprovement: number;
    resourceEfficiency: number;
  };
  startTime: Date;
  status: 'active' | 'completed' | 'error' | 'paused';
}

export interface TokenOptimization {
  original: number;
  optimized: number;
  reduction: number; // percentage
  technique: 'serena_mcp' | 'wave_system' | 'compression' | 'context_pruning';
  timestamp: Date;
}

export interface PerformanceMetrics {
  sessionId: string;
  tokenOptimization: TokenOptimization;
  executionTime: {
    total: number;
    phases: Record<string, number>;
  };
  qualityMetrics: {
    codeQuality: number;
    testCoverage: number;
    securityScore: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface MemoryFile {
  name: string;
  size: number;
  lastAccessed: Date;
  relevanceScore: number;
  type: 'session' | 'persistent' | 'cache';
}

export interface MemoryState {
  sessionId: string;
  contextRetention: number; // percentage
  crossSessionData: string[];
  memoryFiles: MemoryFile[];
  totalSize: number;
  lastCleanup: Date;
}

export interface SystemStatus {
  timestamp: Date;
  uptime: number;
  activeAgents: number;
  totalSessions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  alerts: SystemAlert[];
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface VisualizationEvent {
  type: 'agent_start' | 'agent_complete' | 'sparc_phase_change' | 'quality_gate' | 
        'wave_start' | 'wave_complete' | 'token_optimization' | 'memory_update' | 'system_alert';
  payload: any;
  timestamp: Date;
  sessionId: string;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxHistoryEntries: number;
  enableRealtime: boolean;
  alertThresholds: {
    tokenUsageWarning: number;
    memoryUsageWarning: number;
    executionTimeWarning: number;
  };
}