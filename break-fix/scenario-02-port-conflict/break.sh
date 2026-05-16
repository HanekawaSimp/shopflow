#!/bin/bash
# Scenario 02: Port already in use
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 02: Creating port conflict..."

# Start a rogue process that occupies port 3002 (product service port)
# Using ncat/nc to hold the port open
if command -v ncat &>/dev/null; then
    nohup ncat -l -k 0.0.0.0 3002 </dev/null &>/dev/null &
elif command -v nc &>/dev/null; then
    # Try different nc flavors
    nohup bash -c 'while true; do echo "occupied" | nc -l -p 3002 2>/dev/null || nc -l 3002 2>/dev/null; sleep 0.1; done' </dev/null &>/dev/null &
else
    # Fall back to Python
    nohup python3 -c "
import socket, time
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('0.0.0.0', 3002))
s.listen(1)
while True:
    time.sleep(60)
" </dev/null &>/dev/null &
fi

ROGUE_PID=$!
echo "[BREAK] Rogue process started on port 3002 (PID: $ROGUE_PID)"

# Stop the product service if it's running via systemd
if systemctl is-active shopflow-product &>/dev/null; then
    systemctl stop shopflow-product 2>/dev/null || true
fi

# Also kill any existing product service process
pkill -f "python.*app.py.*3002" 2>/dev/null || true
pkill -f "gunicorn.*3002" 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 02 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
