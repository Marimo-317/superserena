/**
 * SuperClaude WebSocket Server
 * Real-time communication for dashboard updates
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { ExecutionTracker } from './ExecutionTracker';
import { WSEvents } from '../types/monitoring';

export class SuperClaudeWebSocketServer {
  private io: SocketIOServer;
  private tracker: ExecutionTracker;
  private connectedClients: Set<string> = new Set();

  constructor(httpServer: HTTPServer, tracker: ExecutionTracker) {
    this.tracker = tracker;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Configure based on your needs
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupTrackerListeners();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send current session state to new client
      this.sendCurrentState(socket);

      // Handle client requests
      socket.on('get-current-session', () => {
        const currentSession = this.tracker.getCurrentSession();
        socket.emit('current-session', currentSession);
      });

      socket.on('get-session-history', () => {
        const history = this.tracker.getSessionHistory();
        socket.emit('session-history', history);
      });

      socket.on('get-statistics', () => {
        const stats = this.tracker.getStatistics();
        socket.emit('statistics', stats);
      });

      socket.on('get-session', (sessionId: string) => {
        const session = this.tracker.getSession(sessionId);
        socket.emit('session-data', { sessionId, session });
      });

      // Handle client disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle client errors
      socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
      });
    });
  }

  private setupTrackerListeners(): void {
    // Session events
    this.tracker.on('session-start', (session) => {
      this.broadcast('session-start', session);
    });

    this.tracker.on('session-update', (update) => {
      this.broadcast('session-update', update);
    });

    this.tracker.on('session-end', (session) => {
      this.broadcast('session-end', session);
    });

    // Agent events
    this.tracker.on('agent-update', (agent) => {
      this.broadcast('agent-update', agent);
    });

    // SPARC events
    this.tracker.on('sparc-update', (phase) => {
      this.broadcast('sparc-update', phase);
    });

    // Quality gate events
    this.tracker.on('quality-gate', (gate) => {
      this.broadcast('quality-gate', gate);
    });

    // Wave events
    this.tracker.on('wave-update', (wave) => {
      this.broadcast('wave-update', wave);
    });

    // Performance events
    this.tracker.on('performance-update', (performance) => {
      this.broadcast('performance-update', performance);
    });

    // Memory events
    this.tracker.on('memory-update', (memory) => {
      this.broadcast('memory-update', memory);
    });

    // Error events
    this.tracker.on('error', (error) => {
      this.broadcast('error', {
        message: error.message || 'Unknown error',
        timestamp: new Date()
      });
    });
  }

  private broadcast<K extends keyof WSEvents>(event: K, data: WSEvents[K]): void {
    console.log(`Broadcasting ${event} to ${this.connectedClients.size} clients`);
    this.io.emit(event, data);
  }

  private sendCurrentState(socket: Socket): void {
    const currentSession = this.tracker.getCurrentSession();
    const history = this.tracker.getSessionHistory();
    const stats = this.tracker.getStatistics();

    socket.emit('initial-state', {
      currentSession,
      history: history.slice(-10), // Send last 10 sessions
      statistics: stats,
      timestamp: new Date()
    });
  }

  /**
   * Get connected client count
   */
  public getConnectedClients(): number {
    return this.connectedClients.size;
  }

  /**
   * Send message to specific client
   */
  public sendToClient<K extends keyof WSEvents>(clientId: string, event: K, data: WSEvents[K]): boolean {
    const socket = this.io.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Get server information
   */
  public getServerInfo() {
    return {
      connectedClients: this.connectedClients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      eventNames: this.io.eventNames()
    };
  }

  /**
   * Shutdown server gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');
    
    // Notify all clients about shutdown
    this.broadcast('error', {
      message: 'Server shutting down',
      timestamp: new Date()
    });

    // Close all connections
    this.io.close();
    
    console.log('WebSocket server shut down successfully');
  }
}