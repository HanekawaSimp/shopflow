#!/bin/bash
# Scenario 05: Verify fix

echo "Verifying Scenario 05 fix..."
echo ""

PASS=true

# Check 1: No bogus hosts entries
if grep -q "10.255.255.1" /etc/hosts 2>/dev/null; then
    echo "  ❌ Bogus entries still in /etc/hosts"
    PASS=false
else
    echo "  ✅ /etc/hosts looks clean"
fi

# Check 2: No systemd overrides with wrong URLs
if [ -f /etc/systemd/system/shopflow-product.service.d/override.conf ]; then
    if grep -q "10.255.255.1" /etc/systemd/system/shopflow-product.service.d/override.conf; then
        echo "  ❌ Product service systemd override still has wrong URL"
        PASS=false
    else
        echo "  ✅ Product service systemd config clean"
    fi
else
    echo "  ✅ No bad systemd override for product service"
fi

# Check 3: No .env files with wrong URLs
SERVICE_DIRS=(
    "/home/sahil/coding/shopflow"
    "/opt/shopflow"
    "/home/ubuntu/shopflow"
)

for dir in "${SERVICE_DIRS[@]}"; do
    if [ -f "$dir/product-service/.env" ] && grep -q "10.255.255.1" "$dir/product-service/.env"; then
        echo "  ❌ Product service .env has wrong AUTH_SERVICE_URL"
        PASS=false
    fi
    if [ -f "$dir/order-service/.env" ] && grep -q "10.255.255.1" "$dir/order-service/.env"; then
        echo "  ❌ Order service .env has wrong URLs"
        PASS=false
    fi
done

# Check 4: Product service can reach auth service
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@shopflow.io","password":"admin12345"}' 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "  ✅ Auth service login works"
    
    # Try to access protected route on product service
    RESULT=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3002/api/products \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    if [ "$RESULT" = "200" ]; then
        echo "  ✅ Product service can verify tokens via auth service"
    else
        echo "  ❌ Product service still can't reach auth service (HTTP $RESULT)"
        PASS=false
    fi
else
    echo "  ❌ Can't login to auth service"
    PASS=false
fi

echo ""
if [ "$PASS" = true ]; then
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ✅ SCENARIO 05: PASSED!                         ║"
    echo "║  Inter-service communication restored.           ║"
    echo "╚══════════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════════╗"
    echo "║  ❌ SCENARIO 05: NOT FIXED YET                   ║"
    echo "║  Services still can't talk to each other.        ║"
    echo "╚══════════════════════════════════════════════════╝"
fi
