module.exports = {
  port: parseInt(process.env.PORT || '3003', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'shopflow_orders',
    user: process.env.DB_USER || 'shopflow',
    password: process.env.DB_PASSWORD || 'shopflow_secret',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  services: {
    authUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    productUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  },
};
