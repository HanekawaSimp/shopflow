#!/bin/bash
# Scenario 08: Service keeps crashing after reboot — broken systemd configuration
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 08: Breaking systemd service configuration..."

# This scenario assumes the user has already set up systemd services
# (which they should have done during manual deployment)

# Check if systemd services exist
AUTH_SERVICE=$(systemctl list-unit-files 2>/dev/null | grep shopflow-auth | awk '{print $1}')
PRODUCT_SERVICE=$(systemctl list-unit-files 2>/dev/null | grep shopflow-product | awk '{print $1}')

if [ -z "$AUTH_SERVICE" ]; then
    echo "[WARN] No systemd services found. Creating broken ones for you to fix..."
    
    # Create a broken systemd service file for auth service
    cat > /etc/systemd/system/shopflow-auth.service << 'EOF'
[Unit]
Description=ShopFlow Auth Service
After=network.target postgresql.service

[Service]
Type=simple
User=shopflow-nonexistent-user
WorkingDirectory=/opt/shopflow/auth-service-WRONG-PATH
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

# Environment variables (some are wrong/missing)
Environment="PORT=3001"
Environment="DB_HOST=localhost"
Environment="DB_PORT=5432"
Environment="DB_NAME=shopflow_auth"
# DB_USER and DB_PASSWORD are MISSING
# JWT_SECRET is MISSING

[Install]
WantedBy=multi-user.target
EOF
    
    # Create a broken service for product service
    cat > /etc/systemd/system/shopflow-product.service << 'EOF'
[Unit]
Description=ShopFlow Product Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/shopflow/product-service
ExecStart=/usr/local/bin/python3 app.py
Restart=on-failure
RestartSec=3

Environment="PORT=3002"
Environment="DB_HOST=localhost"
Environment="DB_NAME=shopflow_products"
Environment="DB_USER=shopflow"
Environment="DB_PASSWORD=shopflow_secret"
Environment="REDIS_URL=redis://localhost:6379/0"
Environment="AUTH_SERVICE_URL=http://localhost:3001"

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
else
    echo "[BREAK] Found existing systemd services. Breaking them..."
    
    # Back up and corrupt the auth service file
    SERVICE_FILE="/etc/systemd/system/$AUTH_SERVICE"
    if [ -f "$SERVICE_FILE" ]; then
        cp "$SERVICE_FILE" "${SERVICE_FILE}.scenario08.bak"
        
        # Change User to a non-existent user
        sed -i 's/^User=.*/User=shopflow-nonexistent-user/' "$SERVICE_FILE"
        
        # Corrupt WorkingDirectory
        sed -i 's|^WorkingDirectory=.*|WorkingDirectory=/opt/shopflow/auth-service-WRONG-PATH|' "$SERVICE_FILE"
        
        # Remove critical environment variables
        sed -i '/DB_USER/d' "$SERVICE_FILE"
        sed -i '/DB_PASSWORD/d' "$SERVICE_FILE"
        sed -i '/JWT_SECRET/d' "$SERVICE_FILE"
    fi
    
    systemctl daemon-reload
    systemctl restart shopflow-auth 2>/dev/null || true
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 08 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
