# 🎫 Support Ticket #1007

**Priority:** HIGH
**Reporter:** Backend Team + Multiple Users
**Time:** Tuesday 10:15 AM

---

## Subject: Server is incredibly slow — API responses taking 30+ seconds

### Description

> Since this morning the server has been crawling. API responses that
> normally take 50ms are now taking 30+ seconds or timing out entirely.
>
> SSH into the server is slow too. It feels like something is eating
> all the CPU.
>
> We haven't deployed anything new. There might be a stuck process
> or something running in the background that shouldn't be.
>
> Also we had a backup job scheduled but it should have finished hours ago.

### What we know

- All services are technically "running" but extremely slow
- Server load is very high
- SSH takes a long time to connect
- No recent deployments
- A backup job was scheduled for 3 AM but may not have finished

### Your task

1. Identify what processes are consuming CPU and memory
2. Kill any rogue/runaway processes
3. Restore normal service priority if needed
4. Verify response times are back to normal

### Skills you'll practice

- `top` or `htop` — see real-time CPU/memory usage
- `ps aux --sort=-%cpu` — list processes sorted by CPU usage
- `ps aux --sort=-%mem` — list processes sorted by memory
- `kill` / `kill -9` — terminate processes
- `renice` — adjust process priority
- `free -h` — check memory usage
- `uptime` — check load averages
