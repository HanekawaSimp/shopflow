/**
 * ShopFlow Frontend Configuration
 *
 * All API calls go through the nginx reverse proxy on the same origin.
 * nginx routes requests to the correct backend service based on URL path.
 */
const CONFIG = {
  // Empty string = same origin (requests go through nginx proxy)
  AUTH_SERVICE_URL: '',
  PRODUCT_SERVICE_URL: '',
  ORDER_SERVICE_URL: '',

  // Health check endpoints are proxied through unique paths
  HEALTH_URLS: {
    'Auth Service': '/health/auth',
    'Product Service': '/health/product',
    'Order Service': '/health/order',
    'Notification Worker': '/health/notification',
  },

  // Refresh interval for health checks (ms)
  HEALTH_CHECK_INTERVAL: 30000,

  // Low stock threshold for UI warnings
  LOW_STOCK_THRESHOLD: 10,
};
