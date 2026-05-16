# 🎫 Support Ticket #1004

**Priority:** CRITICAL 🔴
**Reporter:** Automated Monitoring Alert
**Time:** Thursday 3:30 AM

---

## Subject: ALERT — Disk usage at 95%, services crashing

### Description

> Our monitoring system triggered an alert:
>
> ```
> [CRITICAL] Host ip-172-31-xx-xx: disk usage /dev/xvda1 at 95%
> ```
>
> The database has started refusing writes and services are crashing
> because they can't write log files. We need to free up disk space
> immediately before the system goes completely down.
>
> Nobody has deployed anything new recently. Not sure what's eating
> all the space.

### What we know

- Disk was at ~40% usage yesterday
- No new deployments or data imports
- Something is writing massive amounts of data somewhere
- The database may have stopped accepting writes

### Your task

1. Identify what is consuming the disk space
2. Clean up the unnecessary files
3. Get disk usage back below 70%
4. Verify all services can write to the database again

### Skills you'll practice

- `df -h` — check disk usage
- `du -sh /path/*` — find large directories
- `find / -size +100M` — find big files
- `ls -la` — watch for hidden files (starting with .)
- `ncdu` — interactive disk usage viewer (if installed)
