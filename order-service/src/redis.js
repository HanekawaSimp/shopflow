const Redis = require('ioredis');
const config = require('./config');

let redis = null;

function getRedis() {
  if (!redis) {
    try {
      redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
      });

      redis.on('connect', () => console.log('[REDIS] Connected'));
      redis.on('error', (err) => console.error('[REDIS] Error:', err.message));
    } catch (err) {
      console.error('[REDIS] Failed to create client:', err);
    }
  }
  return redis;
}

async function publishEvent(channel, eventType, data) {
  const client = getRedis();
  if (!client) {
    console.warn(`[EVENTS] Cannot publish ${eventType} — Redis unavailable`);
    return false;
  }

  try {
    const message = JSON.stringify({
      type: eventType,
      service: 'order-service',
      timestamp: new Date().toISOString(),
      data,
    });
    await client.publish(channel, message);
    console.log(`[EVENTS] Published ${eventType} to ${channel}`);
    return true;
  } catch (err) {
    console.error(`[EVENTS] Publish error:`, err.message);
    return false;
  }
}

async function checkRedis() {
  try {
    const client = getRedis();
    if (client) {
      await client.ping();
      return { connected: true };
    }
    return { connected: false, error: 'No client' };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = { getRedis, publishEvent, checkRedis };
