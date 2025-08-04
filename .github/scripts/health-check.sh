#!/bin/bash
# 🏥 Lugx Gaming Health Check Script

set -e

NAMESPACE=${1:-default}
TIMEOUT=${2:-300}
CHECK_INTERVAL=${3:-10}

echo "🏥 Starting Health Check for Lugx Gaming"
echo "========================================"
echo "📦 Namespace: $NAMESPACE"
echo "⏱️  Timeout: ${TIMEOUT}s"
echo "🔄 Check Interval: ${CHECK_INTERVAL}s"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Services to check
SERVICES=("frontend" "game-service" "order-service" "analytics-service")

# Health check function
check_service_health() {
    local service=$1
    local deployment="${service}-deployment"
    
    # Special case for frontend (no -deployment suffix)
    if [ "$service" = "frontend" ]; then
        deployment="frontend"
    fi
    
    echo -e "\n${BLUE}🔍 Checking $service health...${NC}"
    
    # Check if deployment exists
    if ! kubectl get deployment $deployment -n $NAMESPACE > /dev/null 2>&1; then
        echo -e "${RED}❌ Deployment $deployment not found in namespace $NAMESPACE${NC}"
        return 1
    fi
    
    # Check deployment status
    local desired=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    local ready=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    
    if [ "$ready" = "$desired" ] && [ "$ready" != "" ] && [ "$ready" != "0" ]; then
        echo -e "${GREEN}✅ $service: $ready/$desired replicas ready${NC}"
    else
        echo -e "${YELLOW}⏳ $service: $ready/$desired replicas ready (waiting...)${NC}"
        return 1
    fi
    
    # Check pod status
    local running_pods=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running --no-headers | wc -l)
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app=$service --no-headers | wc -l)
    
    if [ "$running_pods" -gt 0 ] && [ "$running_pods" = "$total_pods" ]; then
        echo -e "${GREEN}✅ $service: All $running_pods pods running${NC}"
    else
        echo -e "${YELLOW}⏳ $service: $running_pods/$total_pods pods running${NC}"
        
        # Show pod details for debugging
        echo "Pod status details:"
        kubectl get pods -n $NAMESPACE -l app=$service
        return 1
    fi
    
    # Test service endpoint (if available)
    local service_port=""
    case $service in
        "frontend")
            service_port="80"
            ;;
        "game-service")
            service_port="3001"
            ;;
        "order-service")
            service_port="3002"
            ;;
        "analytics-service")
            service_port="3003"
            ;;
    esac
    
    if [ -n "$service_port" ]; then
        local pod_name=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
        
        if [ -n "$pod_name" ]; then
            local response_code=$(kubectl exec -n $NAMESPACE $pod_name -- curl -s -o /dev/null -w "%{http_code}" http://localhost:$service_port/ 2>/dev/null || echo "000")
            
            if [ "$response_code" = "200" ]; then
                echo -e "${GREEN}✅ $service: HTTP endpoint responding (200)${NC}"
            else
                echo -e "${YELLOW}⚠️  $service: HTTP endpoint returned $response_code${NC}"
                # Don't fail health check for HTTP issues, pods might still be starting
            fi
        fi
    fi
    
    return 0
}

# Check all services
check_all_services() {
    local all_healthy=true
    
    for service in "${SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            all_healthy=false
        fi
    done
    
    return $([ "$all_healthy" = true ])
}

# Check external dependencies
check_dependencies() {
    echo -e "\n${BLUE}🔍 Checking external dependencies...${NC}"
    
    # Check HyperDX ClickHouse
    local clickhouse_pods=$(kubectl get pods -n hyperdx -l app.kubernetes.io/name=clickhouse --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    if [ "$clickhouse_pods" -gt 0 ]; then
        echo -e "${GREEN}✅ ClickHouse: $clickhouse_pods pod(s) running${NC}"
    else
        echo -e "${YELLOW}⚠️  ClickHouse: No running pods found${NC}"
    fi
    
    # Check HyperDX MongoDB
    local mongodb_pods=$(kubectl get pods -n hyperdx -l app.kubernetes.io/name=mongodb --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    if [ "$mongodb_pods" -gt 0 ]; then
        echo -e "${GREEN}✅ MongoDB: $mongodb_pods pod(s) running${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB: No running pods found${NC}"
    fi
}

# Main health check loop
main() {
    local start_time=$(date +%s)
    local end_time=$((start_time + TIMEOUT))
    
    echo -e "\n${BLUE}🚀 Starting health check loop...${NC}"
    
    while [ $(date +%s) -lt $end_time ]; do
        echo -e "\n${BLUE}⏰ Health check at $(date)${NC}"
        
        if check_all_services; then
            check_dependencies
            echo -e "\n${GREEN}🎉 All services are healthy!${NC}"
            
            # Final connectivity test
            echo -e "\n${BLUE}🔗 Running final connectivity test...${NC}"
            
            # Test inter-service communication
            local frontend_pod=$(kubectl get pods -n $NAMESPACE -l app=frontend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
            
            if [ -n "$frontend_pod" ]; then
                # Test if frontend can reach backend services
                local game_service_test=$(kubectl exec -n $NAMESPACE $frontend_pod -- curl -s -o /dev/null -w "%{http_code}" http://game-service:3001/health 2>/dev/null || echo "000")
                
                if [ "$game_service_test" = "200" ]; then
                    echo -e "${GREEN}✅ Inter-service communication working${NC}"
                else
                    echo -e "${YELLOW}⚠️  Inter-service communication issues detected${NC}"
                fi
            fi
            
            echo -e "\n${GREEN}✅ Health check completed successfully!${NC}"
            return 0
        fi
        
        echo -e "\n${YELLOW}⏳ Waiting ${CHECK_INTERVAL}s before next check...${NC}"
        sleep $CHECK_INTERVAL
    done
    
    echo -e "\n${RED}❌ Health check timed out after ${TIMEOUT}s${NC}"
    
    # Show current status for debugging
    echo -e "\n${BLUE}📊 Final status summary:${NC}"
    kubectl get deployments -n $NAMESPACE
    kubectl get pods -n $NAMESPACE
    
    return 1
}

# Execute main function
main