#!/bin/bash
# Scenario 07: Server is extremely slow — CPU hog
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 07: Spawning CPU-hogging processes..."

# Spawn multiple CPU-intensive processes that look like legitimate services
# Use misleading process names

# Process 1: Looks like a node process gone haywire
bash -c 'exec -a "[shopflow-auth] worker" bash -c "while true; do echo \$RANDOM | md5sum > /dev/null; done"' &

# Process 2: Looks like a python process doing something
bash -c 'exec -a "python3 /opt/shopflow/backup-job.py" bash -c "while true; do echo \$RANDOM | sha256sum > /dev/null; done"' &

# Process 3: Looks like a cron job running amok
bash -c 'exec -a "/usr/bin/log-compressor --recursive /var/log" bash -c "while true; do echo \$RANDOM | md5sum > /dev/null; done"' &

# Process 4: Eat memory too — allocate and hold 500MB
python3 -c "
import time
data = 'x' * (500 * 1024 * 1024)  # 500MB
while True:
    time.sleep(60)
" &>/dev/null &
MEMPIG=$!

# Rename it to look legitimate
echo "[BREAK] CPU hog PIDs launched"

# Lower the priority of actual services so they're even slower
for pid in $(pgrep -f "shopflow" 2>/dev/null | head -5); do
    renice 19 "$pid" 2>/dev/null || true
done

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 07 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "⚠️  Emergency kill: pkill -f 'md5sum|sha256sum|log-compressor|backup-job'"
