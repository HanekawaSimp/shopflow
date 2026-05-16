#!/bin/bash
# Scenario 01: The app won't start — Permission problem
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 01: Applying permission breakage..."

# Find the ShopFlow services and mess up permissions
# This simulates a common mistake: deploying files as root or wrong user

SERVICE_DIRS=(
    "/home/sahil/coding/shopflow/auth-service"
    "/opt/shopflow/auth-service"
    "/home/ubuntu/shopflow/auth-service"
)

FOUND_DIR=""
for dir in "${SERVICE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        FOUND_DIR="$dir"
        break
    fi
done

if [ -z "$FOUND_DIR" ]; then
    # Fall back to searching
    FOUND_DIR=$(find / -type d -name "auth-service" -path "*/shopflow/*" 2>/dev/null | head -1)
fi

if [ -z "$FOUND_DIR" ]; then
    echo "[ERROR] Could not find auth-service directory. Deploy ShopFlow first."
    exit 1
fi

echo "[BREAK] Found service at: $FOUND_DIR"

# Break permissions on key files
chmod 000 "$FOUND_DIR/src/config.js"
chmod 000 "$FOUND_DIR/src/index.js"

# Change ownership to root so the service user can't read them
chown root:root "$FOUND_DIR/src/config.js"
chown root:root "$FOUND_DIR/src/index.js"

# Also mess up the node_modules directory if it exists
if [ -d "$FOUND_DIR/node_modules" ]; then
    chmod 700 "$FOUND_DIR/node_modules"
    chown root:root "$FOUND_DIR/node_modules"
fi

# If running as systemd service, restart it so it fails
if systemctl is-active shopflow-auth &>/dev/null; then
    systemctl restart shopflow-auth 2>/dev/null || true
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 01 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
