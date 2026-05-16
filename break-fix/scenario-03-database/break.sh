#!/bin/bash
# Scenario 03: Can't connect to database
# Run as root: sudo bash break.sh

set -e

echo "[BREAK] Scenario 03: Breaking database connectivity..."

PG_HBA=$(find /etc/postgresql -name pg_hba.conf 2>/dev/null | head -1)

if [ -z "$PG_HBA" ]; then
    # Try common locations
    for f in /etc/postgresql/*/main/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf; do
        if [ -f "$f" ]; then
            PG_HBA="$f"
            break
        fi
    done
fi

if [ -z "$PG_HBA" ]; then
    echo "[ERROR] Could not find pg_hba.conf. Is PostgreSQL installed?"
    exit 1
fi

echo "[BREAK] Found pg_hba.conf at: $PG_HBA"

# Back up original
cp "$PG_HBA" "${PG_HBA}.scenario03.bak"

# Replace all 'md5', 'scram-sha-256', and 'trust' with 'reject'
# This will block ALL local connections
sed -i 's/\bmd5\b/reject/g; s/\bscram-sha-256\b/reject/g; s/\btrust\b/reject/g' "$PG_HBA"

# Also change the PostgreSQL port to something wrong
PG_CONF=$(dirname "$PG_HBA")/postgresql.conf
if [ -f "$PG_CONF" ]; then
    cp "$PG_CONF" "${PG_CONF}.scenario03.bak"
    # Change the port
    sed -i "s/^#*port = .*/port = 5433/" "$PG_CONF"
fi

# Restart PostgreSQL to apply changes
systemctl restart postgresql 2>/dev/null || service postgresql restart 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  💥 Scenario 03 is live!                     ║"
echo "║  Read ticket.md for the support ticket.      ║"
echo "║  Fix the issue, then run verify.sh           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "⚠️  To fully reset if you get stuck:"
echo "    cp ${PG_HBA}.scenario03.bak $PG_HBA"
echo "    cp ${PG_CONF}.scenario03.bak $PG_CONF"
echo "    systemctl restart postgresql"
