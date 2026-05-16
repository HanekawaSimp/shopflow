# 🎫 Support Ticket #1006

**Priority:** HIGH
**Reporter:** DevOps Lead
**Time:** Monday 4:00 PM

---

## Subject: Product service unreachable from outside, Redis connection failing

### Description

> After the security team did a "hardening pass" on our server this morning,
> several things broke:
>
> 1. The product service health check times out from my laptop
>    (but allegedly works locally on the server?)
> 2. The order service logs show Redis connection failures
> 3. The notification worker can't connect to Redis at all
> 4. I think auth service calls from product/order service are also
>    failing intermittently
>
> Security team says they "applied standard firewall rules" but won't
> tell me exactly what they did. Can you audit the firewall and fix
> whatever they broke?

### What we know

- Security team modified firewall rules this morning
- SSH still works (port 22 is fine)
- Services ARE running (process is up)
- Connections to certain ports are timing out or being refused
- The server uses iptables (and possibly ufw)

### Your task

1. List current firewall rules: `iptables -L -n` and `ufw status` (if applicable)
2. Identify which rules are blocking legitimate traffic
3. Remove the problematic rules while keeping SSH open
4. Verify all services can communicate
5. Verify Redis is accessible

### Skills you'll practice

- `iptables -L -n -v` — list firewall rules with details
- `iptables -D` — delete specific rules
- `ufw status` / `ufw delete` — manage ufw rules
- `ss -tlnp` — confirm services are listening
- `curl --connect-timeout 5` — test connectivity with timeout
