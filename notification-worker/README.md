# Notification Worker

Background worker service that listens for events from Redis pub/sub and processes notifications.

## Tech Stack

- **Runtime**: Python 3.11+
- **Message Queue**: Redis (pub/sub subscriber)
- **Health Check**: Flask (lightweight HTTP server in background thread)

## How It Works

This is NOT a typical HTTP API service. It's a **background worker** that:

1. Subscribes to Redis pub/sub channels (`shopflow.orders`, `shopflow.products`)
2. Listens for events published by other services
3. Processes each event with the appropriate handler (log, print, would send emails in production)
4. Runs a minimal health check HTTP server on a separate thread

## Events Handled

| Event Type | Source | Action |
|------------|--------|--------|
| `order.created` | Order Service | Log order confirmation, would send customer email |
| `order.status_changed` | Order Service | Log status change, would notify customer |
| `product.low_stock` | Product Service | Log stock alert, would notify warehouse team |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3004` | Health check server port |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis connection string |
| `WEBHOOK_URL` | No | — | Slack/Discord webhook for alerts |
| `SMTP_HOST` | No | — | SMTP server for email notifications |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `SMTP_FROM` | No | `noreply@shopflow.io` | From email address |
| `LOG_DIR` | No | `/tmp/shopflow-notifications` | Directory for notification logs |

## Running Locally

```bash
pip install -r requirements.txt
python worker.py
```

## Health Check

```bash
curl http://localhost:3004/api/health
```

Returns worker status including:
- Redis connection state
- Subscribed channels
- Events processed/failed counts
- Last event timestamp

## Notification Logs

All processed notifications are logged to JSONL files in `LOG_DIR`:
```
/tmp/shopflow-notifications/2024-01-15.jsonl
```

## Dependencies on Other Services

- **Redis**: Subscribes to pub/sub channels — requires Redis to be running
- No direct dependency on other HTTP services
