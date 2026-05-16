# Product Service

Product catalog management service for ShopFlow. Handles products, categories, and stock tracking.

## Tech Stack

- **Runtime**: Python 3.11+
- **Framework**: Flask
- **Database**: PostgreSQL
- **Message Queue**: Redis (for publishing events)
- **Production Server**: Gunicorn

## API Endpoints

### Categories

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/categories` | No | List all categories with product counts |
| POST | `/api/categories` | Admin/Manager | Create a category |

### Products

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/products` | No | List products (filterable, paginated) |
| GET | `/api/products/:id` | No | Get product by ID |
| GET | `/api/products/sku/:sku` | No | Get product by SKU |
| POST | `/api/products` | Admin/Manager | Create a product |
| PUT | `/api/products/:id` | Admin/Manager | Update a product |
| DELETE | `/api/products/:id` | Admin | Deactivate a product |
| PATCH | `/api/products/:id/stock` | Admin/Manager | Adjust stock quantity |

### System

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/health` | No | Health check |

### Query Parameters for GET /api/products

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `category_id` | int | — | Filter by category |
| `search` | string | — | Search name, description, SKU |
| `sort_by` | string | `created_at` | Sort field |
| `sort_order` | string | `desc` | `asc` or `desc` |
| `active_only` | bool | `true` | Only show active products |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3002` | Server port |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `shopflow_products` | Database name |
| `DB_USER` | Yes | `shopflow` | Database user |
| `DB_PASSWORD` | Yes | `shopflow_secret` | Database password |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Redis connection string |
| `AUTH_SERVICE_URL` | Yes | `http://localhost:3001` | Auth service base URL |
| `LOW_STOCK_THRESHOLD` | No | `10` | Stock level that triggers low_stock events |

## Running Locally

```bash
pip install -r requirements.txt
python seed.py   # populate sample data
python app.py    # development
gunicorn app:app -b 0.0.0.0:3002 -w 4   # production
```

## Events Published to Redis

| Channel | Event Type | When |
|---------|------------|------|
| `shopflow.products` | `product.low_stock` | Stock drops to/below threshold |

## Dependencies on Other Services

- **Auth Service** (`AUTH_SERVICE_URL`): Verifies JWT tokens on protected endpoints
