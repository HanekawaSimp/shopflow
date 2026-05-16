#!/bin/bash
# Scenario 08: Verify fix

echo "Verifying Scenario 08 fix..."
echo ""

PASS=true

# Check 1: Service file exists and is valid
if systemctl cat shopflow-auth &>/dev/null; then
    echo "  ✅ shopflow-auth service file exists"
else
    echo "  ❌ shopflow-auth service file missing or invalid"
    PASS=false
fi

# Check 2: Service is active (running)
if systemctl is-active shopflow-auth &>/dev/null; then
    echo "  ✅ shopflow-auth is running"
else
    STATUS=$(systemctl is-active shopflow-auth 2>/dev/null)
    echo "  ❌ shopflow-auth is NOT running (status: $STATUS)"
    PASS=false
fi

# Check 3: Service is enabled (starts on boot)
if systemctl is-enabled shopflow-auth &>/dev/null; then
    echo "  ✅ shopflow-auth is enabled (will start on boot)"
else
    echo "  ⚠️  shopflow-auth is not enabled for boot (run: systemctl enable shopflow-auth)"
fi

# Check 4: WorkingDirectory is valid
WD=$(systemctl show shopflow-auth -p WorkingDirectory --value 2>/dev/null)
if [ -d "$WD" ]; then
    echo "  ✅ WorkingDirectory exists: $WD"
else
    echo "  ❌ WorkingDirectory does not exist: $WD"
    PASS=false
fi

# Check 5: User exists
SVC_USER=$(systemctl show shopflow-auth -p User --value 2>/dev/null)
if id "$SVC_USER" &>/dev/null; then
    echo "  ✅ Service user exists: $SVC_USER"
else
    echo "  ❌ Service user does not exist: $SVC_USER"
    PASS=false
fi

# Check 6: Health check responds
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "503" ]; then
    echo "  ✅ Auth service responding (HTTP $HEALTH)"
else
    echo "  ❌ Auth service not responding (HTTP $HEALTH)"
    PASS=false
fi

# Check 7: No crash-looping (service should be stable)
RESTARTS=$(systemctl show shopflow-auth -p NRestarts --value 2>/dev/null)
if [ "${RESTARTS:-0}" -lt 3 ]; then
    echo "  ✅ Service is stable (restarts: ${RESTARTS:-0})"
else
    echo "  ⚠️  Service has restarted ${RESTARTS} times (may still be unstable)"
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 08: PASSED!                         ║"
    echo "║  Systemd service fixed and running.              ║"
    echo "║  This is the hardest one — great job! 🎉         ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 08: NOT FIXED YET                       ║"
    echo "║  Check: journalctl -u shopflow-auth -n 30 --no-pager║"
    echo "╚══════════════════════════════════════════════════════╝"
fi
