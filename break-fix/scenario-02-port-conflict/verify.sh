#!/bin/bash
# Scenario 02: Verify fix

echo "Verifying Scenario 02 fix..."
echo ""

PASS=true

# Check 1: No rogue process on 3002
ROGUE=$(ss -tlnp | grep ":3002 " | grep -v "python\|gunicorn\|node" || true)
if [ -z "$ROGUE" ]; then
    echo "  ✅ No rogue process on port 3002"
else
    echo "  ❌ Unknown process still on port 3002"
    PASS=false
fi

# Check 2: Something IS listening on 3002 (the product service)
LISTENING=$(ss -tlnp | grep ":3002 " || true)
if [ -n "$LISTENING" ]; then
    echo "  ✅ Product service is listening on port 3002"
else
    echo "  ❌ Nothing listening on port 3002 — start the product service"
    PASS=false
fi

# Check 3: Health check responds
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/health 2>/dev/null)
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "503" ]; then
    echo "  ✅ Product service responding (HTTP $HEALTH)"
else
    echo "  ❌ Product service not responding (HTTP $HEALTH)"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 02: PASSED!                 ║"
    echo "║  Port conflict resolved.                 ║"
    echo "╚══════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 02: NOT FIXED YET           ║"
    echo "║  Keep investigating...                   ║"
    echo "╚══════════════════════════════════════════╝"
fi
