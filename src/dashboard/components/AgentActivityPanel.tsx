/**
 * Agent Activity Panel Component
 * Real-time visualization of multi-agent coordination
 */

import React from 'react';
import { AgentActivity } from '../../types/monitoring';

interface AgentActivityPanelProps {
  agents: AgentActivity[];
  detailed?: boolean;
}

const getAgentIcon = (agentType: string): string => {
  const iconMap: Record<string, string> = {
    'sparc-orchestrator': '🎭',
    'sparc-architect': '🏗️',
    'sparc-coder': '👨‍💻',
    'sparc-security-reviewer': '🛡️',
    'sparc-performance': '⚡',
    'sparc-tdd': '🧪',
    'sparc-devops': '🚀',
    'general-purpose': '🤖',
    'context-manager': '📋',
    'ai-engineer': '🧠',
    'frontend-developer': '🎨',
    'backend-architect': '⚙️'
  };
  return iconMap[agentType] || '🤖';
};

const getStatusColor = (status: AgentActivity['status']): string => {
  switch (status) {
    case 'active': return '#22c55e';
    case 'completed': return '#3b82f6';
    case 'error': return '#ef4444';
    case 'waiting': return '#f59e0b';
    case 'idle': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusText = (status: AgentActivity['status']): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'completed': return 'Completed';
    case 'error': return 'Error';
    case 'waiting': return 'Waiting';
    case 'idle': return 'Idle';
    default: return 'Unknown';
  }
};

const formatDuration = (startTime: Date, endTime?: Date): string => {
  const end = endTime || new Date();
  const duration = end.getTime() - startTime.getTime();
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

const formatTokenUsage = (tokenUsage: AgentActivity['tokenUsage']): string => {
  if (tokenUsage.total === 0) return '0 tokens';
  
  const reduction = tokenUsage.reductionPercentage;
  return `${tokenUsage.optimized.toLocaleString()} tokens (${reduction.toFixed(1)}% reduction)`;
};

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({ 
  agents, 
  detailed = false 
}) => {
  const activeAgents = agents.filter(a => a.status === 'active');
  const completedAgents = agents.filter(a => a.status === 'completed');
  const errorAgents = agents.filter(a => a.status === 'error');

  if (!detailed && agents.length === 0) {
    return (
      <div className="agent-activity-panel">
        <h3>🤖 Agent Activity</h3>
        <div className="no-agents">
          <p>No agents currently active</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`agent-activity-panel ${detailed ? 'detailed' : ''}`}>
      <div className="panel-header">
        <h3>🤖 Multi-Agent Coordination</h3>
        <div className="agent-summary">
          <span className="active-count">
            {activeAgents.length} Active
          </span>
          <span className="completed-count">
            {completedAgents.length} Completed
          </span>
          {errorAgents.length > 0 && (
            <span className="error-count">
              {errorAgents.length} Error
            </span>
          )}
        </div>
      </div>

      <div className="agent-grid">
        {agents.map((agent) => (
          <div key={agent.agentId} className="agent-card">
            <div className="agent-header">
              <div className="agent-icon-name">
                <span className="agent-icon">
                  {getAgentIcon(agent.agentType)}
                </span>
                <div className="agent-info">
                  <h4 className="agent-type">
                    {agent.agentType.replace('sparc-', '').replace('-', ' ')}
                  </h4>
                  <span className="agent-id">
                    {agent.agentId}
                  </span>
                </div>
              </div>
              <div 
                className="agent-status"
                style={{ backgroundColor: getStatusColor(agent.status) }}
              >
                {getStatusText(agent.status)}
              </div>
            </div>

            <div className="agent-task">
              <p>{agent.currentTask}</p>
            </div>

            <div className="agent-progress">
              <div className="progress-header">
                <span>Progress</span>
                <span>{agent.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${agent.progress}%`,
                    backgroundColor: getStatusColor(agent.status)
                  }}
                />
              </div>
            </div>

            {detailed && (
              <>
                <div className="agent-timing">
                  <div className="timing-item">
                    <span className="timing-label">Duration:</span>
                    <span className="timing-value">
                      {formatDuration(agent.startTime, agent.actualCompletion)}
                    </span>
                  </div>
                  {agent.estimatedCompletion && agent.status === 'active' && (
                    <div className="timing-item">
                      <span className="timing-label">ETA:</span>
                      <span className="timing-value">
                        {agent.estimatedCompletion.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="agent-tokens">
                  <div className="token-usage">
                    <span className="token-label">Token Optimization:</span>
                    <span className="token-value">
                      {formatTokenUsage(agent.tokenUsage)}
                    </span>
                  </div>
                  <div className="token-breakdown">
                    <div className="token-item">
                      <span>Input: {agent.tokenUsage.input.toLocaleString()}</span>
                    </div>
                    <div className="token-item">
                      <span>Output: {agent.tokenUsage.output.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {agent.evidence.length > 0 && (
                  <div className="agent-evidence">
                    <h5>Evidence & Actions:</h5>
                    <ul className="evidence-list">
                      {agent.evidence.slice(-3).map((evidence, index) => (
                        <li key={index} className="evidence-item">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                    {agent.evidence.length > 3 && (
                      <span className="evidence-more">
                        +{agent.evidence.length - 3} more actions
                      </span>
                    )}
                  </div>
                )}

                {agent.parentWaveId && (
                  <div className="agent-wave">
                    <span className="wave-indicator">
                      🌊 Wave: {agent.parentWaveId}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!detailed && agents.length > 4 && (
        <div className="agent-overflow">
          <p>Showing 4 of {agents.length} agents</p>
        </div>
      )}

      {detailed && (
        <div className="agent-stats">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-label">Total Token Savings:</span>
              <span className="stat-value">
                {agents.reduce((acc, agent) => 
                  acc + (agent.tokenUsage.total - agent.tokenUsage.optimized), 0
                ).toLocaleString()} tokens
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Efficiency:</span>
              <span className="stat-value">
                {(agents.reduce((acc, agent) => 
                  acc + agent.tokenUsage.reductionPercentage, 0
                ) / agents.length).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};