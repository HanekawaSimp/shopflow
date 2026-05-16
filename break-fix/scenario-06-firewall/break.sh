#!/bin/bash
# Scenario 06: Firewall blocking traffic
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 06: Adding firewall rules to block internal traffic..."

# Add iptables rules that block traffic to specific service ports
# But ONLY for local connections (not SSH) so you can still access the server

# Block external access to port 3002 (product service)
iptables -I INPUT -p tcp --dport 3002 -j DROP

# Block Redis port
iptables -I INPUT -p tcp --dport 6379 -j DROP

# Block output to port 3001 (so product/order service can't reach auth)
# But only from non-localhost sources to make it tricky
iptables -I OUTPUT -p tcp --dport 3001 -d 127.0.0.1 -m owner ! --uid-owner root -j REJECT

echo "[BREAK] iptables rules added"

# If ufw is installed, add conflicting rules
if command -v ufw &>/dev/null; then
    ufw deny 3002/tcp 2>/dev/null || true
    ufw deny 6379/tcp 2>/dev/null || true
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 06 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "⚠️  Emergency reset: iptables -F && iptables -X"
