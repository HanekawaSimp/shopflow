#!/bin/bash
# Scenario 05: Services can't talk to each other
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 05: Breaking inter-service DNS resolution..."

# Back up hosts file
cp /etc/hosts /etc/hosts.scenario05.bak

# Add entries that redirect localhost to a bogus IP
# This simulates DNS misconfiguration or service discovery failure
# We'll only break the loopback for specific ports by adding entries
# that would confuse resolution

# The sneaky approach: add an alias that the services might use
# and point it somewhere wrong
cat >> /etc/hosts << 'EOF'

# Added by deployment script (DO NOT REMOVE)
127.0.0.1    auth-service
127.0.0.1    product-service
127.0.0.1    order-service
EOF

# Now modify the auth service URL in the product service config to use
# a hostname that resolves to the wrong place
# Find and modify environment or config
SERVICE_DIRS=(
    "/home/sahil/coding/shopflow"
    "/opt/shopflow"
    "/home/ubuntu/shopflow"
)

FOUND_DIR=""
for dir in "${SERVICE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        FOUND_DIR="$dir"
        break
    fi
done

if [ -n "$FOUND_DIR" ]; then
    # If there are .env files or systemd override files, modify them
    # Otherwise, create override env files that point to wrong URLs
    
    # For systemd services, create override with wrong URLs
    if [ -d /etc/systemd/system ]; then
        mkdir -p /etc/systemd/system/shopflow-product.service.d
        cat > /etc/systemd/system/shopflow-product.service.d/override.conf << 'EOF'
[Service]
Environment="AUTH_SERVICE_URL=http://10.255.255.1:3001"
EOF

        mkdir -p /etc/systemd/system/shopflow-order.service.d
        cat > /etc/systemd/system/shopflow-order.service.d/override.conf << 'EOF'
[Service]
Environment="AUTH_SERVICE_URL=http://10.255.255.1:3001"
Environment="PRODUCT_SERVICE_URL=http://10.255.255.1:3002"
EOF

        systemctl daemon-reload
        systemctl restart shopflow-product 2>/dev/null || true
        systemctl restart shopflow-order 2>/dev/null || true
    fi
    
    # Also create .env files with wrong URLs as a fallback
    cat > "$FOUND_DIR/product-service/.env" << 'EOF'
AUTH_SERVICE_URL=http://10.255.255.1:3001
EOF

    cat > "$FOUND_DIR/order-service/.env" << 'EOF'
AUTH_SERVICE_URL=http://10.255.255.1:3001
PRODUCT_SERVICE_URL=http://10.255.255.1:3002
EOF
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 05 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "⚠️  To fully reset if you get stuck:"
echo "    cp /etc/hosts.scenario05.bak /etc/hosts"
