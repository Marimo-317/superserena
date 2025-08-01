/**
 * SuperClaude Operation Visualization Dashboard
 * Real-time monitoring dashboard for AI orchestration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExecutionSession, 
  AgentActivity, 
  SparcPhase, 
  QualityGate, 
  WaveExecution,
  PerformanceMetrics,
  MemoryState,
  DashboardState 
} from '../types/monitoring';
import { useWebSocket } from './hooks/useWebSocket';
import { AgentActivityPanel } from './components/AgentActivityPanel';
import { SPARCProgressTracker } from './components/SPARCProgressTracker';
import { QualityGatesPanel } from './components/QualityGatesPanel';
import { WaveSystemPanel } from './components/WaveSystemPanel';
import { PerformanceMetricsPanel } from './components/PerformanceMetricsPanel';
import { MemoryStatePanel } from './components/MemoryStatePanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { SessionHistoryPanel } from './components/SessionHistoryPanel';
import './Dashboard.css';

interface DashboardProps {
  apiBaseUrl?: string;
  wsUrl?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  apiBaseUrl = '/api/monitoring',
  wsUrl = `ws://${window.location.host}`
}) => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    currentSession: undefined,
    historySessions: [],
    isConnected: false,
    lastUpdate: new Date(),
    filters: {
      dateRange: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()],
      agentTypes: [],
      status: []
    },
    metrics: {
      totalSessions: 0,
      averageExecutionTime: 0,
      averageTokenReduction: 0,
      averageQualityScore: 0
    }
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'sparc' | 'quality' | 'waves' | 'performance' | 'memory' | 'history'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection
  const { isConnected, sendMessage } = useWebSocket(wsUrl, {
    onSessionStart: (session: ExecutionSession) => {
      setDashboardState(prev => ({
        ...prev,
        currentSession: session,
        lastUpdate: new Date()
      }));
    },
    onSessionUpdate: (update: Partial<ExecutionSession>) => {
      setDashboardState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? { ...prev.currentSession, ...update } : undefined,
        lastUpdate: new Date()
      }));
    },
    onSessionEnd: (session: ExecutionSession) => {
      setDashboardState(prev => ({
        ...prev,
        currentSession: undefined,
        historySessions: [session, ...prev.historySessions.slice(0, 49)],
        lastUpdate: new Date()
      }));
    },
    onAgentUpdate: (agent: AgentActivity) => {
      setDashboardState(prev => {
        if (!prev.currentSession) return prev;
        
        const updatedAgents = [...prev.currentSession.agents];
        const agentIndex = updatedAgents.findIndex(a => a.agentId === agent.agentId);
        
        if (agentIndex >= 0) {
          updatedAgents[agentIndex] = agent;
        } else {
          updatedAgents.push(agent);
        }

        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            agents: updatedAgents
          },
          lastUpdate: new Date()
        };
      });
    },
    onSPARCUpdate: (phase: SparcPhase) => {
      setDashboardState(prev => {
        if (!prev.currentSession) return prev;
        
        const updatedSparc = [...prev.currentSession.sparc];
        const phaseIndex = updatedSparc.findIndex(p => p.phase === phase.phase);
        
        if (phaseIndex >= 0) {
          updatedSparc[phaseIndex] = phase;
        }

        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            sparc: updatedSparc
          },
          lastUpdate: new Date()
        };
      });
    },
    onQualityGate: (gate: QualityGate) => {
      setDashboardState(prev => {
        if (!prev.currentSession) return prev;
        
        const updatedGates = [...prev.currentSession.qualityGates];
        const gateIndex = updatedGates.findIndex(g => g.step === gate.step);
        
        if (gateIndex >= 0) {
          updatedGates[gateIndex] = gate;
        }

        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            qualityGates: updatedGates
          },
          lastUpdate: new Date()
        };
      });
    },
    onWaveUpdate: (wave: WaveExecution) => {
      setDashboardState(prev => {
        if (!prev.currentSession) return prev;
        
        const updatedWaves = [...prev.currentSession.waves];
        const waveIndex = updatedWaves.findIndex(w => w.waveId === wave.waveId);
        
        if (waveIndex >= 0) {
          updatedWaves[waveIndex] = wave;
        } else {
          updatedWaves.push(wave);
        }

        return {
          ...prev,
          currentSession: {
            ...prev.currentSession,
            waves: updatedWaves
          },
          lastUpdate: new Date()
        };
      });
    },
    onPerformanceUpdate: (performance: PerformanceMetrics) => {
      setDashboardState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          performance
        } : undefined,
        lastUpdate: new Date()
      }));
    },
    onMemoryUpdate: (memory: MemoryState) => {
      setDashboardState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          memory
        } : undefined,
        lastUpdate: new Date()
      }));
    },
    onError: (error: { message: string; timestamp: Date }) => {
      setError(error.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  // Update connection status
  useEffect(() => {
    setDashboardState(prev => ({
      ...prev,
      isConnected
    }));
  }, [isConnected]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Load current session
        const currentResponse = await fetch(`${apiBaseUrl}/current-session`);
        const currentData = await currentResponse.json();
        
        // Load session history
        const historyResponse = await fetch(`${apiBaseUrl}/sessions?limit=50`);
        const historyData = await historyResponse.json();
        
        // Load statistics
        const statsResponse = await fetch(`${apiBaseUrl}/statistics`);
        const statsData = await statsResponse.json();

        setDashboardState(prev => ({
          ...prev,
          currentSession: currentData.session,
          historySessions: historyData.sessions || [],
          metrics: {
            totalSessions: statsData.statistics?.totalSessions || 0,
            averageExecutionTime: statsData.statistics?.averageExecutionTime || 0,
            averageTokenReduction: statsData.statistics?.averageTokenReduction || 0,
            averageQualityScore: statsData.statistics?.averageQualityScore || 0
          }
        }));
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [apiBaseUrl]);

  // Request session history
  const requestSessionHistory = useCallback(() => {
    sendMessage('get-session-history', {});
  }, [sendMessage]);

  // Request statistics
  const requestStatistics = useCallback(() => {
    sendMessage('get-statistics', {});
  }, [sendMessage]);

  // Start simulation
  const startSimulation = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/../simulate`, { method: 'POST' });
      const data = await response.json();
      console.log('Simulation started:', data);
    } catch (error) {
      console.error('Failed to start simulation:', error);
      setError('Failed to start simulation');
    }
  }, [apiBaseUrl]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading SuperClaude Dashboard...</p>
      </div>
    );
  }

  const { currentSession, isConnected: connected, lastUpdate, metrics } = dashboardState;
  const hasActiveSession = !!currentSession;

  return (
    <div className="superclaud-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-title">
          <h1>🚀 SuperClaude Operation Dashboard</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <span className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button onClick={startSimulation} className="btn btn-primary">
            🎭 Start Demo
          </button>
          <button onClick={requestSessionHistory} className="btn btn-secondary">
            📈 Refresh
          </button>
        </div>
      </header>

      {/* Error notification */}
      {error && (
        <div className="error-notification">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Quick stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-value">{metrics.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(metrics.averageExecutionTime / 1000)}s</div>
          <div className="stat-label">Avg Exec Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(metrics.averageTokenReduction)}%</div>
          <div className="stat-label">Token Reduction</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(metrics.averageQualityScore)}</div>
          <div className="stat-label">Quality Score</div>
        </div>
      </div>

      {/* Session status */}
      <div className="session-status">
        {hasActiveSession ? (
          <div className="active-session">
            <h3>🔄 Active Session: {currentSession.sessionId}</h3>
            <div className="session-info">
              <span>Status: <strong>{currentSession.status}</strong></span>
              <span>Started: {new Date(currentSession.startTime).toLocaleString()}</span>
              <span>Trigger: {currentSession.trigger.type} by {currentSession.trigger.user}</span>
            </div>
          </div>
        ) : (
          <div className="no-session">
            <h3>💤 No Active Session</h3>
            <p>Waiting for SuperClaude execution to begin...</p>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          🤖 Agents ({currentSession?.agents.filter(a => a.status === 'active').length || 0})
        </button>
        <button 
          className={`nav-tab ${activeTab === 'sparc' ? 'active' : ''}`}
          onClick={() => setActiveTab('sparc')}
        >
          🏗️ SPARC
        </button>
        <button 
          className={`nav-tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          ✅ Quality Gates
        </button>
        <button 
          className={`nav-tab ${activeTab === 'waves' ? 'active' : ''}`}
          onClick={() => setActiveTab('waves')}
        >
          🌊 Waves ({currentSession?.waves.length || 0})
        </button>
        <button 
          className={`nav-tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          ⚡ Performance
        </button>
        <button 
          className={`nav-tab ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          🧠 Memory
        </button>
        <button 
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </button>
      </nav>

      {/* Main content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              <StatisticsPanel statistics={metrics} />
              {hasActiveSession && (
                <>
                  <AgentActivityPanel agents={currentSession.agents} />
                  <SPARCProgressTracker phases={currentSession.sparc} />
                  <QualityGatesPanel gates={currentSession.qualityGates} />
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && hasActiveSession && (
          <AgentActivityPanel agents={currentSession.agents} detailed={true} />
        )}

        {activeTab === 'sparc' && hasActiveSession && (
          <SPARCProgressTracker phases={currentSession.sparc} detailed={true} />
        )}

        {activeTab === 'quality' && hasActiveSession && (
          <QualityGatesPanel gates={currentSession.qualityGates} detailed={true} />
        )}

        {activeTab === 'waves' && hasActiveSession && (
          <WaveSystemPanel waves={currentSession.waves} />
        )}

        {activeTab === 'performance' && hasActiveSession && (
          <PerformanceMetricsPanel performance={currentSession.performance} />
        )}

        {activeTab === 'memory' && hasActiveSession && (
          <MemoryStatePanel memory={currentSession.memory} />
        )}

        {activeTab === 'history' && (
          <SessionHistoryPanel sessions={dashboardState.historySessions} />
        )}

        {!hasActiveSession && activeTab !== 'overview' && activeTab !== 'history' && (
          <div className="no-session-placeholder">
            <h3>No Active Session</h3>
            <p>Start a SuperClaude execution to see {activeTab} data</p>
            <button onClick={startSimulation} className="btn btn-primary">
              🎭 Start Demo Session
            </button>
          </div>
        )}
      </main>
    </div>
  );
};