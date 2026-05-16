#!/bin/bash
# Scenario 06: Verify fix

echo "Verifying Scenario 06 fix..."
echo ""

PASS=true

# Check 1: Can reach product service
RESULT=$(curl -s --connect-timeout 3 -o /dev/null -w "%{http_code}" http://localhost:3002/api/health 2>/dev/null)
if [ "$RESULT" = "200" ] || [ "$RESULT" = "503" ]; then
    echo "  ✅ Product service reachable (HTTP $RESULT)"
else
    echo "  ❌ Product service unreachable (HTTP $RESULT)"
    PASS=false
fi

# Check 2: Redis is accessible
if command -v redis-cli &>/dev/null; then
    if redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "  ✅ Redis is accessible"
    else
        echo "  ❌ Redis is blocked"
        PASS=false
    fi
else
    # Try nc
    if echo "PING" | nc -w 2 localhost 6379 2>/dev/null | grep -q "PONG"; then
        echo "  ✅ Redis is accessible"
    else
        echo "  ❌ Redis is blocked"
        PASS=false
    fi
fi

# Check 3: No DROP rules for our ports
BLOCKED=$(iptables -L INPUT -n 2>/dev/null | grep -E "DROP.*dpt:(3001|3002|3003|6379)" || true)
if [ -z "$BLOCKED" ]; then
    echo "  ✅ No iptables DROP rules blocking service ports"
else
    echo "  ❌ Still have DROP rules for service ports"
    PASS=false
fi

# Check 4: No REJECT rules for auth service
REJECT_RULES=$(iptables -L OUTPUT -n 2>/dev/null | grep -E "REJECT.*dpt:3001" || true)
if [ -z "$REJECT_RULES" ]; then
    echo "  ✅ No REJECT rules blocking auth service"
else
    echo "  ❌ Still have REJECT rules for auth service"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 06: PASSED!                     ║"
    echo "║  Firewall rules fixed.                       ║"
    echo "╚══════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 06: NOT FIXED YET               ║"
    echo "║  Check iptables -L -n carefully.             ║"
    echo "╚══════════════════════════════════════════════╝"
fi
