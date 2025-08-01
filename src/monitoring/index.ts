/**
 * SuperClaude Monitoring System Entry Point
 * Integrated monitoring server with dashboard
 */

import { MonitoringServer } from './MonitoringServer';
import { MonitoringConfig } from '../types/monitoring';

// Default configuration
const defaultConfig: MonitoringConfig = {
  enableRealTimeUpdates: true,
  logLevel: 'info',
  retentionDays: 30,
  maxSessionHistory: 100,
  performanceThresholds: {
    maxExecutionTime: 300000, // 5 minutes
    minTokenReduction: 30, // 30%
    minQualityScore: 80 // 80/100
  },
  alerting: {
    enableSlackNotifications: false,
    enableEmailNotifications: false
  }
};

/**
 * Start SuperClaude Monitoring Server
 */
export async function startMonitoringServer(
  port: number = 3001, 
  config?: Partial<MonitoringConfig>
): Promise<MonitoringServer> {
  const server = new MonitoringServer({ ...defaultConfig, ...config });
  
  try {
    await server.start(port);
    console.log(`
🚀 SuperClaude Monitoring System Started Successfully!

📊 Dashboard: http://localhost:${port}
🔌 WebSocket: ws://localhost:${port}
🌐 API: http://localhost:${port}/api/monitoring
⚡ Health Check: http://localhost:${port}/health

Features Available:
✅ Real-time multi-agent coordination tracking
✅ SPARC methodology progress visualization
✅ 8-step quality gates validation
✅ Wave system orchestration monitoring
✅ Performance metrics and token optimization
✅ Memory persistence visualization
✅ Session history and analytics

🎭 Try the demo: Click "Start Demo" in the dashboard
    `);
    
    return server;
  } catch (error) {
    console.error('Failed to start monitoring server:', error);
    throw error;
  }
}

/**
 * Create a monitoring server instance without starting it
 */
export function createMonitoringServer(config?: Partial<MonitoringConfig>): MonitoringServer {
  return new MonitoringServer({ ...defaultConfig, ...config });
}

// Export all components for external use
export { MonitoringServer } from './MonitoringServer';
export { ExecutionTracker } from './ExecutionTracker';
export { SuperClaudeWebSocketServer } from './WebSocketServer';
export { MonitoringAPI } from './MonitoringAPI';
export * from '../types/monitoring';

// CLI interface for direct execution
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  const logLevel = (process.env.LOG_LEVEL as any) || 'info';
  
  startMonitoringServer(port, { logLevel })
    .then((server) => {
      // Graceful shutdown handlers
      process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await server.stop();
        process.exit(0);
      });
      
      process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await server.stop();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}