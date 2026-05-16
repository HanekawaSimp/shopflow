# 🎫 Support Ticket #1002

**Priority:** HIGH
**Reporter:** Frontend Developer
**Time:** Tuesday 2:15 PM

---

## Subject: Product page is completely broken — showing "Service Unavailable"

### Description

> The product listing page on the dashboard suddenly stopped working.
> It just says "Failed to load products" and when I try to curl the product API
> I get "connection refused."
>
> I checked and the product service process doesn't seem to be running.
> When I tried to start it, it crashed immediately with something about
> the address already being in use?
>
> Can you figure out what's using that port and get the product service back online?

### What we know

- Product service is supposed to run on port 3002
- The server hasn't been rebooted
- No deployments happened today
- Auth service and order service are fine

### Your task

1. Find out what's occupying port 3002
2. Remove whatever is blocking it
3. Get the product service running again on port 3002
4. Verify: `curl http://localhost:3002/api/health`
