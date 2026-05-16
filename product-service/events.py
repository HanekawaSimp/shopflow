import json
import redis
from config import config

_redis_client = None


def get_redis():
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)
            _redis_client.ping()
            print("[EVENTS] Connected to Redis")
        except Exception as e:
            print(f"[EVENTS] Redis connection failed: {e}")
            _redis_client = None
    return _redis_client


def publish_event(channel, event_type, data):
    """Publish an event to Redis pub/sub."""
    client = get_redis()
    if client is None:
        print(f"[EVENTS] Cannot publish {event_type} — Redis unavailable")
        return False

    try:
        message = json.dumps({
            "type": event_type,
            "service": "product-service",
            "data": data,
        })
        client.publish(channel, message)
        print(f"[EVENTS] Published {event_type} to {channel}")
        return True
    except Exception as e:
        print(f"[EVENTS] Publish error: {e}")
        return False


def check_redis():
    """Check Redis connectivity for health checks."""
    try:
        client = get_redis()
        if client and client.ping():
            return {"connected": True}
        return {"connected": False, "error": "Ping failed"}
    except Exception as e:
        return {"connected": False, "error": str(e)}
