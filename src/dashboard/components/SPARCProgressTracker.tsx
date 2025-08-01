/**
 * SPARC Progress Tracker Component
 * Visualization of SPARC methodology execution phases
 */

import React from 'react';
import { SparcPhase } from '../../types/monitoring';

interface SPARCProgressTrackerProps {
  phases: SparcPhase[];
  detailed?: boolean;
}

const getPhaseIcon = (phase: SparcPhase['phase']): string => {
  const iconMap: Record<string, string> = {
    'specification': '📋',
    'pseudocode': '🔤',
    'architecture': '🏗️',
    'refinement': '✨',
    'completion': '🎯'
  };
  return iconMap[phase] || '📄';
};

const getPhaseTitle = (phase: SparcPhase['phase']): string => {
  const titleMap: Record<string, string> = {
    'specification': 'Specification',
    'pseudocode': 'Pseudocode',
    'architecture': 'Architecture',
    'refinement': 'Refinement',
    'completion': 'Completion'
  };
  return titleMap[phase] || phase;
};

const getPhaseDescription = (phase: SparcPhase['phase']): string => {
  const descMap: Record<string, string> = {
    'specification': 'Requirements analysis and specification definition',
    'pseudocode': 'High-level algorithmic design and logic planning',
    'architecture': 'System architecture and component design',
    'refinement': 'Code optimization and quality improvements',
    'completion': 'Final implementation and validation'
  };
  return descMap[phase] || '';
};

const getStatusColor = (status: SparcPhase['status']): string => {
  switch (status) {
    case 'completed': return '#22c55e';
    case 'in_progress': return '#3b82f6';
    case 'error': return '#ef4444';
    case 'pending': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusText = (status: SparcPhase['status']): string => {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'error': return 'Error';
    case 'pending': return 'Pending';
    default: return 'Unknown';
  }
};

const formatDuration = (startTime?: Date, endTime?: Date): string => {
  if (!startTime) return 'Not started';
  const end = endTime || new Date();
  const duration = end.getTime() - startTime.getTime();
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const getQualityScoreColor = (score: number): string => {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
};

export const SPARCProgressTracker: React.FC<SPARCProgressTrackerProps> = ({ 
  phases, 
  detailed = false 
}) => {
  const overallProgress = phases.reduce((acc, phase) => acc + phase.progress, 0) / phases.length;
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const currentPhase = phases.find(p => p.status === 'in_progress');
  
  return (
    <div className={`sparc-progress-tracker ${detailed ? 'detailed' : ''}`}>
      <div className="panel-header">
        <h3>🏗️ SPARC Methodology</h3>
        <div className="sparc-summary">
          <span className="overall-progress">
            {Math.round(overallProgress)}% Complete
          </span>
          <span className="phase-count">
            {completedPhases}/{phases.length} Phases
          </span>
        </div>
      </div>

      <div className="sparc-timeline">
        {phases.map((phase, index) => {
          const isActive = phase.status === 'in_progress';
          const isCompleted = phase.status === 'completed';
          const isError = phase.status === 'error';
          
          return (
            <div key={phase.phase} className={`sparc-phase ${phase.status}`}>
              {/* Phase connection line */}
              {index < phases.length - 1 && (
                <div 
                  className={`phase-connector ${
                    isCompleted ? 'completed' : 'pending'
                  }`}
                />
              )}
              
              <div className="phase-circle">
                <span className="phase-icon">
                  {getPhaseIcon(phase.phase)}
                </span>
                {isCompleted && (
                  <div className="completion-check">✓</div>
                )}
                {isError && (
                  <div className="error-indicator">✗</div>
                )}
              </div>
              
              <div className="phase-content">
                <div className="phase-header">
                  <h4 className="phase-title">
                    {getPhaseTitle(phase.phase)}
                  </h4>
                  <span 
                    className="phase-status"
                    style={{ color: getStatusColor(phase.status) }}
                  >
                    {getStatusText(phase.status)}
                  </span>
                </div>
                
                {!detailed && (
                  <div className="phase-progress-simple">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${phase.progress}%`,
                          backgroundColor: getStatusColor(phase.status)
                        }}
                      />
                    </div>
                    <span className="progress-text">{phase.progress}%</span>
                  </div>
                )}
                
                {detailed && (
                  <>
                    <p className="phase-description">
                      {getPhaseDescription(phase.phase)}
                    </p>
                    
                    <div className="phase-progress">
                      <div className="progress-header">
                        <span>Progress</span>
                        <span>{phase.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${phase.progress}%`,
                            backgroundColor: getStatusColor(phase.status)
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="phase-metrics">
                      <div className="quality-score">
                        <span className="metric-label">Quality Score:</span>
                        <span 
                          className="metric-value"
                          style={{ color: getQualityScoreColor(phase.qualityScore) }}
                        >
                          {phase.qualityScore}/100
                        </span>
                      </div>
                      
                      {phase.startTime && (
                        <div className="phase-timing">
                          <span className="metric-label">Duration:</span>
                          <span className="metric-value">
                            {formatDuration(phase.startTime, phase.completionTime)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {phase.artifacts.length > 0 && (
                      <div className="phase-artifacts">
                        <h5>Artifacts ({phase.artifacts.length}):</h5>
                        <ul className="artifact-list">
                          {phase.artifacts.map((artifact, i) => (
                            <li key={i} className="artifact-item">
                              📄 {artifact}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {phase.assignedAgents.length > 0 && (
                      <div className="phase-agents">
                        <h5>Assigned Agents:</h5>
                        <div className="agent-tags">
                          {phase.assignedAgents.map((agentId, i) => (
                            <span key={i} className="agent-tag">
                              🤖 {agentId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {phase.evidence && (
                      <div className="phase-evidence">
                        <h5>Evidence:</h5>
                        <div className="evidence-grid">
                          {phase.evidence.documents.length > 0 && (
                            <div className="evidence-category">
                              <span className="evidence-label">Documents:</span>
                              <span className="evidence-count">
                                {phase.evidence.documents.length}
                              </span>
                            </div>
                          )}
                          {phase.evidence.codeFiles.length > 0 && (
                            <div className="evidence-category">
                              <span className="evidence-label">Code Files:</span>
                              <span className="evidence-count">
                                {phase.evidence.codeFiles.length}
                              </span>
                            </div>
                          )}
                          {phase.evidence.testResults.length > 0 && (
                            <div className="evidence-category">
                              <span className="evidence-label">Test Results:</span>
                              <span className="evidence-count">
                                {phase.evidence.testResults.length}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {Object.keys(phase.evidence.qualityMetrics).length > 0 && (
                          <div className="quality-metrics">
                            <h6>Quality Metrics:</h6>
                            <div className="metrics-grid">
                              {Object.entries(phase.evidence.qualityMetrics).map(([key, value]) => (
                                <div key={key} className="metric-item">
                                  <span className="metric-key">{key}:</span>
                                  <span className="metric-value">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {detailed && (
        <div className="sparc-summary-stats">
          <div className="summary-header">
            <h4>SPARC Summary</h4>
          </div>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Overall Progress:</span>
              <span className="summary-value">{Math.round(overallProgress)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Quality Score:</span>
              <span className="summary-value">
                {Math.round(phases.reduce((acc, p) => acc + p.qualityScore, 0) / phases.length)}/100
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Artifacts:</span>
              <span className="summary-value">
                {phases.reduce((acc, p) => acc + p.artifacts.length, 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Active Agents:</span>
              <span className="summary-value">
                {[...new Set(phases.flatMap(p => p.assignedAgents))].length}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {currentPhase && !detailed && (
        <div className="current-phase-indicator">
          <span>
            Currently working on: <strong>{getPhaseTitle(currentPhase.phase)}</strong>
          </span>
        </div>
      )}
    </div>
  );
};