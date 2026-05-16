#!/bin/bash
# Scenario 07: Verify fix

echo "Verifying Scenario 07 fix..."
echo ""

PASS=true

# Check 1: No rogue CPU hogs
HOGS=$(ps aux --sort=-%cpu | awk 'NR>1 && $3>50 {print $0}' | grep -v "verify\|ps\|awk" | head -5)
if [ -z "$HOGS" ]; then
    echo "  ✅ No CPU-hogging processes (>50% CPU)"
else
    echo "  ❌ Still have high-CPU processes:"
    echo "$HOGS" | while read line; do echo "      $line"; done
    PASS=false
fi

# Check 2: Rogue processes specifically killed
ROGUES=$(pgrep -f "log-compressor\|backup-job\.py" 2>/dev/null || true)
if [ -z "$ROGUES" ]; then
    echo "  ✅ Rogue processes terminated"
else
    echo "  ❌ Rogue processes still running (PIDs: $ROGUES)"
    PASS=false
fi

# Check 3: Memory hog gone
MEMHOG=$(ps aux --sort=-%mem | awk 'NR>1 && $4>10' | grep -v "postgres\|redis\|verify" | head -3)
if [ -z "$MEMHOG" ]; then
    echo "  ✅ No memory-hogging processes"
else
    echo "  ⚠️  High memory processes detected (may be legitimate):"
    echo "$MEMHOG" | while read line; do echo "      $line"; done
fi

# Check 4: Load average reasonable
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
LOAD_INT=${LOAD%.*}
CORES=$(nproc 2>/dev/null || echo 1)
if [ "${LOAD_INT:-0}" -le "$((CORES * 2))" ]; then
    echo "  ✅ Load average is reasonable ($LOAD)"
else
    echo "  ❌ Load average still high ($LOAD) for $CORES cores"
    PASS=false
fi

# Check 5: Services responding in reasonable time
START=$(date +%s%N)
curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
if [ "$ELAPSED" -lt 3000 ]; then
    echo "  ✅ Auth service responding in ${ELAPSED}ms"
else
    echo "  ❌ Auth service slow: ${ELAPSED}ms"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 07: PASSED!                     ║"
    echo "║  Server performance restored.                ║"
    echo "╚══════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 07: NOT FIXED YET               ║"
    echo "║  Check top/htop for remaining hogs.          ║"
    echo "╚══════════════════════════════════════════════╝"
fi
