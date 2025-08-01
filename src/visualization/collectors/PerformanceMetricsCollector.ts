/**
 * Performance & Token Optimization Metrics Collector
 * Tracks system performance and token usage optimization
 */

import { EventEmitter } from 'events';
import { PerformanceMetrics, TokenOptimization, VisualizationEvent } from '../types';
import { Logger } from 'winston';

export class PerformanceMetricsCollector extends EventEmitter {
  private sessionMetrics: Map<string, PerformanceMetrics> = new Map();
  private tokenOptimizations: TokenOptimization[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private logger: Logger;
  private startTime: number;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Initialize performance tracking for a session
   */
  public initializeSession(sessionId: string): void {
    const metrics: PerformanceMetrics = {
      sessionId,
      tokenOptimization: {
        original: 0,
        optimized: 0,
        reduction: 0,
        technique: 'compression',
        timestamp: new Date()
      },
      executionTime: {
        total: 0,
        phases: {}
      },
      qualityMetrics: {
        codeQuality: 0,
        testCoverage: 0,
        securityScore: 0
      },
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0
      }
    };

    this.sessionMetrics.set(sessionId, metrics);
    this.logger.info(`Performance tracking initialized for session: ${sessionId}`);
  }

  /**
   * Record token optimization
   */
  public recordTokenOptimization(
    sessionId: string,
    original: number,
    optimized: number,
    technique: TokenOptimization['technique']
  ): void {
    const reduction = original > 0 ? ((original - optimized) / original) * 100 : 0;
    
    const optimization: TokenOptimization = {
      original,
      optimized,
      reduction,
      technique,
      timestamp: new Date()
    };

    this.tokenOptimizations.push(optimization);

    // Update session metrics
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (sessionMetrics) {
      sessionMetrics.tokenOptimization = optimization;
      this.sessionMetrics.set(sessionId, sessionMetrics);
    }

    this.logger.info(`Token optimization recorded: ${reduction.toFixed(1)}% reduction (${technique})`);
    this.emitEvent('token_optimization', optimization);
  }

  /**
   * Update execution time for a phase
   */
  public updateExecutionTime(sessionId: string, phase: string, duration: number): void {
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (!sessionMetrics) {
      this.logger.warn(`Attempted to update execution time for non-existent session: ${sessionId}`);
      return;
    }

    sessionMetrics.executionTime.phases[phase] = duration;
    sessionMetrics.executionTime.total = Object.values(sessionMetrics.executionTime.phases)
      .reduce((sum, time) => sum + time, 0);

    this.sessionMetrics.set(sessionId, sessionMetrics);
    this.logger.debug(`Execution time updated: ${sessionId} - ${phase}: ${duration}ms`);
  }

  /**
   * Update quality metrics
   */
  public updateQualityMetrics(
    sessionId: string,
    codeQuality?: number,
    testCoverage?: number,
    securityScore?: number
  ): void {
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (!sessionMetrics) {
      this.logger.warn(`Attempted to update quality metrics for non-existent session: ${sessionId}`);
      return;
    }

    if (codeQuality !== undefined) {
      sessionMetrics.qualityMetrics.codeQuality = Math.min(100, Math.max(0, codeQuality));
    }
    if (testCoverage !== undefined) {
      sessionMetrics.qualityMetrics.testCoverage = Math.min(100, Math.max(0, testCoverage));
    }
    if (securityScore !== undefined) {
      sessionMetrics.qualityMetrics.securityScore = Math.min(100, Math.max(0, securityScore));
    }

    this.sessionMetrics.set(sessionId, sessionMetrics);
    this.logger.debug(`Quality metrics updated: ${sessionId}`);
  }

  /**
   * Update resource utilization
   */
  public updateResourceUtilization(sessionId: string, cpu?: number, memory?: number, network?: number): void {
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (!sessionMetrics) {
      this.logger.warn(`Attempted to update resource utilization for non-existent session: ${sessionId}`);
      return;
    }

    if (cpu !== undefined) {
      sessionMetrics.resourceUtilization.cpu = Math.min(100, Math.max(0, cpu));
    }
    if (memory !== undefined) {
      sessionMetrics.resourceUtilization.memory = Math.min(100, Math.max(0, memory));
    }
    if (network !== undefined) {
      sessionMetrics.resourceUtilization.network = Math.min(100, Math.max(0, network));
    }

    this.sessionMetrics.set(sessionId, sessionMetrics);
  }

  /**
   * Complete session and move to history
   */
  public completeSession(sessionId: string): void {
    const sessionMetrics = this.sessionMetrics.get(sessionId);
    if (!sessionMetrics) {
      this.logger.warn(`Attempted to complete non-existent session: ${sessionId}`);
      return;
    }

    this.performanceHistory.push({ ...sessionMetrics });
    this.sessionMetrics.delete(sessionId);

    this.logger.info(`Session completed: ${sessionId} - Total time: ${sessionMetrics.executionTime.total}ms`);
  }

  /**
   * Get active session metrics
   */
  public getActiveSessionMetrics(): PerformanceMetrics[] {
    return Array.from(this.sessionMetrics.values());
  }

  /**
   * Get session metrics by ID
   */
  public getSessionMetrics(sessionId: string): PerformanceMetrics | undefined {
    return this.sessionMetrics.get(sessionId);
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    return limit ? this.performanceHistory.slice(-limit) : this.performanceHistory;
  }

  /**
   * Get token optimization statistics
   */
  public getTokenOptimizationStats(): Record<string, any> {
    if (this.tokenOptimizations.length === 0) {
      return {
        totalOptimizations: 0,
        averageReduction: 0,
        totalTokensSaved: 0,
        byTechnique: {}
      };
    }

    const stats = {
      totalOptimizations: this.tokenOptimizations.length,
      averageReduction: 0,
      totalTokensSaved: 0,
      byTechnique: {} as Record<string, any>,
      recentTrend: this.getTokenOptimizationTrend()
    };

    let totalReduction = 0;
    let totalSaved = 0;
    const techniqueStats: Record<string, { count: number; totalReduction: number; totalSaved: number }> = {};

    for (const opt of this.tokenOptimizations) {
      totalReduction += opt.reduction;
      totalSaved += (opt.original - opt.optimized);

      if (!techniqueStats[opt.technique]) {
        techniqueStats[opt.technique] = { count: 0, totalReduction: 0, totalSaved: 0 };
      }
      techniqueStats[opt.technique].count++;
      techniqueStats[opt.technique].totalReduction += opt.reduction;
      techniqueStats[opt.technique].totalSaved += (opt.original - opt.optimized);
    }

    stats.averageReduction = Math.round((totalReduction / this.tokenOptimizations.length) * 100) / 100;
    stats.totalTokensSaved = totalSaved;

    // Calculate per-technique stats
    for (const [technique, data] of Object.entries(techniqueStats)) {
      stats.byTechnique[technique] = {
        count: data.count,
        averageReduction: Math.round((data.totalReduction / data.count) * 100) / 100,
        totalSaved: data.totalSaved
      };
    }

    return stats;
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(timeWindowHours: number = 24): Record<string, any> {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const recentMetrics = this.performanceHistory.filter(metric => 
      metric.tokenOptimization.timestamp >= cutoffTime
    );

    if (recentMetrics.length === 0) {
      return {
        timeWindow: timeWindowHours,
        totalSessions: 0,
        trends: {}
      };
    }

    const trends = {
      timeWindow: timeWindowHours,
      totalSessions: recentMetrics.length,
      trends: {
        codeQuality: this.calculateMetricTrend(recentMetrics, 'codeQuality'),
        testCoverage: this.calculateMetricTrend(recentMetrics, 'testCoverage'),
        securityScore: this.calculateMetricTrend(recentMetrics, 'securityScore'),
        executionTime: this.calculateExecutionTimeTrend(recentMetrics),
        tokenOptimization: this.calculateTokenOptimizationTrend(recentMetrics)
      },
      averages: {
        codeQuality: Math.round(recentMetrics.reduce((sum, m) => sum + m.qualityMetrics.codeQuality, 0) / recentMetrics.length),
        testCoverage: Math.round(recentMetrics.reduce((sum, m) => sum + m.qualityMetrics.testCoverage, 0) / recentMetrics.length),
        securityScore: Math.round(recentMetrics.reduce((sum, m) => sum + m.qualityMetrics.securityScore, 0) / recentMetrics.length),
        executionTime: Math.round(recentMetrics.reduce((sum, m) => sum + m.executionTime.total, 0) / recentMetrics.length),
        tokenReduction: Math.round(recentMetrics.reduce((sum, m) => sum + m.tokenOptimization.reduction, 0) / recentMetrics.length * 100) / 100
      }
    };

    return trends;
  }

  /**
   * Get system resource utilization summary
   */
  public getResourceUtilizationSummary(): Record<string, any> {
    const activeMetrics = this.getActiveSessionMetrics();
    
    if (activeMetrics.length === 0) {
      return {
        currentUtilization: { cpu: 0, memory: 0, network: 0 },
        peakUtilization: { cpu: 0, memory: 0, network: 0 },
        averageUtilization: { cpu: 0, memory: 0, network: 0 }
      };
    }

    const current = {
      cpu: Math.round(activeMetrics.reduce((sum, m) => sum + m.resourceUtilization.cpu, 0) / activeMetrics.length),
      memory: Math.round(activeMetrics.reduce((sum, m) => sum + m.resourceUtilization.memory, 0) / activeMetrics.length),
      network: Math.round(activeMetrics.reduce((sum, m) => sum + m.resourceUtilization.network, 0) / activeMetrics.length)
    };

    // Calculate peak and average from history
    const allMetrics = [...this.performanceHistory, ...activeMetrics];
    const peak = { cpu: 0, memory: 0, network: 0 };
    let totalCpu = 0, totalMemory = 0, totalNetwork = 0;

    for (const metric of allMetrics) {
      peak.cpu = Math.max(peak.cpu, metric.resourceUtilization.cpu);
      peak.memory = Math.max(peak.memory, metric.resourceUtilization.memory);
      peak.network = Math.max(peak.network, metric.resourceUtilization.network);
      
      totalCpu += metric.resourceUtilization.cpu;
      totalMemory += metric.resourceUtilization.memory;
      totalNetwork += metric.resourceUtilization.network;
    }

    const average = {
      cpu: Math.round(totalCpu / allMetrics.length),
      memory: Math.round(totalMemory / allMetrics.length),
      network: Math.round(totalNetwork / allMetrics.length)
    };

    return {
      currentUtilization: current,
      peakUtilization: peak,
      averageUtilization: average,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get performance benchmarks
   */
  public getPerformanceBenchmarks(): Record<string, any> {
    const allMetrics = [...this.performanceHistory, ...this.getActiveSessionMetrics()];
    
    if (allMetrics.length === 0) {
      return { benchmarks: {}, recommendations: [] };
    }

    const benchmarks = {
      codeQuality: {
        excellent: 90,
        good: 80,
        acceptable: 70,
        current: Math.round(allMetrics.reduce((sum, m) => sum + m.qualityMetrics.codeQuality, 0) / allMetrics.length)
      },
      testCoverage: {
        excellent: 90,
        good: 80,
        acceptable: 70,
        current: Math.round(allMetrics.reduce((sum, m) => sum + m.qualityMetrics.testCoverage, 0) / allMetrics.length)
      },
      tokenOptimization: {
        excellent: 80,
        good: 60,
        acceptable: 40,
        current: Math.round(allMetrics.reduce((sum, m) => sum + m.tokenOptimization.reduction, 0) / allMetrics.length * 100) / 100
      }
    };

    const recommendations = this.generatePerformanceRecommendations(benchmarks);

    return { benchmarks, recommendations };
  }

  private getTokenOptimizationTrend(): number {
    if (this.tokenOptimizations.length < 2) return 0;
    
    const recent = this.tokenOptimizations.slice(-10); // Last 10 optimizations
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, opt) => sum + opt.reduction, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, opt) => sum + opt.reduction, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100;
  }

  private calculateMetricTrend(metrics: PerformanceMetrics[], field: keyof PerformanceMetrics['qualityMetrics']): number {
    if (metrics.length < 2) return 0;
    
    const values = metrics.map(m => m.qualityMetrics[field]);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100;
  }

  private calculateExecutionTimeTrend(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const times = metrics.map(m => m.executionTime.total);
    const firstHalf = times.slice(0, Math.floor(times.length / 2));
    const secondHalf = times.slice(Math.floor(times.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
    
    return Math.round(secondAvg - firstAvg); // Difference in milliseconds
  }

  private calculateTokenOptimizationTrend(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const reductions = metrics.map(m => m.tokenOptimization.reduction);
    const firstHalf = reductions.slice(0, Math.floor(reductions.length / 2));
    const secondHalf = reductions.slice(Math.floor(reductions.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, red) => sum + red, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, red) => sum + red, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100;
  }

  private generatePerformanceRecommendations(benchmarks: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    if (benchmarks.codeQuality.current < benchmarks.codeQuality.acceptable) {
      recommendations.push('Improve code quality through better linting and code review processes');
    }
    
    if (benchmarks.testCoverage.current < benchmarks.testCoverage.acceptable) {
      recommendations.push('Increase test coverage to ensure better quality assurance');
    }
    
    if (benchmarks.tokenOptimization.current < benchmarks.tokenOptimization.acceptable) {
      recommendations.push('Implement more aggressive token optimization techniques');
    }
    
    return recommendations;
  }

  private emitEvent(type: VisualizationEvent['type'], payload: any): void {
    const event: VisualizationEvent = {
      type,
      payload,
      timestamp: new Date(),
      sessionId: 'default' // TODO: Implement proper session management
    };

    this.emit('visualization_event', event);
    this.logger.debug(`Emitted performance event: ${type}`);
  }
}