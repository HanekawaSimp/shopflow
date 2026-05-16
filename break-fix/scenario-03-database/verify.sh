#!/bin/bash
# Scenario 03: Verify fix

echo "Verifying Scenario 03 fix..."
echo ""

PASS=true

# Check 1: PostgreSQL is running
if systemctl is-active postgresql &>/dev/null || pgrep -x postgres &>/dev/null; then
    echo "  ✅ PostgreSQL is running"
else
    echo "  ❌ PostgreSQL is NOT running"
    PASS=false
fi

# Check 2: PostgreSQL is listening on port 5432
PG_PORT=$(ss -tlnp | grep ":5432 " || true)
if [ -n "$PG_PORT" ]; then
    echo "  ✅ PostgreSQL listening on port 5432"
else
    echo "  ❌ PostgreSQL is NOT on port 5432"
    PASS=false
fi

# Check 3: Can connect to PostgreSQL
if sudo -u postgres psql -c "SELECT 1" &>/dev/null; then
    echo "  ✅ Can connect to PostgreSQL"
else
    echo "  ❌ Cannot connect to PostgreSQL"
    PASS=false
fi

# Check 4: Auth service health
AUTH_HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$AUTH_HEALTH" | grep -q '"connected": *true\|"connected":true'; then
    echo "  ✅ Auth service DB connection healthy"
else
    echo "  ❌ Auth service cannot reach database"
    PASS=false
fi

# Check 5: Product service health
PROD_HEALTH=$(curl -s http://localhost:3002/api/health 2>/dev/null)
if echo "$PROD_HEALTH" | grep -q '"connected": *true\|"connected":true'; then
    echo "  ✅ Product service DB connection healthy"
else
    echo "  ❌ Product service cannot reach database"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 03: PASSED!                     ║"
    echo "║  Database connectivity restored.             ║"
    echo "╚══════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 03: NOT FIXED YET               ║"
    echo "║  Keep investigating...                       ║"
    echo "╚══════════════════════════════════════════════╝"
fi
