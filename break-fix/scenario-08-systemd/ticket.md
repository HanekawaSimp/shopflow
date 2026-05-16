# 🎫 Support Ticket #1008

**Priority:** CRITICAL 🔴
**Reporter:** SRE Team
**Time:** Saturday 6:00 AM (after server reboot)

---

## Subject: Auth service won't start after server reboot — keeps crash-looping

### Description

> We had a scheduled server reboot at 5 AM for kernel updates.
> After the reboot, the auth service won't start. systemd keeps trying
> to restart it but it fails immediately every time.
>
> The other services that depend on auth are also failing because
> they can't verify tokens.
>
> I tried `systemctl status shopflow-auth` and it shows the service
> is in a failed state with some error messages, but I'm not sure
> how to read them or what to fix.
>
> Can you please look at the systemd service configuration and figure
> out what's wrong? I think there might be multiple issues.

### What we know

- Server was rebooted for kernel updates at 5 AM
- Auth service was working before the reboot
- The systemd service file may have been misconfigured
- Service is crash-looping (start → fail → restart → fail → ...)
- Other services depend on auth service

### Your task

1. Check the service status: `systemctl status shopflow-auth`
2. Read the logs: `journalctl -u shopflow-auth -n 50`
3. Examine the service file: `systemctl cat shopflow-auth`
4. Fix ALL issues in the service configuration (there are multiple!)
5. Get the service running and enabled for future reboots

### Skills you'll practice

- `systemctl status/start/stop/restart/enable` — manage services
- `journalctl -u <service>` — read service logs
- `systemctl cat <service>` — view service file
- `systemctl edit <service>` — edit service overrides
- `systemctl daemon-reload` — reload after config changes
- Understanding systemd service file format
- Linux user management (`id`, `useradd`)
