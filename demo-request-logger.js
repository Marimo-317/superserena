/**
 * Demo application showing how to use the request logger middleware
 * Run with: node demo-request-logger.js
 */

const express = require('express');
const { createRequestLogger, developmentLogger, productionLogger } = require('./dist/src/middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable JSON parsing
app.use(express.json());

// Demo: Use the production logger for all requests
console.log('🚀 Starting demo with production logger...');
app.use(productionLogger);

// Alternative demo configurations (comment/uncomment to try different loggers):

// Demo: Development logger with full details
// app.use(developmentLogger);

// Demo: Custom logger configuration
// app.use(createRequestLogger({
//   includeUserAgent: true,
//   includeResponseTime: true,
//   includeResponseSize: true,
//   formatter: (data) => `🔍 ${data.method} ${data.url} [${data.ip}] → ${data.statusCode} (${data.responseTime}ms)`,
//   skip: (req) => req.path === '/favicon.ico'
// }));

// Demo routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Request Logger Demo!',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

app.get('/api/users', (req, res) => {
  setTimeout(() => {
    res.json({
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]
    });
  }, 100); // Simulate some processing time
});

app.post('/api/users', (req, res) => {
  const user = { id: Date.now(), ...req.body };
  res.status(201).json({ 
    message: 'User created successfully', 
    user 
  });
});

app.get('/api/slow', (req, res) => {
  setTimeout(() => {
    res.json({ message: 'This was a slow endpoint', delay: '2000ms' });
  }, 2000);
});

app.get('/api/error', (req, res) => {
  res.status(500).json({ error: 'Simulated server error' });
});

app.get('/api/not-found', (req, res) => {
  res.status(404).json({ error: 'Resource not found' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Large response for testing response size measurement
app.get('/api/large', (req, res) => {
  const largeData = {
    message: 'Large response for testing',
    data: Array(1000).fill(0).map((_, i) => ({
      id: i,
      value: `Item ${i}`,
      description: `This is item number ${i} with some additional content to make the response larger`
    }))
  };
  res.json(largeData);
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n📍 Request Logger Demo Server running on http://localhost:${PORT}`);
  console.log('\n🎯 Try these endpoints to see logging in action:');
  console.log(`   GET  http://localhost:${PORT}/                 - Basic endpoint`);
  console.log(`   GET  http://localhost:${PORT}/api/users        - Users list`);
  console.log(`   POST http://localhost:${PORT}/api/users        - Create user`);
  console.log(`   GET  http://localhost:${PORT}/api/slow         - Slow endpoint (2s)`);
  console.log(`   GET  http://localhost:${PORT}/api/error        - Error response (500)`);
  console.log(`   GET  http://localhost:${PORT}/api/not-found    - Not found (404)`);
  console.log(`   GET  http://localhost:${PORT}/api/large        - Large response`);
  console.log(`   GET  http://localhost:${PORT}/health           - Health check (skipped by production logger)`);
  console.log('\n💡 Watch the console to see request logs!\n');
  
  console.log('📊 Example curl commands:');
  console.log(`curl http://localhost:${PORT}/`);
  console.log(`curl -X POST -H "Content-Type: application/json" -d '{"name":"John","email":"john@example.com"}' http://localhost:${PORT}/api/users`);
  console.log(`curl http://localhost:${PORT}/api/error`);
  console.log('');
});