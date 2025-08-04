#!/bin/bash
# 🔄 Lugx Gaming Periodic Reliability Tests

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RESULTS_DIR="test-results/periodic"
PRODUCTION_NAMESPACE="default"  # Adjust based on your production namespace

echo "🔄 Lugx Gaming Periodic Reliability Tests"
echo "=========================================="
echo "⏰ Timestamp: $TIMESTAMP"

# Create test results directory
mkdir -p $TEST_RESULTS_DIR

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Helper function for logging
log_test() {
    local level="$1"
    local test_name="$2"
    local message="$3"
    
    case $level in
        "PASS")
            echo -e "${GREEN}✅ PASS: $test_name - $message${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo "$TIMESTAMP,PASS,$test_name,$message" >> $TEST_RESULTS_DIR/periodic_results.csv
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL: $test_name - $message${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo "$TIMESTAMP,FAIL,$test_name,$message" >> $TEST_RESULTS_DIR/periodic_results.csv
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN: $test_name - $message${NC}"
            WARNINGS=$((WARNINGS + 1))
            echo "$TIMESTAMP,WARN,$test_name,$message" >> $TEST_RESULTS_DIR/periodic_results.csv
            ;;
    esac
}

# Test 1: System Resource Usage
test_resource_usage() {
    echo -e "\n${BLUE}📊 Checking system resource usage...${NC}"
    
    # Check CPU usage
    local cpu_usage=$(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum}' | sed 's/%//')
    
    if [ "$cpu_usage" -lt 80 ]; then
        log_test "PASS" "CPU_Usage" "CPU usage: ${cpu_usage}%"
    elif [ "$cpu_usage" -lt 90 ]; then
        log_test "WARN" "CPU_Usage" "High CPU usage: ${cpu_usage}%"
    else
        log_test "FAIL" "CPU_Usage" "Critical CPU usage: ${cpu_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(kubectl top nodes --no-headers | awk '{gsub(/Mi/, "", $5); sum+=$5} END {printf "%.0f", sum/1024}')
    
    if [ "$memory_usage" -lt 6 ]; then
        log_test "PASS" "Memory_Usage" "Memory usage: ${memory_usage}GB"
    elif [ "$memory_usage" -lt 8 ]; then
        log_test "WARN" "Memory_Usage" "High memory usage: ${memory_usage}GB"
    else
        log_test "FAIL" "Memory_Usage" "Critical memory usage: ${memory_usage}GB"
    fi
    
    # Check pod resource limits compliance
    local pods_without_limits=$(kubectl get pods -n $PRODUCTION_NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources.limits}{"\n"}{end}' | grep -c -v 'map\|cpu\|memory' || echo 0)
    
    if [ "$pods_without_limits" -eq 0 ]; then
        log_test "PASS" "Resource_Limits" "All pods have resource limits"
    else
        log_test "WARN" "Resource_Limits" "$pods_without_limits pods without resource limits"
    fi
}

# Test 2: Service Availability and Response Times
test_service_availability() {
    echo -e "\n${BLUE}🌐 Testing service availability and response times...${NC}"
    
    services=("frontend:80" "game-service:3001" "order-service:3002" "analytics-service:3003")
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        
        # Check if service exists
        if kubectl get service $service -n $PRODUCTION_NAMESPACE > /dev/null 2>&1; then
            # Measure response time
            local start_time=$(date +%s%N)
            local response_code=$(kubectl exec -n $PRODUCTION_NAMESPACE deployment/${service}-deployment -- curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/ 2>/dev/null || echo "000")
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
            
            if [ "$response_code" = "200" ]; then
                if [ "$response_time" -lt 1000 ]; then
                    log_test "PASS" "${service}_Availability" "HTTP 200, ${response_time}ms"
                elif [ "$response_time" -lt 3000 ]; then
                    log_test "WARN" "${service}_Availability" "HTTP 200, slow response: ${response_time}ms"
                else
                    log_test "FAIL" "${service}_Availability" "HTTP 200, very slow: ${response_time}ms"
                fi
            else
                log_test "FAIL" "${service}_Availability" "HTTP $response_code"
            fi
        else
            log_test "FAIL" "${service}_Availability" "Service not found"
        fi
    done
}

# Test 3: Database Connectivity and Performance
test_database_performance() {
    echo -e "\n${BLUE}🗄️ Testing database connectivity and performance...${NC}"
    
    # Test Game Service Database
    local game_db_response_time=$(kubectl exec -n $PRODUCTION_NAMESPACE deployment/game-service-deployment -- node -e "
        const mysql = require('mysql2/promise');
        const start = Date.now();
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        connection.execute('SELECT 1').then(() => {
            console.log(Date.now() - start);
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    " 2>/dev/null || echo "-1")
    
    if [ "$game_db_response_time" != "-1" ]; then
        if [ "$game_db_response_time" -lt 100 ]; then
            log_test "PASS" "Game_DB_Performance" "Response time: ${game_db_response_time}ms"
        elif [ "$game_db_response_time" -lt 500 ]; then
            log_test "WARN" "Game_DB_Performance" "Slow response: ${game_db_response_time}ms"
        else
            log_test "FAIL" "Game_DB_Performance" "Very slow: ${game_db_response_time}ms"
        fi
    else
        log_test "FAIL" "Game_DB_Performance" "Connection failed"
    fi
    
    # Test Order Service Database
    local order_db_response_time=$(kubectl exec -n $PRODUCTION_NAMESPACE deployment/order-service-deployment -- node -e "
        const mysql = require('mysql2/promise');
        const start = Date.now();
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });
        connection.execute('SELECT 1').then(() => {
            console.log(Date.now() - start);
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    " 2>/dev/null || echo "-1")
    
    if [ "$order_db_response_time" != "-1" ]; then
        if [ "$order_db_response_time" -lt 100 ]; then
            log_test "PASS" "Order_DB_Performance" "Response time: ${order_db_response_time}ms"
        elif [ "$order_db_response_time" -lt 500 ]; then
            log_test "WARN" "Order_DB_Performance" "Slow response: ${order_db_response_time}ms"
        else
            log_test "FAIL" "Order_DB_Performance" "Very slow: ${order_db_response_time}ms"
        fi
    else
        log_test "FAIL" "Order_DB_Performance" "Connection failed"
    fi
}

# Test 4: Analytics Data Pipeline Health
test_analytics_pipeline() {
    echo -e "\n${BLUE}📊 Testing analytics data pipeline health...${NC}"
    
    # Check ClickHouse connectivity
    local clickhouse_pods=$(kubectl get pods -n hyperdx -l app.kubernetes.io/name=clickhouse --field-selector=status.phase=Running --no-headers | wc -l)
    
    if [ "$clickhouse_pods" -gt 0 ]; then
        log_test "PASS" "ClickHouse_Availability" "$clickhouse_pods pod(s) running"
        
        # Test analytics service connection to ClickHouse
        local ch_connection_test=$(kubectl exec -n $PRODUCTION_NAMESPACE deployment/analytics-service-deployment -- curl -s -o /dev/null -w "%{http_code}" http://hyperdx-hdx-oss-v2-clickhouse.hyperdx.svc.cluster.local:8123/ 2>/dev/null || echo "000")
        
        if [ "$ch_connection_test" = "200" ]; then
            log_test "PASS" "ClickHouse_Connection" "Analytics service connected"
        else
            log_test "FAIL" "ClickHouse_Connection" "Connection failed (HTTP $ch_connection_test)"
        fi
    else
        log_test "FAIL" "ClickHouse_Availability" "No running pods"
    fi
    
    # Check S3 export functionality
    local recent_s3_files=$(aws s3 ls s3://lugx-analytics-demo/page-views/ --recursive | grep $(date +%Y-%m-%d) | wc -l)
    
    if [ "$recent_s3_files" -gt 0 ]; then
        log_test "PASS" "S3_Export" "$recent_s3_files files exported today"
    else
        log_test "WARN" "S3_Export" "No files exported today"
    fi
}

# Test 5: Security and Compliance
test_security_compliance() {
    echo -e "\n${BLUE}🔒 Testing security and compliance...${NC}"
    
    # Check for pods running as root
    local root_pods=$(kubectl get pods -n $PRODUCTION_NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}' | grep -c "^.*\t0$" || echo 0)
    
    if [ "$root_pods" -eq 0 ]; then
        log_test "PASS" "Security_RunAsUser" "No pods running as root"
    else
        log_test "FAIL" "Security_RunAsUser" "$root_pods pod(s) running as root"
    fi
    
    # Check for privileged containers
    local privileged_containers=$(kubectl get pods -n $PRODUCTION_NAMESPACE -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.securityContext.privileged}{"\n"}{end}{end}' | grep -c "true" || echo 0)
    
    if [ "$privileged_containers" -eq 0 ]; then
        log_test "PASS" "Security_Privileged" "No privileged containers"
    else
        log_test "FAIL" "Security_Privileged" "$privileged_containers privileged container(s)"
    fi
    
    # Check for secrets mounted properly
    local secrets_count=$(kubectl get secrets -n $PRODUCTION_NAMESPACE --no-headers | wc -l)
    
    if [ "$secrets_count" -gt 0 ]; then
        log_test "PASS" "Security_Secrets" "$secrets_count secret(s) configured"
    else
        log_test "WARN" "Security_Secrets" "No secrets found"
    fi
}

# Test 6: Disaster Recovery Readiness
test_disaster_recovery() {
    echo -e "\n${BLUE}🔄 Testing disaster recovery readiness...${NC}"
    
    # Check backup configurations
    local persistent_volumes=$(kubectl get pv --no-headers | wc -l)
    
    if [ "$persistent_volumes" -gt 0 ]; then
        log_test "PASS" "DR_Storage" "$persistent_volumes persistent volume(s) available"
    else
        log_test "WARN" "DR_Storage" "No persistent volumes found"
    fi
    
    # Check if all deployments have multiple replicas
    local single_replica_deployments=$(kubectl get deployments -n $PRODUCTION_NAMESPACE -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.replicas}{"\n"}{end}' | awk '$2 == 1 {count++} END {print count+0}')
    
    if [ "$single_replica_deployments" -eq 0 ]; then
        log_test "PASS" "DR_Replicas" "All deployments have multiple replicas"
    else
        log_test "WARN" "DR_Replicas" "$single_replica_deployments deployment(s) with single replica"
    fi
}

# Test 7: Performance Benchmarking
test_performance_benchmark() {
    echo -e "\n${BLUE}⚡ Running performance benchmarks...${NC}"
    
    # Simple load test on frontend
    kubectl port-forward -n $PRODUCTION_NAMESPACE service/frontend 8090:80 &
    PORT_FORWARD_PID=$!
    sleep 5
    
    # Run 10 concurrent requests and measure average response time
    local total_time=0
    local success_count=0
    
    for i in {1..10}; do
        local start_time=$(date +%s%N)
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/ 2>/dev/null || echo "000")
        local end_time=$(date +%s%N)
        
        if [ "$response_code" = "200" ]; then
            local request_time=$(( (end_time - start_time) / 1000000 ))
            total_time=$((total_time + request_time))
            success_count=$((success_count + 1))
        fi
    done
    
    kill $PORT_FORWARD_PID 2>/dev/null
    
    if [ "$success_count" -gt 0 ]; then
        local avg_response_time=$((total_time / success_count))
        
        if [ "$avg_response_time" -lt 500 ]; then
            log_test "PASS" "Performance_Benchmark" "Avg response time: ${avg_response_time}ms"
        elif [ "$avg_response_time" -lt 1000 ]; then
            log_test "WARN" "Performance_Benchmark" "Slow avg response: ${avg_response_time}ms"
        else
            log_test "FAIL" "Performance_Benchmark" "Very slow avg response: ${avg_response_time}ms"
        fi
    else
        log_test "FAIL" "Performance_Benchmark" "All requests failed"
    fi
}

# Run all periodic tests
echo -e "\n🚀 Running Periodic Reliability Tests..."
echo "======================================"

test_resource_usage
test_service_availability
test_database_performance
test_analytics_pipeline
test_security_compliance
test_disaster_recovery
test_performance_benchmark

# Generate summary report
echo -e "\n📊 Periodic Test Results Summary"
echo "================================"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"

# Calculate health score
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + WARNINGS))
if [ "$TOTAL_TESTS" -gt 0 ]; then
    HEALTH_SCORE=$(echo "scale=1; ($TESTS_PASSED * 100) / $TOTAL_TESTS" | bc -l)
    echo "🎯 System Health Score: ${HEALTH_SCORE}%"
else
    HEALTH_SCORE=0
    echo "🎯 System Health Score: Unknown"
fi

# Save comprehensive results
cat > $TEST_RESULTS_DIR/periodic_summary.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "production",
  "namespace": "$PRODUCTION_NAMESPACE",
  "tests_passed": $TESTS_PASSED,
  "tests_failed": $TESTS_FAILED,
  "warnings": $WARNINGS,
  "total_tests": $TOTAL_TESTS,
  "health_score": $HEALTH_SCORE,
  "test_type": "periodic_reliability"
}
EOF

# Determine exit code based on critical failures
if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All critical tests passed! System is healthy.${NC}"
    exit 0
elif [ "$TESTS_FAILED" -le 2 ]; then
    echo -e "\n⚠️  ${YELLOW}Some tests failed, but system is mostly functional.${NC}"
    exit 0  # Don't fail CI for minor issues in periodic tests
else
    echo -e "\n💥 ${RED}Multiple critical tests failed! System requires attention.${NC}"
    exit 1
fi