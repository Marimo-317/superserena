/**
 * SPARC Methodology Progress Tracker
 * Monitors and tracks progress through SPARC phases
 */

import { EventEmitter } from 'events';
import { SPARCProgress, SPARCPhase, VisualizationEvent } from '../types';
import { Logger } from 'winston';

export class SPARCProgressTracker extends EventEmitter {
  private activeSessions: Map<string, SPARCProgress> = new Map();
  private sessionHistory: SPARCProgress[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  /**
   * Initialize a new SPARC session
   */
  public initializeSession(sessionId: string): void {
    const phases: Record<string, SPARCPhase> = {
      specification: {
        name: 'specification',
        status: 'pending',
        artifacts: [],
        progress: 0,
        qualityScore: 0
      },
      pseudocode: {
        name: 'pseudocode',
        status: 'pending',
        artifacts: [],
        progress: 0,
        qualityScore: 0
      },
      architecture: {
        name: 'architecture',
        status: 'pending',
        artifacts: [],
        progress: 0,
        qualityScore: 0
      },
      refinement: {
        name: 'refinement',
        status: 'pending',
        artifacts: [],
        progress: 0,
        qualityScore: 0
      },
      completion: {
        name: 'completion',
        status: 'pending',
        artifacts: [],
        progress: 0,
        qualityScore: 0
      }
    };

    const session: SPARCProgress = {
      sessionId,
      phases,
      overallProgress: 0,
      currentPhase: 'specification',
      estimatedCompletion: new Date(Date.now() + 3600000) // Default 1 hour
    };

    this.activeSessions.set(sessionId, session);
    this.logger.info(`SPARC session initialized: ${sessionId}`);
    
    this.emitEvent('sparc_phase_change', session);
  }

  /**
   * Start a specific phase
   */
  public startPhase(sessionId: string, phaseName: SPARCPhase['name']): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to start phase for non-existent session: ${sessionId}`);
      return;
    }

    const phase = session.phases[phaseName];
    if (!phase) {
      this.logger.warn(`Invalid phase name: ${phaseName}`);
      return;
    }

    phase.status = 'in_progress';
    phase.startTime = new Date();
    session.currentPhase = phaseName;

    this.updateOverallProgress(session);
    this.activeSessions.set(sessionId, session);

    this.logger.info(`SPARC phase started: ${sessionId} - ${phaseName}`);
    this.emitEvent('sparc_phase_change', session);
  }

  /**
   * Update phase progress
   */
  public updatePhaseProgress(
    sessionId: string,
    phaseName: SPARCPhase['name'],
    progress: number,
    qualityScore?: number,
    artifacts?: string[]
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to update phase for non-existent session: ${sessionId}`);
      return;
    }

    const phase = session.phases[phaseName];
    if (!phase) {
      this.logger.warn(`Invalid phase name: ${phaseName}`);
      return;
    }

    phase.progress = Math.min(100, Math.max(0, progress));
    
    if (qualityScore !== undefined) {
      phase.qualityScore = Math.min(100, Math.max(0, qualityScore));
    }

    if (artifacts) {
      phase.artifacts = [...new Set([...phase.artifacts, ...artifacts])];
    }

    this.updateOverallProgress(session);
    this.activeSessions.set(sessionId, session);

    this.logger.debug(`SPARC phase updated: ${sessionId} - ${phaseName} - ${progress}%`);
  }

  /**
   * Complete a phase
   */
  public completePhase(
    sessionId: string,
    phaseName: SPARCPhase['name'],
    qualityScore: number,
    artifacts: string[]
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to complete phase for non-existent session: ${sessionId}`);
      return;
    }

    const phase = session.phases[phaseName];
    if (!phase) {
      this.logger.warn(`Invalid phase name: ${phaseName}`);
      return;
    }

    phase.status = 'completed';
    phase.progress = 100;
    phase.qualityScore = qualityScore;
    phase.artifacts = artifacts;
    phase.endTime = new Date();

    // Auto-advance to next phase
    const nextPhase = this.getNextPhase(phaseName);
    if (nextPhase) {
      session.currentPhase = nextPhase;
    }

    this.updateOverallProgress(session);
    this.activeSessions.set(sessionId, session);

    this.logger.info(`SPARC phase completed: ${sessionId} - ${phaseName} - Quality: ${qualityScore}`);
    this.emitEvent('sparc_phase_change', session);

    // Check if all phases are complete
    if (this.isSessionComplete(session)) {
      this.completeSession(sessionId);
    }
  }

  /**
   * Mark phase as error
   */
  public errorPhase(sessionId: string, phaseName: SPARCPhase['name'], error: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Attempted to error phase for non-existent session: ${sessionId}`);
      return;
    }

    const phase = session.phases[phaseName];
    if (!phase) {
      this.logger.warn(`Invalid phase name: ${phaseName}`);
      return;
    }

    phase.status = 'error';
    phase.artifacts.push(`ERROR: ${error}`);

    this.activeSessions.set(sessionId, session);

    this.logger.error(`SPARC phase error: ${sessionId} - ${phaseName} - ${error}`);
    this.emitEvent('sparc_phase_change', session);
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): SPARCProgress[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): SPARCProgress | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get session history
   */
  public getSessionHistory(limit?: number): SPARCProgress[] {
    return limit ? this.sessionHistory.slice(-limit) : this.sessionHistory;
  }

  /**
   * Get SPARC statistics
   */
  public getSPARCStatistics(): Record<string, any> {
    const allSessions = [...this.sessionHistory, ...this.activeSessions.values()];
    
    const stats = {
      totalSessions: allSessions.length,
      completedSessions: this.sessionHistory.length,
      activeSessions: this.activeSessions.size,
      averageQualityScore: 0,
      phaseCompletionRates: {} as Record<string, number>,
      averagePhaseTime: {} as Record<string, number>
    };

    let totalQuality = 0;
    let qualityCount = 0;
    const phaseCompletions: Record<string, number> = {};
    const phaseTimes: Record<string, number[]> = {};

    for (const session of allSessions) {
      for (const [phaseName, phase] of Object.entries(session.phases)) {
        if (phase.status === 'completed') {
          phaseCompletions[phaseName] = (phaseCompletions[phaseName] || 0) + 1;
          totalQuality += phase.qualityScore;
          qualityCount++;

          if (phase.startTime && phase.endTime) {
            const duration = phase.endTime.getTime() - phase.startTime.getTime();
            if (!phaseTimes[phaseName]) phaseTimes[phaseName] = [];
            phaseTimes[phaseName].push(duration);
          }
        }
      }
    }

    // Calculate averages
    if (qualityCount > 0) {
      stats.averageQualityScore = Math.round(totalQuality / qualityCount);
    }

    // Calculate completion rates
    for (const phaseName of Object.keys(phaseCompletions)) {
      stats.phaseCompletionRates[phaseName] = 
        Math.round((phaseCompletions[phaseName] / allSessions.length) * 100);
    }

    // Calculate average phase times
    for (const [phaseName, times] of Object.entries(phaseTimes)) {
      if (times.length > 0) {
        stats.averagePhaseTime[phaseName] = 
          Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
      }
    }

    return stats;
  }

  private updateOverallProgress(session: SPARCProgress): void {
    const phases = Object.values(session.phases);
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0);
    session.overallProgress = Math.round(totalProgress / phases.length);

    // Update estimated completion based on progress
    if (session.overallProgress > 0) {
      const avgPhaseProgress = session.overallProgress / 5; // 5 phases
      const remainingPhases = 5 - (session.overallProgress / 20); // Rough estimate
      const estimatedTimePerPhase = 720000; // 12 minutes per phase
      session.estimatedCompletion = new Date(Date.now() + (remainingPhases * estimatedTimePerPhase));
    }
  }

  private getNextPhase(currentPhase: SPARCPhase['name']): SPARCPhase['name'] | null {
    const phaseOrder: SPARCPhase['name'][] = [
      'specification', 'pseudocode', 'architecture', 'refinement', 'completion'
    ];
    
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null;
  }

  private isSessionComplete(session: SPARCProgress): boolean {
    return Object.values(session.phases).every(phase => phase.status === 'completed');
  }

  private completeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.sessionHistory.push({ ...session });
    this.activeSessions.delete(sessionId);

    this.logger.info(`SPARC session completed: ${sessionId}`);
    this.emitEvent('sparc_phase_change', session);
  }

  private emitEvent(type: VisualizationEvent['type'], payload: any): void {
    const event: VisualizationEvent = {
      type,
      payload,
      timestamp: new Date(),
      sessionId: payload.sessionId || 'default'
    };

    this.emit('visualization_event', event);
    this.logger.debug(`Emitted SPARC event: ${type}`);
  }
}