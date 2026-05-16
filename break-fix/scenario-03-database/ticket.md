# 🎫 Support Ticket #1003

**Priority:** CRITICAL 🔴
**Reporter:** All Teams
**Time:** Wednesday 7:45 AM

---

## Subject: EVERYTHING is down — all services returning database errors

### Description

> None of our services are working. The dashboard shows "unhealthy" for everything.
>
> When I check the logs for any service, they all show something about
> "connection refused" or "authentication failed" when trying to reach the database.
>
> PostgreSQL is installed on this server and was working yesterday.
> Nobody changed the application code. Maybe something happened with
> the database configuration?
>
> This is blocking the entire team, please fix ASAP.

### What we know

- All three services (auth, product, order) are failing
- They all report database connection issues
- PostgreSQL is installed locally on this server
- The database was working yesterday
- No application code changes

### Your task

1. Figure out why applications can't connect to PostgreSQL
2. Fix the PostgreSQL configuration
3. Get all services connecting to the database again
4. Verify: All three health checks return `"database": {"connected": true}`

### Hints (only if stuck for 20+ minutes)

<details>
<summary>Hint 1</summary>
Check if PostgreSQL is running at all: <code>systemctl status postgresql</code>
</details>

<details>
<summary>Hint 2</summary>
What port is PostgreSQL actually listening on? <code>ss -tlnp | grep postgres</code>
</details>

<details>
<summary>Hint 3</summary>
There might be more than one thing wrong. Check both the port AND the authentication config.
</details>
