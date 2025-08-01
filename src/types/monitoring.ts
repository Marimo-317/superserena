/**
 * SuperClaude Operation Visualization System - Type Definitions
 * Comprehensive monitoring and visualization for AI orchestration
 */

export interface AgentActivity {
  agentId: string;
  agentType: 
    | 'sparc-orchestrator'
    | 'sparc-architect' 
    | 'sparc-coder'
    | 'sparc-security-reviewer'
    | 'sparc-performance'
    | 'sparc-tdd'
    | 'sparc-devops'
    | 'general-purpose'
    | 'context-manager'
    | 'ai-engineer'
    | 'frontend-developer'
    | 'backend-architect';
  
  status: 'idle' | 'active' | 'completed' | 'error' | 'waiting';
  currentTask: string;
  progress: number; // 0-100
  startTime: Date;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    optimized: number;
    reductionPercentage: number;
  };
  evidence: string[];
  parentWaveId?: string;
}

export interface SparcPhase {
  phase: 'specification' | 'pseudocode' | 'architecture' | 'refinement' | 'completion';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  artifacts: string[];
  qualityScore: number; // 0-100
  startTime?: Date;
  completionTime?: Date;
  assignedAgents: string[];
  evidence: {
    documents: string[];
    codeFiles: string[];
    testResults: string[];
    qualityMetrics: Record<string, number>;
  };
}

export interface QualityGate {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'in_progress' | 'skipped' | 'warning';
  evidence: {
    type: 'test_result' | 'security_scan' | 'performance_metric' | 'code_analysis';
    data: any;
    timestamp: Date;
  }[];
  metrics: Record<string, number>;
  threshold: Record<string, number>;
  timestamp: Date;
  executionTime: number; // milliseconds
}

export interface WaveExecution {
  waveId: string;
  strategy: 'progressive' | 'systematic' | 'adaptive' | 'enterprise';
  currentPhase: number;
  totalPhases: number;
  complexity: number; // 0.0-1.0
  delegation: 'files' | 'folders' | 'tasks' | 'auto';
  startTime: Date;
  estimatedEndTime?: Date;
  performance: {
    timeReduction: number; // percentage
    qualityImprovement: number; // percentage  
    resourceEfficiency: number; // percentage
    tokenOptimization: number; // percentage
  };
  phases: {
    name: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    agents: string[];
    startTime?: Date;
    endTime?: Date;
  }[];
}

export interface PerformanceMetrics {
  sessionId: string;
  timestamp: Date;
  tokenOptimization: {
    original: number;
    optimized: number;
    reduction: number; // percentage
    technique: 'serena_mcp' | 'wave_system' | 'compression' | 'symbol_system';
  };
  executionTime: {
    total: number; // milliseconds
    phases: Record<string, number>;
    agents: Record<string, number>;
    toolUsage: Record<string, number>;
  };
  qualityMetrics: {
    codeQuality: number; // 0-100
    testCoverage: number; // 0-100
    securityScore: number; // 0-100
    performanceScore: number; // 0-100
    maintainabilityIndex: number; // 0-100
  };
  resourceUtilization: {
    cpuUsage: number; // percentage
    memoryUsage: number; // MB
    networkCalls: number;
    fileOperations: number;
  };
}

export interface MemoryState {
  sessionId: string;
  contextRetention: number; // percentage
  crossSessionData: string[];
  memoryFiles: {
    name: string;
    path: string;
    size: number; // bytes
    lastAccessed: Date;
    relevanceScore: number; // 0-100
    content?: string;
  }[];
  totalMemoryUsage: number; // bytes
  optimizationLevel: number; // 0-100
}

export interface ExecutionSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  trigger: {
    type: 'issue' | 'comment' | 'pr' | 'manual';
    source: string;
    user: string;
  };
  framework: {
    version: string;
    persona: string;
    commands: string[];
    flags: string[];
  };
  agents: AgentActivity[];
  sparc: SparcPhase[];
  qualityGates: QualityGate[];
  waves: WaveExecution[];
  performance: PerformanceMetrics;
  memory: MemoryState;
  artifacts: {
    type: 'code' | 'test' | 'documentation' | 'config';
    path: string;
    size: number;
    created: Date;
  }[];
  status: 'initializing' | 'running' | 'completed' | 'error' | 'cancelled';
  errorLog?: string[];
}

export interface MonitoringConfig {
  enableRealTimeUpdates: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionDays: number;
  maxSessionHistory: number;
  performanceThresholds: {
    maxExecutionTime: number; // milliseconds
    minTokenReduction: number; // percentage
    minQualityScore: number; // 0-100
  };
  alerting: {
    enableSlackNotifications: boolean;
    enableEmailNotifications: boolean;
    webhookUrl?: string;
  };
}

export interface DashboardState {
  currentSession?: ExecutionSession;
  historySessions: ExecutionSession[];
  isConnected: boolean;
  lastUpdate: Date;
  filters: {
    dateRange: [Date, Date];
    agentTypes: string[];
    status: string[];
  };
  metrics: {
    totalSessions: number;
    averageExecutionTime: number;
    averageTokenReduction: number;
    averageQualityScore: number;
  };
}

// WebSocket Events
export interface WSEvents {
  'session-start': ExecutionSession;
  'session-update': Partial<ExecutionSession>;
  'session-end': ExecutionSession;
  'agent-update': AgentActivity;
  'sparc-update': SparcPhase;
  'quality-gate': QualityGate;
  'wave-update': WaveExecution;
  'performance-update': PerformanceMetrics;
  'memory-update': MemoryState;
  'error': { message: string; timestamp: Date };
}

// API Endpoints
export interface MonitoringAPI {
  '/api/monitoring/sessions': {
    GET: { sessions: ExecutionSession[] };
    POST: { session: Partial<ExecutionSession> };
  };
  '/api/monitoring/sessions/:id': {
    GET: { session: ExecutionSession };
    PUT: { session: Partial<ExecutionSession> };
    DELETE: { success: boolean };
  };
  '/api/monitoring/metrics': {
    GET: { metrics: PerformanceMetrics[] };
  };
  '/api/monitoring/config': {
    GET: { config: MonitoringConfig };
    PUT: { config: MonitoringConfig };
  };
}