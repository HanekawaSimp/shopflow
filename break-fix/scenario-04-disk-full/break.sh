#!/bin/bash
# Scenario 04: Disk is full
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 04: Filling up disk space..."

# Create a hidden directory with large junk files
# Simulates runaway logs or someone leaving debug dumps
JUNK_DIR="/var/log/.shopflow-debug-dump"
mkdir -p "$JUNK_DIR"

# Create several large files to eat disk space
# We'll be conservative — create 1GB of junk spread across files
# that look like they could be real log files
for i in $(seq 1 10); do
    dd if=/dev/zero of="$JUNK_DIR/auth-service-debug-$(date +%Y%m%d)-$i.log" bs=1M count=100 2>/dev/null
done

# Also create a massive "core dump" file in /tmp
dd if=/dev/zero of="/tmp/.core.shopflow.$(date +%s)" bs=1M count=200 2>/dev/null

# Create some realistic-looking but enormous log files
dd if=/dev/urandom of="/var/log/shopflow-verbose.log" bs=1M count=300 2>/dev/null

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 04 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
