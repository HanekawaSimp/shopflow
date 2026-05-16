# Order Service

Order processing and management service for ShopFlow. Handles order creation, status tracking, and inter-service coordination.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Message Queue**: Redis (ioredis)
- **HTTP Client**: Axios (for inter-service calls)

## API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/orders` | Yes | Create a new order |
| GET | `/api/orders` | Yes | List orders (users see own, admins see all) |
| GET | `/api/orders/:id` | Yes | Get order with items and status history |
| PATCH | `/api/orders/:id/status` | Admin/Manager | Update order status |
| GET | `/api/orders/stats/summary` | Admin/Manager | Order statistics and revenue |
| GET | `/api/health` | No | Health check |

### Order Status Flow

```
pending → confirmed → processing → shipped → delivered → refunded
   ↓          ↓            ↓
 cancelled  cancelled   cancelled
```

### Create Order Request Body

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  },
  "notes": "Please gift wrap"
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3003` | Server port |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `shopflow_orders` | Database name |
| `DB_USER` | Yes | `shopflow` | Database user |
| `DB_PASSWORD` | Yes | `shopflow_secret` | Database password |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |
| `AUTH_SERVICE_URL` | Yes | `http://localhost:3001` | Auth service URL |
| `PRODUCT_SERVICE_URL` | Yes | `http://localhost:3002` | Product service URL |

## Running Locally

```bash
npm install
npm start     # production
npm run dev   # development with auto-reload
```

## Events Published to Redis

| Channel | Event Type | When |
|---------|------------|------|
| `shopflow.orders` | `order.created` | New order placed |
| `shopflow.orders` | `order.status_changed` | Order status transitions |

## Dependencies on Other Services

- **Auth Service** (`AUTH_SERVICE_URL`): Verifies JWT tokens
- **Product Service** (`PRODUCT_SERVICE_URL`): Validates products, checks stock, deducts/restores inventory
