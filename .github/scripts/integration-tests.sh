#!/bin/bash
# 🧪 Lugx Gaming Integration Test Suite

set -e

ENVIRONMENT=${1:-staging}
NAMESPACE_SUFFIX=${2:-""}
NAMESPACE="lugx-${ENVIRONMENT}${NAMESPACE_SUFFIX:+-$NAMESPACE_SUFFIX}"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🧪 Starting Lugx Gaming Integration Tests"
echo "=========================================="
echo "🎯 Environment: $ENVIRONMENT"
echo "📦 Namespace: $NAMESPACE"
echo "⏰ Timestamp: $TIMESTAMP"

# Create test results directory
mkdir -p $TEST_RESULTS_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Helper function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🔍 Running: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo "PASS,$test_name,$TIMESTAMP" >> $TEST_RESULTS_DIR/results.csv
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
        echo "FAIL,$test_name,$TIMESTAMP" >> $TEST_RESULTS_DIR/results.csv
    fi
}

# Test 1: Pod Health Check
test_pod_health() {
    echo "🏥 Checking if all pods are running..."
    
    services=("frontend" "game-service" "order-service" "analytics-service")
    
    for service in "${services[@]}"; do
        local pod_count=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running --no-headers | wc -l)
        
        if [ "$pod_count" -ge 1 ]; then
            echo "  ✅ $service: $pod_count pod(s) running"
        else
            echo "  ❌ $service: No running pods found"
            return 1
        fi
    done
    
    return 0
}

# Test 2: Service Connectivity
test_service_connectivity() {
    echo "🔗 Testing service connectivity..."
    
    # Test frontend service
    local frontend_response=$(kubectl exec -n $NAMESPACE deployment/frontend -- curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ || echo "000")
    
    if [ "$frontend_response" = "200" ]; then
        echo "  ✅ Frontend service responding"
    else
        echo "  ❌ Frontend service not responding (HTTP $frontend_response)"
        return 1
    fi
    
    # Test game service
    local game_response=$(kubectl exec -n $NAMESPACE deployment/game-service-deployment -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
    
    if [ "$game_response" = "200" ]; then
        echo "  ✅ Game service responding"
    else
        echo "  ❌ Game service not responding (HTTP $game_response)"
        return 1
    fi
    
    # Test order service
    local order_response=$(kubectl exec -n $NAMESPACE deployment/order-service-deployment -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health || echo "000")
    
    if [ "$order_response" = "200" ]; then
        echo "  ✅ Order service responding"
    else
        echo "  ❌ Order service not responding (HTTP $order_response)"
        return 1
    fi
    
    # Test analytics service
    local analytics_response=$(kubectl exec -n $NAMESPACE deployment/analytics-service-deployment -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/ || echo "000")
    
    if [ "$analytics_response" = "200" ]; then
        echo "  ✅ Analytics service responding"
    else
        echo "  ❌ Analytics service not responding (HTTP $analytics_response)"
        return 1
    fi
    
    return 0
}

# Test 3: Database Connectivity
test_database_connectivity() {
    echo "🗄️ Testing database connectivity..."
    
    # Test Game Service DB Connection
    local game_db_test=$(kubectl exec -n $NAMESPACE deployment/game-service-deployment -- node -e "
        const mysql = require('mysql2/promise');
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        connection.execute('SELECT 1').then(() => {
            console.log('Connected');
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    " 2>/dev/null || echo "Failed")
    
    if [ "$game_db_test" = "Connected" ]; then
        echo "  ✅ Game service database connection"
    else
        echo "  ❌ Game service database connection failed"
        return 1
    fi
    
    # Test Order Service DB Connection
    local order_db_test=$(kubectl exec -n $NAMESPACE deployment/order-service-deployment -- node -e "
        const mysql = require('mysql2/promise');
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        connection.execute('SELECT 1').then(() => {
            console.log('Connected');
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    " 2>/dev/null || echo "Failed")
    
    if [ "$order_db_test" = "Connected" ]; then
        echo "  ✅ Order service database connection"
    else
        echo "  ❌ Order service database connection failed"
        return 1
    fi
    
    return 0
}

# Test 4: ClickHouse Analytics Connectivity
test_clickhouse_connectivity() {
    echo "📊 Testing ClickHouse analytics connectivity..."
    
    # Check if HyperDX ClickHouse is accessible
    local clickhouse_pods=$(kubectl get pods -n hyperdx -l app.kubernetes.io/name=clickhouse --no-headers | wc -l)
    
    if [ "$clickhouse_pods" -ge 1 ]; then
        echo "  ✅ ClickHouse pods running: $clickhouse_pods"
        
        # Test analytics service connection to ClickHouse
        local analytics_ch_test=$(kubectl exec -n $NAMESPACE deployment/analytics-service-deployment -- node -e "
            const { ClickHouse } = require('clickhouse');
            const clickhouse = new ClickHouse({
                url: process.env.CLICKHOUSE_URL,
                port: 8123,
                debug: false,
                basicAuth: {
                    username: process.env.CLICKHOUSE_USER,
                    password: process.env.CLICKHOUSE_PASSWORD,
                },
            });
            clickhouse.query('SELECT 1').toPromise().then(() => {
                console.log('Connected');
                process.exit(0);
            }).catch(() => {
                process.exit(1);
            });
        " 2>/dev/null || echo "Failed")
        
        if [ "$analytics_ch_test" = "Connected" ]; then
            echo "  ✅ Analytics service ClickHouse connection"
        else
            echo "  ❌ Analytics service ClickHouse connection failed"
            return 1
        fi
    else
        echo "  ❌ No ClickHouse pods found"
        return 1
    fi
    
    return 0
}

# Test 5: End-to-End User Journey
test_user_journey() {
    echo "🎮 Testing end-to-end user journey..."
    
    # Set up port forwarding for testing
    kubectl port-forward -n $NAMESPACE service/frontend 8080:80 &
    PORT_FORWARD_PID=$!
    sleep 5
    
    # Test home page
    local home_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ || echo "000")
    
    if [ "$home_response" = "200" ]; then
        echo "  ✅ Home page accessible"
    else
        echo "  ❌ Home page not accessible (HTTP $home_response)"
        kill $PORT_FORWARD_PID 2>/dev/null
        return 1
    fi
    
    # Test analytics tracking
    local analytics_response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"userId":"test_user","sessionId":"test_session","pageUrl":"/test","pageTitle":"Test Page"}' \
        -o /dev/null -w "%{http_code}" \
        http://localhost:8080/api/analytics/track/pageview || echo "000")
    
    if [ "$analytics_response" = "200" ]; then
        echo "  ✅ Analytics tracking working"
    else
        echo "  ❌ Analytics tracking failed (HTTP $analytics_response)"
        kill $PORT_FORWARD_PID 2>/dev/null
        return 1
    fi
    
    # Cleanup
    kill $PORT_FORWARD_PID 2>/dev/null
    return 0
}

# Test 6: Performance and Load Test
test_performance() {
    echo "⚡ Running performance tests..."
    
    # Set up port forwarding for load testing
    kubectl port-forward -n $NAMESPACE service/frontend 8081:80 &
    PORT_FORWARD_PID=$!
    sleep 5
    
    # Simple load test with curl
    echo "  🔄 Running 50 concurrent requests..."
    
    for i in {1..50}; do
        curl -s -o /dev/null http://localhost:8081/ &
    done
    wait
    
    # Check if service is still responsive
    local post_load_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/ || echo "000")
    
    kill $PORT_FORWARD_PID 2>/dev/null
    
    if [ "$post_load_response" = "200" ]; then
        echo "  ✅ Service responsive after load test"
        return 0
    else
        echo "  ❌ Service not responsive after load test (HTTP $post_load_response)"
        return 1
    fi
}

# Test 7: Security Test
test_security() {
    echo "🔒 Running security tests..."
    
    # Check for exposed secrets
    local secrets_exposed=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].env[?(@.valueFrom.secretKeyRef)]}' | wc -w)
    
    if [ "$secrets_exposed" -gt 0 ]; then
        echo "  ✅ Secrets properly configured: $secrets_exposed secret references"
    else
        echo "  ⚠️  No secret references found (might be hardcoded)"
    fi
    
    # Check resource limits
    local containers_with_limits=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].spec.containers[*].resources.limits}' | wc -w)
    
    if [ "$containers_with_limits" -gt 0 ]; then
        echo "  ✅ Resource limits configured"
    else
        echo "  ⚠️  No resource limits found"
    fi
    
    return 0
}

# Run all tests
echo -e "\n🚀 Executing Integration Test Suite..."
echo "======================================"

run_test "Pod Health Check" "test_pod_health"
run_test "Service Connectivity" "test_service_connectivity"
run_test "Database Connectivity" "test_database_connectivity"
run_test "ClickHouse Analytics" "test_clickhouse_connectivity"
run_test "End-to-End User Journey" "test_user_journey"
run_test "Performance Test" "test_performance"
run_test "Security Test" "test_security"

# Generate test summary
echo -e "\n📊 Test Results Summary"
echo "======================="
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo "📁 Results saved to: $TEST_RESULTS_DIR/results.csv"

# Save detailed results
cat > $TEST_RESULTS_DIR/summary.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "namespace": "$NAMESPACE",
  "tests_passed": $TESTS_PASSED,
  "tests_failed": $TESTS_FAILED,
  "total_tests": $((TESTS_PASSED + TESTS_FAILED)),
  "success_rate": $(echo "scale=2; $TESTS_PASSED * 100 / ($TESTS_PASSED + $TESTS_FAILED)" | bc -l),
  "failed_tests": $(printf '["%s"]' "${FAILED_TESTS[*]}" | sed 's/" "/", "/g')
}
EOF

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All integration tests passed!${NC}"
    exit 0
else
    echo -e "\n💥 ${RED}$TESTS_FAILED test(s) failed!${NC}"
    echo -e "Failed tests: ${FAILED_TESTS[*]}"
    exit 1
fi