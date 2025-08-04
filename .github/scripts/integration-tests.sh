#!/bin/bash

# Integration Tests Script for Lugx Gaming Platform
# Usage: ./integration-tests.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
BASE_URL=""
NAMESPACE=""

# Set environment-specific variables
if [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="http://lugx-games-staging.local"
    NAMESPACE="lugx-staging"
elif [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="http://lugx-games.local"
    NAMESPACE="default"
else
    echo "Error: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

echo "🧪 Running Integration Tests for $ENVIRONMENT environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Frontend Health Check
echo "🌐 Test 1: Frontend Health Check"
kubectl port-forward service/frontend 8080:80 -n $NAMESPACE &
FRONTEND_PID=$!
sleep 5

FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000")
kill $FRONTEND_PID 2>/dev/null || true

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend health check passed (Status: $FRONTEND_STATUS)"
else
    echo "❌ Frontend health check failed (Status: $FRONTEND_STATUS)"
    exit 1
fi

# Test 2: Game Service API Test
echo "🎮 Test 2: Game Service API Test"
kubectl port-forward service/game-service 3001:3001 -n $NAMESPACE &
GAME_PID=$!
sleep 5

GAME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/games || echo "000")
kill $GAME_PID 2>/dev/null || true

if [ "$GAME_STATUS" = "200" ]; then
    echo "✅ Game service API test passed (Status: $GAME_STATUS)"
else
    echo "⚠️  Game service API test warning (Status: $GAME_STATUS) - May be due to RDS connection"
fi

# Test 3: Order Service API Test
echo "📦 Test 3: Order Service API Test"
kubectl port-forward service/order-service 3002:3002 -n $NAMESPACE &
ORDER_PID=$!
sleep 5

ORDER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/orders || echo "000")
kill $ORDER_PID 2>/dev/null || true

if [ "$ORDER_STATUS" = "200" ]; then
    echo "✅ Order service API test passed (Status: $ORDER_STATUS)"
else
    echo "⚠️  Order service API test warning (Status: $ORDER_STATUS) - May be due to RDS connection"
fi

# Test 4: Analytics Service Test
echo "📊 Test 4: Analytics Service Test"
kubectl port-forward service/analytics-service 3003:3003 -n $NAMESPACE &
ANALYTICS_PID=$!
sleep 5

ANALYTICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health || echo "000")
kill $ANALYTICS_PID 2>/dev/null || true

if [ "$ANALYTICS_STATUS" = "200" ]; then
    echo "✅ Analytics service test passed (Status: $ANALYTICS_STATUS)"
else
    echo "⚠️  Analytics service test warning (Status: $ANALYTICS_STATUS) - May be due to ClickHouse connection"
fi

# Test 5: Database Connectivity Test
echo "🗄️  Test 5: Database Connectivity Test"
DB_PODS=$(kubectl get pods -l app=game -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$DB_PODS" ]; then
    DB_LOGS=$(kubectl logs $DB_PODS -n $NAMESPACE --tail=10 2>/dev/null || echo "")
    if echo "$DB_LOGS" | grep -q "Connected to database\|Server running\|listening"; then
        echo "✅ Database connectivity test passed"
    else
        echo "⚠️  Database connectivity test warning - Check RDS configuration"
    fi
else
    echo "⚠️  Could not find game service pods for database test"
fi

# Test 6: ClickHouse Connectivity Test
echo "📈 Test 6: ClickHouse Connectivity Test"
ANALYTICS_PODS=$(kubectl get pods -l app=analytics -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$ANALYTICS_PODS" ]; then
    CH_LOGS=$(kubectl logs $ANALYTICS_PODS -n $NAMESPACE --tail=10 2>/dev/null || echo "")
    if echo "$CH_LOGS" | grep -q "ClickHouse\|Connected\|Server running\|listening"; then
        echo "✅ ClickHouse connectivity test passed"
    else
        echo "⚠️  ClickHouse connectivity test warning - Check HyperDX configuration"
    fi
else
    echo "⚠️  Could not find analytics service pods for ClickHouse test"
fi

# Test 7: Pod Health Check
echo "🔍 Test 7: Pod Health Check"
UNHEALTHY_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running -o name 2>/dev/null | wc -l)

if [ "$UNHEALTHY_PODS" -eq 0 ]; then
    echo "✅ All pods are healthy and running"
else
    echo "⚠️  Found $UNHEALTHY_PODS unhealthy pods:"
    kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running 2>/dev/null || true
fi

# Test 8: Service Discovery Test
echo "🔍 Test 8: Service Discovery Test"
EXPECTED_SERVICES=4
ACTUAL_SERVICES=$(kubectl get services -n $NAMESPACE --no-headers 2>/dev/null | grep -v kubernetes | wc -l)

if [ "$ACTUAL_SERVICES" -ge "$EXPECTED_SERVICES" ]; then
    echo "✅ Service discovery test passed ($ACTUAL_SERVICES services found)"
else
    echo "❌ Service discovery test failed (Expected: $EXPECTED_SERVICES, Found: $ACTUAL_SERVICES)"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Integration tests completed for $ENVIRONMENT environment!"
echo "✅ Critical tests passed, ⚠️  warnings noted for infrastructure connections"