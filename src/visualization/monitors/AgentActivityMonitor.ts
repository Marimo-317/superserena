/**
 * Multi-Agent Activity Monitor
 * Tracks and manages multiple AI agent activities in real-time
 */

import { EventEmitter } from 'events';
import { AgentActivity, VisualizationEvent, SystemStatus } from '../types';
import { Logger } from 'winston';

export class AgentActivityMonitor extends EventEmitter {
  private activeAgents: Map<string, AgentActivity> = new Map();
  private activityHistory: AgentActivity[] = [];
  private logger: Logger;
  private maxHistorySize: number;

  constructor(logger: Logger, maxHistorySize: number = 1000) {
    super();
    this.logger = logger;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Start monitoring a new agent
   */
  public startAgent(
    agentId: string,
    agentType: AgentActivity['agentType'],
    task: string,
    estimatedDuration: number = 60000 // Default 1 minute
  ): void {
    const activity: AgentActivity = {
      agentId,
      agentType,
      status: 'active',
      currentTask: task,
      progress: 0,
      startTime: new Date(),
      estimatedCompletion: new Date(Date.now() + estimatedDuration),
      tokenUsage: 0
    };

    this.activeAgents.set(agentId, activity);
    this.logger.info(`Agent started: ${agentId} (${agentType}) - ${task}`);

    this.emitEvent('agent_start', activity);
  }

  /**
   * Update agent progress
   */
  public updateAgentProgress(
    agentId: string,
    progress: number,
    tokenUsage?: number,
    newTask?: string
  ): void {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to update non-existent agent: ${agentId}`);
      return;
    }

    agent.progress = Math.min(100, Math.max(0, progress));
    if (tokenUsage !== undefined) {
      agent.tokenUsage = tokenUsage;
    }
    if (newTask) {
      agent.currentTask = newTask;
    }

    // Recalculate estimated completion based on progress
    if (agent.progress > 0) {
      const elapsed = Date.now() - agent.startTime.getTime();
      const estimatedTotal = elapsed / (agent.progress / 100);
      agent.estimatedCompletion = new Date(agent.startTime.getTime() + estimatedTotal);
    }

    this.activeAgents.set(agentId, agent);
    this.logger.debug(`Agent progress updated: ${agentId} - ${progress}%`);
  }

  /**
   * Complete agent task
   */
  public completeAgent(agentId: string, finalTokenUsage?: number): void {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to complete non-existent agent: ${agentId}`);
      return;
    }

    agent.status = 'completed';
    agent.progress = 100;
    if (finalTokenUsage !== undefined) {
      agent.tokenUsage = finalTokenUsage;
    }

    // Move to history
    this.addToHistory(agent);
    this.activeAgents.delete(agentId);

    this.logger.info(`Agent completed: ${agentId} - ${agent.tokenUsage} tokens`);
    this.emitEvent('agent_complete', agent);
  }

  /**
   * Mark agent as failed
   */
  public failAgent(agentId: string, error: string): void {
    const agent = this.activeAgents.get(agentId);
    if (!agent) {
      this.logger.warn(`Attempted to fail non-existent agent: ${agentId}`);
      return;
    }

    agent.status = 'error';
    agent.currentTask = `ERROR: ${error}`;

    this.addToHistory(agent);
    this.activeAgents.delete(agentId);

    this.logger.error(`Agent failed: ${agentId} - ${error}`);
    this.emitEvent('agent_complete', agent);
  }

  /**
   * Get all active agents
   */
  public getActiveAgents(): AgentActivity[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Get agent activity history
   */
  public getActivityHistory(limit?: number): AgentActivity[] {
    const history = this.activityHistory.slice();
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get system status summary
   */
  public getSystemStatus(): SystemStatus {
    const activeAgents = this.getActiveAgents();
    const totalTokenUsage = activeAgents.reduce((sum, agent) => sum + agent.tokenUsage, 0);
    
    // Determine system health based on active agents and performance
    let systemHealth: SystemStatus['systemHealth'] = 'healthy';
    const alerts: SystemStatus['alerts'] = [];

    if (activeAgents.length > 10) {
      systemHealth = 'warning';
      alerts.push({
        id: 'high-agent-count',
        level: 'warning',
        message: `High number of active agents: ${activeAgents.length}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    if (totalTokenUsage > 100000) {
      systemHealth = 'warning';
      alerts.push({
        id: 'high-token-usage',
        level: 'warning',
        message: `High token usage: ${totalTokenUsage}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    return {
      timestamp: new Date(),
      uptime: process.uptime() * 1000,
      activeAgents: activeAgents.length,
      totalSessions: this.activityHistory.length + activeAgents.length,
      systemHealth,
      alerts
    };
  }

  /**
   * Get agent statistics
   */
  public getAgentStatistics(): Record<string, any> {
    const history = this.getActivityHistory();
    const stats: Record<string, any> = {
      totalAgents: history.length,
      byType: {},
      byStatus: { completed: 0, error: 0 },
      averageTokenUsage: 0,
      averageExecutionTime: 0
    };

    let totalTokens = 0;
    let totalTime = 0;
    let completedCount = 0;

    for (const agent of history) {
      // Count by type
      stats.byType[agent.agentType] = (stats.byType[agent.agentType] || 0) + 1;
      
      // Count by status
      stats.byStatus[agent.status] = (stats.byStatus[agent.status] || 0) + 1;
      
      // Calculate averages for completed agents
      if (agent.status === 'completed') {
        totalTokens += agent.tokenUsage;
        totalTime += (agent.estimatedCompletion.getTime() - agent.startTime.getTime());
        completedCount++;
      }
    }

    if (completedCount > 0) {
      stats.averageTokenUsage = Math.round(totalTokens / completedCount);
      stats.averageExecutionTime = Math.round(totalTime / completedCount);
    }

    return stats;
  }

  private addToHistory(agent: AgentActivity): void {
    this.activityHistory.push({ ...agent });
    
    // Maintain max history size
    if (this.activityHistory.length > this.maxHistorySize) {
      this.activityHistory = this.activityHistory.slice(-this.maxHistorySize);
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
    this.logger.debug(`Emitted event: ${type}`);
  }
}