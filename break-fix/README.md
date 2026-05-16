# ShopFlow Break-Fix Scenarios

Simulated production incidents for your ShopFlow deployment. Each scenario breaks something on purpose — your job is to diagnose and fix it like a real on-call engineer.

## Prerequisites

- ShopFlow services deployed manually on a Linux server (EC2, etc.)
- PostgreSQL and Redis running
- You have `sudo` access

## How It Works

Each scenario has three files:

| File | Purpose |
|------|---------|
| `break.sh` | Run this as root to introduce the problem |
| `ticket.md` | The "support ticket" — what the user/team reported. Read this FIRST. |
| `verify.sh` | Run this after you think you've fixed it. Prints PASS or FAIL. |

## Rules

1. **Read `ticket.md` first** — it simulates what a user or dev would actually tell you
2. **Do NOT read `break.sh`** until after you've solved it (that's cheating)
3. Use `verify.sh` to check your fix
4. Google is allowed — that's what real engineers do
5. Take notes on what commands you used — build your own playbook

## Scenarios (Progressive Difficulty)

| # | Scenario | Difficulty | Skills Tested |
|---|----------|------------|---------------|
| 01 | The app won't start | ⭐ | File permissions, ls, chmod, chown |
| 02 | Port already in use | ⭐ | ss/netstat, ps, kill, lsof |
| 03 | Can't connect to database | ⭐⭐ | PostgreSQL config, pg_hba.conf, systemctl |
| 04 | Disk is full | ⭐⭐ | df, du, find, log management |
| 05 | Services can't talk to each other | ⭐⭐ | DNS, /etc/hosts, curl, networking |
| 06 | Firewall blocking traffic | ⭐⭐⭐ | iptables/ufw, ss, network debugging |
| 07 | Server is extremely slow | ⭐⭐⭐ | top, ps, CPU/memory analysis, kill |
| 08 | Service keeps crashing after reboot | ⭐⭐⭐ | systemd, journalctl, env vars, service files |

## Running a Scenario

```bash
# 1. Break something
sudo bash break-fix/scenario-01-permissions/break.sh

# 2. Read the ticket
cat break-fix/scenario-01-permissions/ticket.md

# 3. Investigate and fix it...
#    (this is the learning part)

# 4. Verify your fix
sudo bash break-fix/scenario-01-permissions/verify.sh
```

## Suggested Tools to Learn

These are the tools you'll naturally pick up by doing these scenarios:

| Tool | What It Does |
|------|-------------|
| `systemctl` | Manage services (start, stop, status, logs) |
| `journalctl` | Read service logs |
| `ss` / `netstat` | See what's listening on which ports |
| `ps aux` | See running processes |
| `top` / `htop` | Real-time process monitoring |
| `df -h` | Disk usage by filesystem |
| `du -sh` | Disk usage by directory |
| `find` | Search for files |
| `grep` | Search inside files |
| `lsof` | List open files (including network sockets) |
| `chmod` / `chown` | Change file permissions/ownership |
| `iptables` / `ufw` | Firewall rules |
| `curl` | Test HTTP endpoints |
| `tail -f` | Follow log files in real-time |
| `strace` | Trace system calls (advanced) |
