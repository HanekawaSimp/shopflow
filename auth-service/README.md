# Auth Service

JWT-based authentication and user management service for ShopFlow.

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt

## API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/verify` | Yes | Verify a JWT token (used by other services) |
| POST | `/api/auth/refresh` | Yes | Refresh an expired token |
| GET | `/api/users` | Admin | List all users (paginated) |
| GET | `/api/users/:id` | Admin/Self | Get user by ID |
| PATCH | `/api/users/:id` | Admin/Self | Update user |
| DELETE | `/api/users/:id` | Admin | Deactivate user |
| GET | `/api/health` | No | Health check |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `shopflow_auth` | Database name |
| `DB_USER` | Yes | `shopflow` | Database user |
| `DB_PASSWORD` | Yes | `shopflow_secret` | Database password |
| `JWT_SECRET` | Yes | *(insecure default)* | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | No | `24h` | Token expiration time |
| `BCRYPT_SALT_ROUNDS` | No | `12` | bcrypt hashing rounds |

## Running Locally

```bash
npm install
npm run seed   # populate test users
npm start      # production
npm run dev    # development with auto-reload
```

## Seed Users

| Email | Password | Role |
|-------|----------|------|
| admin@shopflow.io | admin12345 | admin |
| manager@shopflow.io | manager12345 | manager |
| user@shopflow.io | user12345 | user |

## How Other Services Use This

Other services call `GET /api/auth/verify` with the `Authorization: Bearer <token>` header to validate tokens. The response includes the user's ID, email, and role.
