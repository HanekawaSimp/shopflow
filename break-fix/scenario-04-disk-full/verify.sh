#!/bin/bash
# Scenario 04: Verify fix

echo "Verifying Scenario 04 fix..."
echo ""

PASS=true

# Check 1: Junk files removed
if [ -d "/var/log/.shopflow-debug-dump" ]; then
    SIZE=$(du -sm "/var/log/.shopflow-debug-dump" 2>/dev/null | awk '{print $1}')
    if [ "$SIZE" -gt 10 ] 2>/dev/null; then
        echo "  ❌ Hidden junk directory still exists (/var/log/.shopflow-debug-dump — ${SIZE}MB)"
        PASS=false
    else
        echo "  ✅ Hidden junk directory cleaned up"
    fi
else
    echo "  ✅ Hidden junk directory removed"
fi

# Check 2: Core dump removed
CORE_FILES=$(find /tmp -name ".core.shopflow.*" -size +100M 2>/dev/null)
if [ -n "$CORE_FILES" ]; then
    echo "  ❌ Core dump files still in /tmp"
    PASS=false
else
    echo "  ✅ Core dump files cleaned up"
fi

# Check 3: Verbose log cleaned
if [ -f "/var/log/shopflow-verbose.log" ]; then
    SIZE=$(du -sm "/var/log/shopflow-verbose.log" 2>/dev/null | awk '{print $1}')
    if [ "$SIZE" -gt 10 ] 2>/dev/null; then
        echo "  ❌ Oversized log file still exists (/var/log/shopflow-verbose.log — ${SIZE}MB)"
        PASS=false
    else
        echo "  ✅ Verbose log file cleaned up"
    fi
else
    echo "  ✅ Verbose log file removed"
fi

# Check 4: Disk usage reasonable
USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USAGE" -lt 80 ]; then
    echo "  ✅ Disk usage at ${USAGE}% (healthy)"
else
    echo "  ⚠️  Disk usage still at ${USAGE}% (should be under 80%)"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 04: PASSED!                     ║"
    echo "║  Disk space recovered.                       ║"
    echo "╚══════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 04: NOT FIXED YET               ║"
    echo "║  Some junk files remain. Keep looking.       ║"
    echo "╚══════════════════════════════════════════════╝"
fi
