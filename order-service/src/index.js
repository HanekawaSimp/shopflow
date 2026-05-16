const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { initializeDatabase, checkConnection } = require('./db');
const { checkRedis } = require('./redis');
const orderRoutes = require('./routes/orders');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Routes
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkConnection();
  const redisStatus = await checkRedis();
  const healthy = dbStatus.connected;

  res.status(healthy ? 200 : 503).json({
    service: 'order-service',
    status: healthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
});

// Start
async function start() {
  try {
    console.log('[ORDERS] Initializing database...');
    await initializeDatabase();

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`[ORDERS] Order service running on port ${config.port}`);
      console.log(`[ORDERS] Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('[ORDERS] Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('[ORDERS] SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[ORDERS] SIGINT received, shutting down...');
  process.exit(0);
});

start();
