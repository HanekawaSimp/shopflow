"""
ShopFlow Notification Worker

Subscribes to Redis pub/sub channels and processes events
(new orders, status changes, low stock alerts).

Also runs a lightweight HTTP server for health checks.
"""
import sys
import json
import signal
import threading
import redis as redis_lib
from flask import Flask, jsonify
from config import config
from handlers import process_event


# ──────────── Health Check Server ────────────

health_app = Flask(__name__)
health_app.json.sort_keys = False

worker_status = {
    "connected": False,
    "channels": [],
    "events_processed": 0,
    "events_failed": 0,
    "last_event_at": None,
}


@health_app.route('/api/health')
def health_check():
    healthy = worker_status["connected"]
    return jsonify({
        "service": "notification-worker",
        "status": "healthy" if healthy else "unhealthy",
        "version": "1.0.0",
        "worker": worker_status,
    }), 200 if healthy else 503


def start_health_server():
    """Run the health check HTTP server in a background thread."""
    health_app.run(host='0.0.0.0', port=config.PORT, debug=False, use_reloader=False)


# ──────────── Redis Subscriber ────────────

def on_message(message):
    """Process a message from Redis pub/sub."""
    if message['type'] != 'message':
        return

    channel = message['channel']
    try:
        payload = json.loads(message['data'])
        event_type = payload.get('type', 'unknown')
        event_data = payload.get('data', {})
        source = payload.get('service', 'unknown')

        print(f"[WORKER] Received {event_type} from {source} on {channel}")

        success = process_event(event_type, event_data)

        if success:
            worker_status["events_processed"] += 1
        else:
            worker_status["events_failed"] += 1

        worker_status["last_event_at"] = __import__('datetime').datetime.now().isoformat()

    except json.JSONDecodeError:
        print(f"[WORKER] Invalid JSON on {channel}: {message['data'][:200]}")
        worker_status["events_failed"] += 1
    except Exception as e:
        print(f"[WORKER] Error processing message: {e}")
        worker_status["events_failed"] += 1


def run_subscriber():
    """Main subscriber loop with reconnection logic."""
    channels = config.SUBSCRIBE_CHANNELS

    while True:
        try:
            print(f"[WORKER] Connecting to Redis: {config.REDIS_URL}")
            client = redis_lib.from_url(config.REDIS_URL, decode_responses=True)
            client.ping()

            pubsub = client.pubsub()
            pubsub.subscribe(*channels)

            worker_status["connected"] = True
            worker_status["channels"] = channels
            print(f"[WORKER] Subscribed to channels: {', '.join(channels)}")
            print(f"[WORKER] Waiting for events...")

            for message in pubsub.listen():
                on_message(message)

        except redis_lib.ConnectionError as e:
            worker_status["connected"] = False
            print(f"[WORKER] Redis connection lost: {e}")
            print("[WORKER] Reconnecting in 5 seconds...")
            import time
            time.sleep(5)

        except KeyboardInterrupt:
            print("\n[WORKER] Shutting down...")
            worker_status["connected"] = False
            break

        except Exception as e:
            worker_status["connected"] = False
            print(f"[WORKER] Unexpected error: {e}")
            import time
            time.sleep(5)


# ──────────── Main ────────────

def handle_shutdown(signum, frame):
    print(f"\n[WORKER] Received signal {signum}, shutting down...")
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


if __name__ == '__main__':
    print("=" * 55)
    print("  ShopFlow Notification Worker")
    print("=" * 55)
    print(f"  Health check: http://localhost:{config.PORT}/api/health")
    print(f"  Channels:     {', '.join(config.SUBSCRIBE_CHANNELS)}")
    print("=" * 55)

    # Start health check server in background thread
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    # Run the subscriber (blocking)
    run_subscriber()
