/**
 * Wave System Operation Visualizer
 * Visualizes and tracks wave-based execution patterns
 */

import { EventEmitter } from 'events';
import { WaveExecution, VisualizationEvent } from '../types';
import { Logger } from 'winston';

export class WaveSystemVisualizer extends EventEmitter {
  private activeWaves: Map<string, WaveExecution> = new Map();
  private waveHistory: WaveExecution[] = [];
  private logger: Logger;
  private maxHistorySize: number;

  constructor(logger: Logger, maxHistorySize: number = 500) {
    super();
    this.logger = logger;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Start a new wave execution
   */
  public startWave(
    waveId: string,
    strategy: WaveExecution['strategy'],
    complexity: number,
    delegation: WaveExecution['delegation'],
    totalPhases: number = 1
  ): void {
    const wave: WaveExecution = {
      waveId,
      strategy,
      currentPhase: 1,
      totalPhases,
      complexity: Math.min(1, Math.max(0, complexity)),
      delegation,
      performance: {
        timeReduction: 0,
        qualityImprovement: 0,
        resourceEfficiency: 0
      },
      startTime: new Date(),
      status: 'active'
    };

    this.activeWaves.set(waveId, wave);
    this.logger.info(`Wave started: ${waveId} (${strategy}) - Complexity: ${complexity}`);
    
    this.emitEvent('wave_start', wave);
  }

  /**
   * Update wave progress
   */
  public updateWaveProgress(
    waveId: string,
    currentPhase: number,
    performance?: Partial<WaveExecution['performance']>
  ): void {
    const wave = this.activeWaves.get(waveId);
    if (!wave) {
      this.logger.warn(`Attempted to update non-existent wave: ${waveId}`);
      return;
    }

    wave.currentPhase = Math.min(wave.totalPhases, Math.max(1, currentPhase));
    
    if (performance) {
      Object.assign(wave.performance, performance);
    }

    this.activeWaves.set(waveId, wave);
    this.logger.debug(`Wave progress updated: ${waveId} - Phase ${currentPhase}/${wave.totalPhases}`);
  }

  /**
   * Complete a wave execution
   */
  public completeWave(
    waveId: string,
    finalPerformance: WaveExecution['performance']
  ): void {
    const wave = this.activeWaves.get(waveId);
    if (!wave) {
      this.logger.warn(`Attempted to complete non-existent wave: ${waveId}`);
      return;
    }

    wave.status = 'completed';
    wave.currentPhase = wave.totalPhases;
    wave.performance = finalPerformance;

    // Calculate final metrics
    const executionTime = Date.now() - wave.startTime.getTime();
    const efficiency = this.calculateWaveEfficiency(wave, executionTime);
    
    // Move to history
    this.addToHistory(wave);
    this.activeWaves.delete(waveId);

    this.logger.info(`Wave completed: ${waveId} - Efficiency: ${efficiency.toFixed(2)}`);
    this.emitEvent('wave_complete', wave);
  }

  /**
   * Fail a wave execution
   */
  public failWave(waveId: string, error: string): void {
    const wave = this.activeWaves.get(waveId);
    if (!wave) {
      this.logger.warn(`Attempted to fail non-existent wave: ${waveId}`);
      return;
    }

    wave.status = 'error';
    
    this.addToHistory(wave);
    this.activeWaves.delete(waveId);

    this.logger.error(`Wave failed: ${waveId} - ${error}`);
    this.emitEvent('wave_complete', wave);
  }

  /**
   * Pause a wave execution
   */
  public pauseWave(waveId: string): void {
    const wave = this.activeWaves.get(waveId);
    if (!wave) {
      this.logger.warn(`Attempted to pause non-existent wave: ${waveId}`);
      return;
    }

    wave.status = 'paused';
    this.activeWaves.set(waveId, wave);

    this.logger.info(`Wave paused: ${waveId}`);
  }

  /**
   * Resume a paused wave
   */
  public resumeWave(waveId: string): void {
    const wave = this.activeWaves.get(waveId);
    if (!wave) {
      this.logger.warn(`Attempted to resume non-existent wave: ${waveId}`);
      return;
    }

    wave.status = 'active';
    this.activeWaves.set(waveId, wave);

    this.logger.info(`Wave resumed: ${waveId}`);
  }

  /**
   * Get active waves
   */
  public getActiveWaves(): WaveExecution[] {
    return Array.from(this.activeWaves.values());
  }

  /**
   * Get wave by ID
   */
  public getWave(waveId: string): WaveExecution | undefined {
    return this.activeWaves.get(waveId);
  }

  /**
   * Get wave history
   */
  public getWaveHistory(limit?: number): WaveExecution[] {
    return limit ? this.waveHistory.slice(-limit) : this.waveHistory;
  }

  /**
   * Get wave system statistics
   */
  public getWaveStatistics(): Record<string, any> {
    const allWaves = [...this.waveHistory, ...this.activeWaves.values()];
    
    const stats = {
      totalWaves: allWaves.length,
      activeWaves: this.activeWaves.size,
      completedWaves: this.waveHistory.filter(w => w.status === 'completed').length,
      failedWaves: this.waveHistory.filter(w => w.status === 'error').length,
      byStrategy: {} as Record<string, number>,
      byDelegation: {} as Record<string, number>,
      averageComplexity: 0,
      averagePerformance: {
        timeReduction: 0,
        qualityImprovement: 0,
        resourceEfficiency: 0
      },
      complexityDistribution: {
        low: 0,    // 0-0.3
        medium: 0, // 0.3-0.7
        high: 0    // 0.7-1.0
      }
    };

    let totalComplexity = 0;
    let totalTimeReduction = 0;
    let totalQualityImprovement = 0;
    let totalResourceEfficiency = 0;
    let completedCount = 0;

    for (const wave of allWaves) {
      // Count by strategy
      stats.byStrategy[wave.strategy] = (stats.byStrategy[wave.strategy] || 0) + 1;
      
      // Count by delegation
      stats.byDelegation[wave.delegation] = (stats.byDelegation[wave.delegation] || 0) + 1;
      
      // Accumulate complexity
      totalComplexity += wave.complexity;
      
      // Complexity distribution
      if (wave.complexity <= 0.3) stats.complexityDistribution.low++;
      else if (wave.complexity <= 0.7) stats.complexityDistribution.medium++;
      else stats.complexityDistribution.high++;
      
      // Performance metrics (only for completed waves)
      if (wave.status === 'completed') {
        totalTimeReduction += wave.performance.timeReduction;
        totalQualityImprovement += wave.performance.qualityImprovement;
        totalResourceEfficiency += wave.performance.resourceEfficiency;
        completedCount++;
      }
    }

    // Calculate averages
    if (allWaves.length > 0) {
      stats.averageComplexity = Math.round((totalComplexity / allWaves.length) * 100) / 100;
    }

    if (completedCount > 0) {
      stats.averagePerformance = {
        timeReduction: Math.round((totalTimeReduction / completedCount) * 100) / 100,
        qualityImprovement: Math.round((totalQualityImprovement / completedCount) * 100) / 100,
        resourceEfficiency: Math.round((totalResourceEfficiency / completedCount) * 100) / 100
      };
    }

    return stats;
  }

  /**
   * Get wave performance trends
   */
  public getWavePerformanceTrends(timeWindowHours: number = 24): Record<string, any> {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const recentWaves = this.waveHistory.filter(wave => 
      wave.startTime >= cutoffTime && wave.status === 'completed'
    );

    const trends = {
      timeWindow: timeWindowHours,
      totalWaves: recentWaves.length,
      performanceTrend: {
        timeReduction: this.calculateTrend(recentWaves, 'timeReduction'),
        qualityImprovement: this.calculateTrend(recentWaves, 'qualityImprovement'),
        resourceEfficiency: this.calculateTrend(recentWaves, 'resourceEfficiency')
      },
      strategyPerformance: {} as Record<string, any>
    };

    // Calculate performance by strategy
    const strategyCounts: Record<string, { waves: WaveExecution[]; avgPerf: WaveExecution['performance'] }> = {};
    
    for (const wave of recentWaves) {
      if (!strategyCounts[wave.strategy]) {
        strategyCounts[wave.strategy] = {
          waves: [],
          avgPerf: { timeReduction: 0, qualityImprovement: 0, resourceEfficiency: 0 }
        };
      }
      strategyCounts[wave.strategy].waves.push(wave);
    }

    // Calculate averages for each strategy
    for (const [strategy, data] of Object.entries(strategyCounts)) {
      const count = data.waves.length;
      trends.strategyPerformance[strategy] = {
        count,
        averagePerformance: {
          timeReduction: Math.round(data.waves.reduce((sum, w) => sum + w.performance.timeReduction, 0) / count * 100) / 100,
          qualityImprovement: Math.round(data.waves.reduce((sum, w) => sum + w.performance.qualityImprovement, 0) / count * 100) / 100,
          resourceEfficiency: Math.round(data.waves.reduce((sum, w) => sum + w.performance.resourceEfficiency, 0) / count * 100) / 100
        }
      };
    }

    return trends;
  }

  /**
   * Predict optimal wave strategy
   */
  public predictOptimalStrategy(complexity: number, delegationType: WaveExecution['delegation']): {
    recommendedStrategy: WaveExecution['strategy'];
    confidence: number;
    reasoning: string;
  } {
    const similarWaves = this.waveHistory.filter(wave => 
      Math.abs(wave.complexity - complexity) <= 0.2 && 
      wave.delegation === delegationType &&
      wave.status === 'completed'
    );

    if (similarWaves.length === 0) {
      return {
        recommendedStrategy: this.getDefaultStrategy(complexity),
        confidence: 0.3,
        reasoning: 'No historical data available for similar waves'
      };
    }

    // Calculate performance score for each strategy
    const strategyScores: Record<string, { score: number; count: number }> = {};
    
    for (const wave of similarWaves) {
      const score = (
        wave.performance.timeReduction * 0.4 +
        wave.performance.qualityImprovement * 0.3 +
        wave.performance.resourceEfficiency * 0.3
      );
      
      if (!strategyScores[wave.strategy]) {
        strategyScores[wave.strategy] = { score: 0, count: 0 };
      }
      strategyScores[wave.strategy].score += score;
      strategyScores[wave.strategy].count++;
    }

    // Find best strategy
    let bestStrategy: WaveExecution['strategy'] = 'progressive';
    let bestScore = -1;
    
    for (const [strategy, data] of Object.entries(strategyScores)) {
      const avgScore = data.score / data.count;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestStrategy = strategy as WaveExecution['strategy'];
      }
    }

    const confidence = Math.min(0.9, similarWaves.length / 10); // Max 90% confidence
    
    return {
      recommendedStrategy: bestStrategy,
      confidence,
      reasoning: `Based on ${similarWaves.length} similar waves with average performance score of ${bestScore.toFixed(2)}`
    };
  }

  private calculateWaveEfficiency(wave: WaveExecution, executionTime: number): number {
    const baseEfficiency = 1.0;
    const complexityFactor = 1 - (wave.complexity * 0.3); // Higher complexity reduces efficiency
    const performanceFactor = (
      wave.performance.timeReduction +
      wave.performance.qualityImprovement +
      wave.performance.resourceEfficiency
    ) / 3;
    
    return baseEfficiency * complexityFactor * (1 + performanceFactor);
  }

  private calculateTrend(waves: WaveExecution[], metric: keyof WaveExecution['performance']): number {
    if (waves.length < 2) return 0;
    
    const values = waves.map(w => w.performance[metric]);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100; // Trend direction
  }

  private getDefaultStrategy(complexity: number): WaveExecution['strategy'] {
    if (complexity <= 0.3) return 'progressive';
    if (complexity <= 0.6) return 'systematic';
    if (complexity <= 0.8) return 'adaptive';
    return 'enterprise';
  }

  private addToHistory(wave: WaveExecution): void {
    this.waveHistory.push({ ...wave });
    
    // Maintain max history size
    if (this.waveHistory.length > this.maxHistorySize) {
      this.waveHistory = this.waveHistory.slice(-this.maxHistorySize);
    }
  }

  private emitEvent(type: VisualizationEvent['type'], payload: any): void {
    const event: VisualizationEvent = {
      type,
      payload,
      timestamp: new Date(),
      sessionId: 'default' // TODO: Implement proper session management
    };

    this.emit('visualization_event', event);
    this.logger.debug(`Emitted wave event: ${type}`);
  }
}