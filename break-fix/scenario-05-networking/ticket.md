# 🎫 Support Ticket #1005

**Priority:** HIGH
**Reporter:** QA Team
**Time:** Friday 11:30 AM

---

## Subject: Login works but placing orders fails — "Auth service unreachable"

### Description

> Something weird is going on. Users can log in fine through the auth service,
> but when they try to:
> - Create an order → "Auth service unreachable" or timeout
> - View products (when logged in, protected routes) → same error
>
> The auth service IS running — I can curl it directly and it responds.
> But the product service and order service say they can't reach it.
>
> It's like the services can't talk to each other even though they're
> all on the same server.
>
> Also I noticed someone added something to the deployment config
> last week but I'm not sure what changed.

### What we know

- Auth service is running and responding on port 3001
- Product service is running but can't verify tokens (auth calls fail)
- Order service is running but can't reach auth OR product service
- All services are on the same machine
- Someone may have changed environment variables or configs recently

### Your task

1. Figure out why services can't communicate with each other
2. Fix the service URLs / configuration
3. Verify the full chain works:
   - Login via auth: `curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@shopflow.io","password":"admin12345"}'`
   - Use token to list products (protected): `curl http://localhost:3002/api/products -H "Authorization: Bearer <TOKEN>"`
