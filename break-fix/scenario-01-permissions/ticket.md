# 🎫 Support Ticket #1001

**Priority:** HIGH
**Reporter:** Backend Dev Team
**Time:** Monday 9:02 AM

---

## Subject: Auth service won't start after weekend deployment

### Description

> Hey, we pushed a deployment to the auth service on Friday and it was working fine.
> This morning none of us can log in to the dashboard. The auth service doesn't seem to be running.
>
> When I try to start it manually I get some kind of error about files not being found or something.
> Can you take a look?

### What we know

- The auth service was working on Friday afternoon
- No code changes were made over the weekend
- Other services (product, order) seem to be running fine
- The server itself is reachable via SSH

### Your task

1. Figure out why the auth service won't start
2. Fix it so it starts and runs normally
3. Make sure the health check responds: `curl http://localhost:3001/api/health`
