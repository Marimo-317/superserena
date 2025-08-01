/**
 * SuperClaude Monitoring Demo Script
 * Demonstrates the visualization system capabilities
 */

const { startMonitoringServer } = require('./dist/monitoring/index.js');

async function runDemo() {
  console.log(`
🚀 SuperClaude Operation Visualization Demo
===========================================

Starting comprehensive monitoring system demonstration...
  `);

  try {
    // Start monitoring server
    console.log('📊 Starting monitoring server...');
    const server = await startMonitoringServer(3001);
    
    console.log(`
✅ Demo Environment Ready!

🖥️  Dashboard: http://localhost:3001
🔌  WebSocket: ws://localhost:3001  
🌐  API: http://localhost:3001/api/monitoring
⚡  Health: http://localhost:3001/health

📋 Demo Features Available:
1. Real-time Multi-Agent Coordination Tracking
2. SPARC Methodology Progress Visualization  
3. 8-Step Quality Gates Validation
4. Wave System Orchestration Monitoring
5. Performance Metrics & Token Optimization
6. Memory Persistence Visualization
7. Session History & Analytics

🎭 To see the system in action:
   1. Open http://localhost:3001 in your browser
   2. Click "🎭 Start Demo" button
   3. Watch real-time AI orchestration visualization

⚡ Key Capabilities Being Demonstrated:
• Multi-agent coordination (5 specialist agents)
• SPARC methodology execution (5 phases)
• Quality gates validation (8 comprehensive checks)
• Wave system orchestration (progressive enhancement)
• Token optimization tracking (30-60% reduction)
• Real-time performance metrics
• Memory state visualization

Press Ctrl+C to stop the demo server.
    `);

    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping demo server...');
      await server.stop();
      console.log('✅ Demo completed successfully!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Demo failed to start:', error.message);
    console.log(`
🔧 Troubleshooting:
1. Ensure dependencies are installed: npm install
2. Build the project: npm run build
3. Check port 3001 is available
4. Verify TypeScript compilation completed successfully
    `);
    process.exit(1);
  }
}

// Auto-start demo if this script is run directly
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };