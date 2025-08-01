/**
 * Memory Persistence Viewer
 * Monitors and visualizes memory state and persistence data
 */

import { EventEmitter } from 'events';
import { MemoryState, MemoryFile, VisualizationEvent } from '../types';
import { Logger } from 'winston';
import * as fs from 'fs';
import * as path from 'path';

export class MemoryPersistenceViewer extends EventEmitter {
  private memoryStates: Map<string, MemoryState> = new Map();
  private memoryHistory: MemoryState[] = [];
  private logger: Logger;
  private memoryBasePath: string;
  private maxHistorySize: number;

  constructor(logger: Logger, memoryBasePath: string = './.serena/memories', maxHistorySize: number = 100) {
    super();
    this.logger = logger;
    this.memoryBasePath = memoryBasePath;
    this.maxHistorySize = maxHistorySize;
    
    this.ensureMemoryDirectory();
  }

  /**
   * Initialize memory tracking for a session
   */
  public initializeMemoryState(sessionId: string): void {
    const memoryState: MemoryState = {
      sessionId,
      contextRetention: 0,
      crossSessionData: [],
      memoryFiles: [],
      totalSize: 0,
      lastCleanup: new Date()
    };

    this.memoryStates.set(sessionId, memoryState);
    this.scanMemoryFiles(sessionId);
    
    this.logger.info(`Memory state initialized for session: ${sessionId}`);
    this.emitEvent('memory_update', memoryState);
  }

  /**
   * Update context retention percentage
   */
  public updateContextRetention(sessionId: string, retention: number): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to update context retention for non-existent session: ${sessionId}`);
      return;
    }

    memoryState.contextRetention = Math.min(100, Math.max(0, retention));
    this.memoryStates.set(sessionId, memoryState);

    this.logger.debug(`Context retention updated: ${sessionId} - ${retention}%`);
  }

  /**
   * Add cross-session data
   */
  public addCrossSessionData(sessionId: string, data: string): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to add cross-session data for non-existent session: ${sessionId}`);
      return;
    }

    if (!memoryState.crossSessionData.includes(data)) {
      memoryState.crossSessionData.push(data);
      this.memoryStates.set(sessionId, memoryState);
      
      this.logger.debug(`Cross-session data added: ${sessionId} - ${data}`);
      this.emitEvent('memory_update', memoryState);
    }
  }

  /**
   * Update memory file information
   */
  public updateMemoryFile(
    sessionId: string,
    filename: string,
    size: number,
    type: MemoryFile['type'] = 'session',
    relevanceScore: number = 1.0
  ): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to update memory file for non-existent session: ${sessionId}`);
      return;
    }

    const existingFileIndex = memoryState.memoryFiles.findIndex(f => f.name === filename);
    const memoryFile: MemoryFile = {
      name: filename,
      size,
      lastAccessed: new Date(),
      relevanceScore: Math.min(1, Math.max(0, relevanceScore)),
      type
    };

    if (existingFileIndex >= 0) {
      memoryState.memoryFiles[existingFileIndex] = memoryFile;
    } else {
      memoryState.memoryFiles.push(memoryFile);
    }

    // Recalculate total size
    memoryState.totalSize = memoryState.memoryFiles.reduce((sum, file) => sum + file.size, 0);
    this.memoryStates.set(sessionId, memoryState);

    this.logger.debug(`Memory file updated: ${sessionId} - ${filename} (${size} bytes)`);
  }

  /**
   * Remove memory file
   */
  public removeMemoryFile(sessionId: string, filename: string): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to remove memory file for non-existent session: ${sessionId}`);
      return;
    }

    const fileIndex = memoryState.memoryFiles.findIndex(f => f.name === filename);
    if (fileIndex >= 0) {
      memoryState.memoryFiles.splice(fileIndex, 1);
      memoryState.totalSize = memoryState.memoryFiles.reduce((sum, file) => sum + file.size, 0);
      this.memoryStates.set(sessionId, memoryState);

      this.logger.debug(`Memory file removed: ${sessionId} - ${filename}`);
      this.emitEvent('memory_update', memoryState);
    }
  }

  /**
   * Perform memory cleanup
   */
  public performMemoryCleanup(sessionId: string, retentionDays: number = 7): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to cleanup memory for non-existent session: ${sessionId}`);
      return;
    }

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const filesToRemove: string[] = [];
    
    // Find old files with low relevance scores
    for (const file of memoryState.memoryFiles) {
      if (file.lastAccessed < cutoffDate && file.relevanceScore < 0.3) {
        filesToRemove.push(file.name);
      }
    }

    // Remove identified files
    for (const filename of filesToRemove) {
      this.removeMemoryFile(sessionId, filename);
    }

    memoryState.lastCleanup = new Date();
    this.memoryStates.set(sessionId, memoryState);

    this.logger.info(`Memory cleanup completed: ${sessionId} - Removed ${filesToRemove.length} files`);
    this.emitEvent('memory_update', memoryState);
  }

  /**
   * Get memory state for a session
   */
  public getMemoryState(sessionId: string): MemoryState | undefined {
    return this.memoryStates.get(sessionId);
  }

  /**
   * Get all active memory states
   */
  public getActiveMemoryStates(): MemoryState[] {
    return Array.from(this.memoryStates.values());
  }

  /**
   * Get memory history
   */
  public getMemoryHistory(limit?: number): MemoryState[] {
    return limit ? this.memoryHistory.slice(-limit) : this.memoryHistory;
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryUsageStatistics(): Record<string, any> {
    const activeStates = this.getActiveMemoryStates();
    const allStates = [...this.memoryHistory, ...activeStates];

    if (allStates.length === 0) {
      return {
        totalSessions: 0,
        totalMemoryUsage: 0,
        averageContextRetention: 0,
        fileTypeDistribution: {},
        memoryEfficiency: 0
      };
    }

    const stats = {
      totalSessions: allStates.length,
      activeSessions: activeStates.length,
      totalMemoryUsage: 0,
      averageContextRetention: 0,
      fileTypeDistribution: {} as Record<string, number>,
      memoryEfficiency: 0,
      largestSessions: [] as Array<{ sessionId: string; size: number; files: number }>,
      oldestFiles: [] as Array<{ name: string; age: number; sessionId: string }>
    };

    let totalRetention = 0;
    let totalFiles = 0;
    const fileSizes: number[] = [];
    const sessionSizes: Array<{ sessionId: string; size: number; files: number }> = [];

    for (const state of allStates) {
      stats.totalMemoryUsage += state.totalSize;
      totalRetention += state.contextRetention;
      totalFiles += state.memoryFiles.length;

      sessionSizes.push({
        sessionId: state.sessionId,
        size: state.totalSize,
        files: state.memoryFiles.length
      });

      // Count file types
      for (const file of state.memoryFiles) {
        stats.fileTypeDistribution[file.type] = (stats.fileTypeDistribution[file.type] || 0) + 1;
        fileSizes.push(file.size);

        // Track oldest files
        const age = Date.now() - file.lastAccessed.getTime();
        stats.oldestFiles.push({
          name: file.name,
          age,
          sessionId: state.sessionId
        });
      }
    }

    // Calculate averages
    stats.averageContextRetention = Math.round(totalRetention / allStates.length);
    
    // Memory efficiency (higher retention with less memory usage is more efficient)
    const avgMemoryPerSession = stats.totalMemoryUsage / allStates.length;
    stats.memoryEfficiency = stats.averageContextRetention / (avgMemoryPerSession / 1024); // Normalize by KB

    // Top largest sessions
    stats.largestSessions = sessionSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Oldest files
    stats.oldestFiles = stats.oldestFiles
      .sort((a, b) => b.age - a.age)
      .slice(0, 10);

    return stats;
  }

  /**
   * Get memory trends
   */
  public getMemoryTrends(timeWindowHours: number = 24): Record<string, any> {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const recentStates = this.memoryHistory.filter(state => 
      state.lastCleanup >= cutoffTime
    );

    if (recentStates.length === 0) {
      return {
        timeWindow: timeWindowHours,
        totalSessions: 0,
        trends: {}
      };
    }

    const trends = {
      timeWindow: timeWindowHours,
      totalSessions: recentStates.length,
      trends: {
        contextRetention: this.calculateTrend(recentStates.map(s => s.contextRetention)),
        memoryUsage: this.calculateTrend(recentStates.map(s => s.totalSize)),
        fileCount: this.calculateTrend(recentStates.map(s => s.memoryFiles.length))
      },
      memoryGrowthRate: this.calculateMemoryGrowthRate(recentStates),
      retentionEfficiency: this.calculateRetentionEfficiency(recentStates)
    };

    return trends;
  }

  /**
   * Analyze memory optimization opportunities
   */
  public analyzeOptimizationOpportunities(): Record<string, any> {
    const activeStates = this.getActiveMemoryStates();
    const opportunities = {
      totalSavingsPotential: 0,
      recommendations: [] as string[],
      lowRelevanceFiles: [] as Array<{ sessionId: string; filename: string; size: number; relevance: number }>,
      oldFiles: [] as Array<{ sessionId: string; filename: string; age: number; size: number }>,
      duplicateData: [] as Array<{ data: string; sessions: string[] }>
    };

    const dataOccurrences: Record<string, string[]> = {};

    for (const state of activeStates) {
      // Find low relevance files
      for (const file of state.memoryFiles) {
        if (file.relevanceScore < 0.3) {
          opportunities.lowRelevanceFiles.push({
            sessionId: state.sessionId,
            filename: file.name,
            size: file.size,
            relevance: file.relevanceScore
          });
          opportunities.totalSavingsPotential += file.size;
        }

        // Find old files
        const age = Date.now() - file.lastAccessed.getTime();
        const ageDays = age / (24 * 60 * 60 * 1000);
        if (ageDays > 7) {
          opportunities.oldFiles.push({
            sessionId: state.sessionId,
            filename: file.name,
            age: ageDays,
            size: file.size
          });
        }
      }

      // Find duplicate cross-session data
      for (const data of state.crossSessionData) {
        if (!dataOccurrences[data]) {
          dataOccurrences[data] = [];
        }
        dataOccurrences[data].push(state.sessionId);
      }
    }

    // Identify duplicates
    for (const [data, sessions] of Object.entries(dataOccurrences)) {
      if (sessions.length > 1) {
        opportunities.duplicateData.push({ data, sessions });
      }
    }

    // Generate recommendations
    if (opportunities.lowRelevanceFiles.length > 0) {
      opportunities.recommendations.push(`Remove ${opportunities.lowRelevanceFiles.length} low-relevance files to save ${Math.round(opportunities.totalSavingsPotential / 1024)} KB`);
    }

    if (opportunities.oldFiles.length > 0) {
      opportunities.recommendations.push(`Archive or remove ${opportunities.oldFiles.length} old files`);
    }

    if (opportunities.duplicateData.length > 0) {
      opportunities.recommendations.push(`Deduplicate ${opportunities.duplicateData.length} cross-session data entries`);
    }

    if (opportunities.recommendations.length === 0) {
      opportunities.recommendations.push('Memory usage is already optimized');
    }

    return opportunities;
  }

  /**
   * Complete session and move to history
   */
  public completeSession(sessionId: string): void {
    const memoryState = this.memoryStates.get(sessionId);
    if (!memoryState) {
      this.logger.warn(`Attempted to complete non-existent memory session: ${sessionId}`);
      return;
    }

    this.addToHistory(memoryState);
    this.memoryStates.delete(sessionId);

    this.logger.info(`Memory session completed: ${sessionId} - Total size: ${memoryState.totalSize} bytes`);
  }

  private scanMemoryFiles(sessionId: string): void {
    const sessionPath = path.join(this.memoryBasePath, sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      return;
    }

    try {
      const files = fs.readdirSync(sessionPath);
      
      for (const filename of files) {
        const filePath = path.join(sessionPath, filename);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          this.updateMemoryFile(
            sessionId,
            filename,
            stats.size,
            'persistent',
            this.calculateFileRelevance(filename, stats)
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error scanning memory files for session ${sessionId}: ${error}`);
    }
  }

  private calculateFileRelevance(filename: string, stats: fs.Stats): number {
    const age = Date.now() - stats.mtime.getTime();
    const ageDays = age / (24 * 60 * 60 * 1000);
    
    // Base relevance decreases with age
    let relevance = Math.max(0.1, 1 - (ageDays / 30)); // Decrease over 30 days
    
    // Adjust based on file type
    if (filename.endsWith('.json')) relevance += 0.2;
    if (filename.includes('session')) relevance += 0.1;
    if (filename.includes('cache')) relevance -= 0.2;
    
    return Math.min(1, Math.max(0, relevance));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return Math.round((secondAvg - firstAvg) * 100) / 100;
  }

  private calculateMemoryGrowthRate(states: MemoryState[]): number {
    if (states.length < 2) return 0;
    
    const sortedStates = states.sort((a, b) => a.lastCleanup.getTime() - b.lastCleanup.getTime());
    const first = sortedStates[0];
    const last = sortedStates[sortedStates.length - 1];
    
    const timeDiff = last.lastCleanup.getTime() - first.lastCleanup.getTime();
    const sizeDiff = last.totalSize - first.totalSize;
    
    if (timeDiff === 0) return 0;
    
    // Growth rate in bytes per hour
    return Math.round((sizeDiff / timeDiff) * (60 * 60 * 1000));
  }

  private calculateRetentionEfficiency(states: MemoryState[]): number {
    if (states.length === 0) return 0;
    
    const totalRetention = states.reduce((sum, state) => sum + state.contextRetention, 0);
    const totalSize = states.reduce((sum, state) => sum + state.totalSize, 0);
    const avgRetention = totalRetention / states.length;
    const avgSize = totalSize / states.length;
    
    // Efficiency: retention per KB
    return avgSize > 0 ? Math.round((avgRetention / (avgSize / 1024)) * 100) / 100 : 0;
  }

  private ensureMemoryDirectory(): void {
    if (!fs.existsSync(this.memoryBasePath)) {
      try {
        fs.mkdirSync(this.memoryBasePath, { recursive: true });
        this.logger.info(`Created memory directory: ${this.memoryBasePath}`);
      } catch (error) {
        this.logger.error(`Failed to create memory directory: ${error}`);
      }
    }
  }

  private addToHistory(memoryState: MemoryState): void {
    this.memoryHistory.push({ ...memoryState });
    
    // Maintain max history size
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }
  }

  private emitEvent(type: VisualizationEvent['type'], payload: any): void {
    const event: VisualizationEvent = {
      type,
      payload,
      timestamp: new Date(),
      sessionId: payload.sessionId || 'default'
    };

    this.emit('visualization_event', event);
    this.logger.debug(`Emitted memory event: ${type}`);
  }
}