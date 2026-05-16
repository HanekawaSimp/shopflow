#!/bin/bash
# Scenario 01: Verify fix
# Run as root: sudo bash verify.sh

echo "Verifying Scenario 01 fix..."
echo ""

PASS=true

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
    FOUND_DIR=$(find / -type d -name "auth-service" -path "*/shopflow/*" 2>/dev/null | head -1)
fi

# Check 1: config.js is readable
if [ -r "$FOUND_DIR/src/config.js" ]; then
    echo "  ✅ config.js is readable"
else
    echo "  ❌ config.js is NOT readable"
    PASS=false
fi

# Check 2: index.js is readable
if [ -r "$FOUND_DIR/src/index.js" ]; then
    echo "  ✅ index.js is readable"
else
    echo "  ❌ index.js is NOT readable"
    PASS=false
fi

# Check 3: node_modules is accessible
if [ -d "$FOUND_DIR/node_modules" ]; then
    if [ -r "$FOUND_DIR/node_modules" ] && [ -x "$FOUND_DIR/node_modules" ]; then
        echo "  ✅ node_modules is accessible"
    else
        echo "  ❌ node_modules is NOT accessible"
        PASS=false
    fi
fi

# Check 4: Service is actually responding
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "503" ]; then
    echo "  ✅ Auth service is responding (HTTP $HEALTH)"
else
    echo "  ❌ Auth service is NOT responding (HTTP $HEALTH)"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 01: PASSED!             ║"
    echo "║  Nice work. The auth service is back.║"
    echo "╚══════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 01: NOT FIXED YET       ║"
    echo "║  Keep investigating...               ║"
    echo "╚══════════════════════════════════════╝"
fi
