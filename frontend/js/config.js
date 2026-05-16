/**
 * ShopFlow Frontend Configuration
 *
 * These URLs need to point to the backend services.
 * In production, these would be set at build/deploy time or served via a config endpoint.
 */
const CONFIG = {
  AUTH_SERVICE_URL: 'http://localhost:3001',
  PRODUCT_SERVICE_URL: 'http://localhost:3002',
  ORDER_SERVICE_URL: 'http://localhost:3003',
  NOTIFICATION_WORKER_URL: 'http://localhost:3004',

  // Refresh interval for health checks (ms)
  HEALTH_CHECK_INTERVAL: 30000,

  // Low stock threshold for UI warnings
  LOW_STOCK_THRESHOLD: 10,
};
