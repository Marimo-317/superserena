/**
 * WebSocket Server for Real-time Visualization Updates
 * Provides real-time updates to dashboard clients
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { Logger } from 'winston';
import { SuperClaudeVisualizationOrchestrator } from './VisualizationOrchestrator';
import { VisualizationEvent } from './types';

export class VisualizationWebSocketServer {
  private io: SocketIOServer;
  private orchestrator: SuperClaudeVisualizationOrchestrator;
  private logger: Logger;
  private connectedClients: Set<string> = new Set();

  constructor(
    server: Server,
    orchestrator: SuperClaudeVisualizationOrchestrator,
    logger: Logger
  ) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io/'
    });

    this.setupEventHandlers();
    this.setupOrchestratorEvents();
  }

  /**
   * Start the WebSocket server
   */
  public start(): void {
    this.logger.info('WebSocket server started for real-time visualization updates');
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    this.io.close();
    this.logger.info('WebSocket server stopped');
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    this.logger.debug(`Broadcasted ${event} to ${this.connectedClients.size} clients`);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, event: string, data: any): void {
    this.io.to(clientId).emit(event, data);
    this.logger.debug(`Sent ${event} to client ${clientId}`);
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);
      
      this.logger.info(`Client connected: ${clientId} (Total: ${this.connectedClients.size})`);

      // Send initial data to newly connected client
      this.sendInitialData(socket);

      // Handle client requests
      this.setupClientEventHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(clientId);
        this.logger.info(`Client disconnected: ${clientId} (Reason: ${reason}, Total: ${this.connectedClients.size})`);
      });

      // Handle client errors
      socket.on('error', (error) => {
        this.logger.error(`Socket error for client ${clientId}: ${error}`);
      });
    });

    this.io.on('error', (error) => {
      this.logger.error(`WebSocket server error: ${error}`);
    });
  }

  private setupOrchestratorEvents(): void {
    // Listen to orchestrator events and broadcast to clients
    this.orchestrator.on('visualization_event', (event: VisualizationEvent) => {
      this.broadcast('visualization_event', event);
    });

    this.orchestrator.on('orchestrator_ready', () => {
      this.broadcast('system_status', { status: 'ready', timestamp: new Date() });
    });

    this.orchestrator.on('config_updated', (config) => {
      this.broadcast('config_updated', config);
    });
  }

  private setupClientEventHandlers(socket: any): void {
    const clientId = socket.id;

    // Agent Activity Requests
    socket.on('get_active_agents', () => {
      const agents = this.orchestrator.getActiveAgents();
      socket.emit('active_agents', agents);
    });

    socket.on('get_agent_history', (data: { limit?: number }) => {
      const history = this.orchestrator.getAgentHistory(data.limit);
      socket.emit('agent_history', history);
    });

    socket.on('get_agent_statistics', () => {
      const stats = this.orchestrator.getAgentStatistics();
      socket.emit('agent_statistics', stats);
    });

    // SPARC Progress Requests
    socket.on('get_sparc_progress', (data: { sessionId?: string }) => {
      if (data.sessionId) {
        const progress = this.orchestrator.getSPARCProgress(data.sessionId);
        socket.emit('sparc_progress', { sessionId: data.sessionId, progress });
      } else {
        const allProgress = this.orchestrator.getAllSPARCProgress();
        socket.emit('sparc_progress', { all: allProgress });
      }
    });

    socket.on('get_sparc_statistics', () => {
      const stats = this.orchestrator.getSPARCStatistics();
      socket.emit('sparc_statistics', stats);
    });

    // Quality Gates Requests
    socket.on('get_quality_gates', (data: { sessionId?: string }) => {
      if (data.sessionId) {
        const gates = this.orchestrator.getQualityGates(data.sessionId);
        socket.emit('quality_gates', { sessionId: data.sessionId, gates });
      } else {
        const allGates = this.orchestrator.getAllQualityGates();
        socket.emit('quality_gates', { all: allGates });
      }
    });

    socket.on('execute_quality_gate', async (data: { sessionId: string; step: number; context?: any }) => {
      try {
        const result = await this.orchestrator.executeQualityGate(data.sessionId, data.step as any, data.context);
        socket.emit('quality_gate_result', result);
      } catch (error: any) {
        socket.emit('quality_gate_error', { error: error.message });
      }
    });

    // Wave System Requests
    socket.on('get_active_waves', () => {
      const waves = this.orchestrator.getActiveWaves();
      socket.emit('active_waves', waves);
    });

    socket.on('get_wave_statistics', () => {
      const stats = this.orchestrator.getWaveStatistics();
      socket.emit('wave_statistics', stats);
    });

    socket.on('predict_wave_strategy', (data: { complexity: number; delegationType: string }) => {
      const prediction = this.orchestrator.predictOptimalStrategy(data.complexity, data.delegationType as any);
      socket.emit('wave_strategy_prediction', prediction);
    });

    // Performance Metrics Requests
    socket.on('get_performance_metrics', (data: { sessionId?: string }) => {
      if (data.sessionId) {
        const metrics = this.orchestrator.getPerformanceMetrics(data.sessionId);
        socket.emit('performance_metrics', { sessionId: data.sessionId, metrics });
      } else {
        const allMetrics = this.orchestrator.getAllPerformanceMetrics();
        socket.emit('performance_metrics', { all: allMetrics });
      }
    });

    socket.on('get_performance_trends', (data: { timeWindow?: number }) => {
      const trends = this.orchestrator.getPerformanceTrends(data.timeWindow);
      socket.emit('performance_trends', trends);
    });

    socket.on('get_token_optimization_stats', () => {
      const stats = this.orchestrator.getTokenOptimizationStats();
      socket.emit('token_optimization_stats', stats);
    });

    socket.on('get_resource_utilization', () => {
      const utilization = this.orchestrator.getResourceUtilization();
      socket.emit('resource_utilization', utilization);
    });

    // Memory Persistence Requests
    socket.on('get_memory_states', (data: { sessionId?: string }) => {
      if (data.sessionId) {
        const state = this.orchestrator.getMemoryState(data.sessionId);
        socket.emit('memory_states', { sessionId: data.sessionId, state });
      } else {
        const allStates = this.orchestrator.getAllMemoryStates();
        socket.emit('memory_states', { all: allStates });
      }
    });

    socket.on('get_memory_statistics', () => {
      const stats = this.orchestrator.getMemoryStatistics();
      socket.emit('memory_statistics', stats);
    });

    socket.on('get_memory_optimization', () => {
      const optimization = this.orchestrator.getMemoryOptimization();
      socket.emit('memory_optimization', optimization);
    });

    socket.on('perform_memory_cleanup', (data: { sessionId: string; retentionDays?: number }) => {
      this.orchestrator.performMemoryCleanup(data.sessionId, data.retentionDays);
      socket.emit('memory_cleanup_initiated', { sessionId: data.sessionId });
    });

    // System Status Requests
    socket.on('get_system_status', () => {
      const status = this.orchestrator.getSystemStatus();
      socket.emit('system_status', status);
    });

    // Dashboard Configuration Requests
    socket.on('get_dashboard_config', () => {
      const config = this.orchestrator.getDashboardConfig();
      socket.emit('dashboard_config', config);
    });

    socket.on('update_dashboard_config', (newConfig: any) => {
      this.orchestrator.updateDashboardConfig(newConfig);
      socket.emit('config_update_success', { message: 'Dashboard configuration updated' });
    });

    // Demo Data Request
    socket.on('generate_demo_data', async () => {
      try {
        await this.orchestrator.generateDemoData();
        socket.emit('demo_data_generated', { message: 'Demo data generated successfully' });
      } catch (error: any) {
        socket.emit('demo_data_error', { error: error.message });
      }
    });

    // Subscription Management
    socket.on('subscribe', (data: { events: string[] }) => {
      for (const event of data.events) {
        socket.join(`subscription_${event}`);
      }
      this.logger.debug(`Client ${clientId} subscribed to events: ${data.events.join(', ')}`);
    });

    socket.on('unsubscribe', (data: { events: string[] }) => {
      for (const event of data.events) {
        socket.leave(`subscription_${event}`);
      }
      this.logger.debug(`Client ${clientId} unsubscribed from events: ${data.events.join(', ')}`);
    });

    // Ping/Pong for connection health
    socket.on('ping', (data: any) => {
      socket.emit('pong', { ...data, serverTimestamp: Date.now() });
    });
  }

  private sendInitialData(socket: any): void {
    // Send current system status
    const systemStatus = this.orchestrator.getSystemStatus();
    socket.emit('system_status', systemStatus);

    // Send dashboard config
    const config = this.orchestrator.getDashboardConfig();
    socket.emit('dashboard_config', config);

    // Send current data summaries
    const activeAgents = this.orchestrator.getActiveAgents();
    socket.emit('active_agents', activeAgents);

    const activeWaves = this.orchestrator.getActiveWaves();
    socket.emit('active_waves', activeWaves);

    const allSPARCProgress = this.orchestrator.getAllSPARCProgress();
    socket.emit('sparc_progress', { all: allSPARCProgress });

    const performanceMetrics = this.orchestrator.getAllPerformanceMetrics();
    socket.emit('performance_metrics', { all: performanceMetrics });

    const memoryStates = this.orchestrator.getAllMemoryStates();
    socket.emit('memory_states', { all: memoryStates });

    this.logger.debug(`Sent initial data to client ${socket.id}`);
  }

  /**
   * Broadcast periodic updates
   */
  public startPeriodicUpdates(intervalMs: number = 5000): void {
    setInterval(() => {
      if (this.connectedClients.size > 0) {
        // Broadcast system status
        const systemStatus = this.orchestrator.getSystemStatus();
        this.broadcast('system_status_update', systemStatus);

        // Broadcast resource utilization
        const resourceUtilization = this.orchestrator.getResourceUtilization();
        this.broadcast('resource_utilization_update', resourceUtilization);

        // Broadcast active agents count
        const activeAgents = this.orchestrator.getActiveAgents();
        this.broadcast('active_agents_count', { count: activeAgents.length });
      }
    }, intervalMs);

    this.logger.info(`Started periodic updates every ${intervalMs}ms`);
  }

  /**
   * Get WebSocket server statistics
   */
  public getServerStatistics(): Record<string, any> {
    return {
      connectedClients: this.connectedClients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      serverStartTime: new Date().toISOString()
    };
  }
}