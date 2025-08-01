/**
 * Quality Gates Panel Component
 * 8-step quality validation visualization
 */

import React from 'react';
import { QualityGate } from '../../types/monitoring';

interface QualityGatesPanelProps {
  gates: QualityGate[];
  detailed?: boolean;
}

const getGateIcon = (step: number): string => {
  const iconMap: Record<number, string> = {
    1: '📝', // Syntax Validation
    2: '🔍', // Type Checking
    3: '✨', // Linting
    4: '🛡️', // Security Audit
    5: '🧪', // Testing
    6: '⚡', // Performance
    7: '📚', // Documentation
    8: '🔗'  // Integration
  };
  return iconMap[step] || '✅';
};

const getStatusColor = (status: QualityGate['status']): string => {
  switch (status) {
    case 'passed': return '#22c55e';
    case 'in_progress': return '#3b82f6';
    case 'failed': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'skipped': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusText = (status: QualityGate['status']): string => {
  switch (status) {
    case 'passed': return 'Passed';
    case 'in_progress': return 'In Progress';
    case 'failed': return 'Failed';
    case 'warning': return 'Warning';
    case 'skipped': return 'Skipped';
    default: return 'Pending';
  }
};

const formatExecutionTime = (executionTime: number): string => {
  if (executionTime < 1000) {
    return `${executionTime}ms`;
  }
  return `${(executionTime / 1000).toFixed(1)}s`;
};

const getEvidenceIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'test_result': '🧪',
    'security_scan': '🛡️',
    'performance_metric': '⚡',
    'code_analysis': '🔍'
  };
  return iconMap[type] || '📄';
};

export const QualityGatesPanel: React.FC<QualityGatesPanelProps> = ({ 
  gates, 
  detailed = false 
}) => {
  const passedGates = gates.filter(g => g.status === 'passed').length;
  const failedGates = gates.filter(g => g.status === 'failed').length;
  const warningGates = gates.filter(g => g.status === 'warning').length;
  const inProgressGates = gates.filter(g => g.status === 'in_progress').length;
  
  const overallStatus = failedGates > 0 ? 'failed' : 
                       warningGates > 0 ? 'warning' : 
                       inProgressGates > 0 ? 'in_progress' : 
                       passedGates === gates.length ? 'passed' : 'pending';

  return (
    <div className={`quality-gates-panel ${detailed ? 'detailed' : ''}`}>
      <div className="panel-header">
        <h3>✅ Quality Gates</h3>
        <div className="gates-summary">
          <span 
            className="overall-status"
            style={{ color: getStatusColor(overallStatus) }}
          >
            {getStatusText(overallStatus)}
          </span>
          <span className="gates-count">
            {passedGates}/{gates.length} Passed
          </span>
        </div>
      </div>

      <div className="gates-progress-bar">
        <div className="progress-sections">
          {gates.map((gate) => (
            <div 
              key={gate.step}
              className={`progress-section ${gate.status}`}
              style={{ 
                backgroundColor: getStatusColor(gate.status),
                width: `${100 / gates.length}%`
              }}
              title={`${gate.name}: ${getStatusText(gate.status)}`}
            />
          ))}
        </div>
      </div>

      <div className="gates-grid">
        {gates.map((gate) => (
          <div key={gate.step} className={`gate-card ${gate.status}`}>
            <div className="gate-header">
              <div className="gate-icon-step">
                <span className="gate-icon">
                  {getGateIcon(gate.step)}
                </span>
                <span className="gate-step">
                  Step {gate.step}
                </span>
              </div>
              <div 
                className="gate-status"
                style={{ backgroundColor: getStatusColor(gate.status) }}
              >
                {getStatusText(gate.status)}
              </div>
            </div>

            <div className="gate-content">
              <h4 className="gate-name">{gate.name}</h4>
              {detailed && (
                <p className="gate-description">{gate.description}</p>
              )}
              
              {gate.executionTime > 0 && (
                <div className="gate-timing">
                  <span className="timing-label">Execution Time:</span>
                  <span className="timing-value">
                    {formatExecutionTime(gate.executionTime)}
                  </span>
                </div>
              )}

              {detailed && Object.keys(gate.metrics).length > 0 && (
                <div className="gate-metrics">
                  <h5>Metrics:</h5>
                  <div className="metrics-list">
                    {Object.entries(gate.metrics).map(([key, value]) => (
                      <div key={key} className="metric-item">
                        <span className="metric-key">{key}:</span>
                        <span className="metric-value">{value}</span>
                        {gate.threshold[key] && (
                          <span className="metric-threshold">
                            (threshold: {gate.threshold[key]})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailed && gate.evidence.length > 0 && (
                <div className="gate-evidence">
                  <h5>Evidence ({gate.evidence.length}):</h5>
                  <div className="evidence-list">
                    {gate.evidence.slice(0, detailed ? undefined : 2).map((evidence, index) => (
                      <div key={index} className="evidence-item">
                        <div className="evidence-header">
                          <span className="evidence-icon">
                            {getEvidenceIcon(evidence.type)}
                          </span>
                          <span className="evidence-type">
                            {evidence.type.replace('_', ' ')}
                          </span>
                          <span className="evidence-timestamp">
                            {new Date(evidence.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {detailed && evidence.data && (
                          <div className="evidence-data">
                            {typeof evidence.data === 'object' ? (
                              <pre className="evidence-json">
                                {JSON.stringify(evidence.data, null, 2)}
                              </pre>
                            ) : (
                              <span className="evidence-text">
                                {String(evidence.data)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!detailed && gate.evidence.length > 2 && (
                      <div className="evidence-more">
                        +{gate.evidence.length - 2} more evidence items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {detailed && (
        <div className="gates-summary-stats">
          <div className="summary-header">
            <h4>Quality Summary</h4>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Success Rate:</span>
              <span className="summary-value">
                {Math.round((passedGates / gates.length) * 100)}%
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Evidence:</span>
              <span className="summary-value">
                {gates.reduce((acc, gate) => acc + gate.evidence.length, 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Execution Time:</span>
              <span className="summary-value">
                {formatExecutionTime(
                  gates.reduce((acc, gate) => acc + gate.executionTime, 0) / gates.length
                )}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Critical Issues:</span>
              <span className="summary-value" style={{ color: failedGates > 0 ? '#ef4444' : '#22c55e' }}>
                {failedGates}
              </span>
            </div>
          </div>
        </div>
      )}

      {!detailed && (
        <div className="gates-quick-summary">
          <div className="summary-row">
            <div className="summary-stat">
              <span className="stat-value passed">{passedGates}</span>
              <span className="stat-label">Passed</span>
            </div>
            {failedGates > 0 && (
              <div className="summary-stat">
                <span className="stat-value failed">{failedGates}</span>
                <span className="stat-label">Failed</span>
              </div>
            )}
            {warningGates > 0 && (
              <div className="summary-stat">
                <span className="stat-value warning">{warningGates}</span>
                <span className="stat-label">Warnings</span>
              </div>
            )}
            {inProgressGates > 0 && (
              <div className="summary-stat">
                <span className="stat-value in-progress">{inProgressGates}</span>
                <span className="stat-label">In Progress</span>
              </div>
            )}
          </div>
        </div>
      )}

      {failedGates > 0 && (
        <div className="gates-alert">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">
              {failedGates} quality gate{failedGates > 1 ? 's' : ''} failed. 
              Review and address issues before proceeding.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};