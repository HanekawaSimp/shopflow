# Frontend

Static admin dashboard for ShopFlow. Displays products, orders, system health, and overview statistics.

## Tech Stack

- **Pure HTML/CSS/JavaScript** — no build step, no framework
- **Google Fonts** (Inter)

## What It Does

- Login screen (authenticates against auth service)
- Overview dashboard with stats cards
- Products table with search and category filtering
- Orders table with status filtering
- Service health monitoring page (checks all 4 backend services)

## Files

```
frontend/
├── index.html         # Main HTML
├── css/styles.css     # All styles
├── js/
│   ├── config.js      # Service URLs (needs to match your deployment)
│   ├── api.js         # API client class
│   └── app.js         # Dashboard logic
└── README.md
```

## Configuration

Edit `js/config.js` to point at your deployed backend services:

```javascript
const CONFIG = {
  AUTH_SERVICE_URL: 'http://localhost:3001',
  PRODUCT_SERVICE_URL: 'http://localhost:3002',
  ORDER_SERVICE_URL: 'http://localhost:3003',
  NOTIFICATION_WORKER_URL: 'http://localhost:3004',
};
```

In production, you'll need to figure out how to inject these at deploy time (environment-specific builds, config endpoint, etc.).

## Running Locally

Any static file server works:

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve -p 8080

# Or just open index.html in a browser
```

## Port

Default: `8080` (your choice — it's just static files)

## Dependencies on Other Services

- **Auth Service**: Login/logout, token management
- **Product Service**: Product listing, categories
- **Order Service**: Order listing, stats
- **All Services**: Health check page polls all 4 services

## DevOps Considerations

- This is static content — can be served from S3 + CloudFront, nginx, etc.
- The `config.js` file needs to have correct URLs for whatever environment you deploy to
- Consider how you'll handle CORS between the frontend origin and backend APIs
