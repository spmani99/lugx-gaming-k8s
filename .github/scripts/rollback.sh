#!/bin/bash
# 🔙 Lugx Gaming Rollback Script

set -e

NAMESPACE=${1:-default}
ROLLBACK_STEPS=${2:-1}

echo "🔙 Starting Rollback for Lugx Gaming"
echo "==================================="
echo "📦 Namespace: $NAMESPACE"
echo "⏪ Rollback Steps: $ROLLBACK_STEPS"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Services to rollback
SERVICES=("frontend" "game-service" "order-service" "analytics-service")

# Rollback function
rollback_service() {
    local service=$1
    local deployment="${service}-deployment"
    
    # Special case for frontend (no -deployment suffix)
    if [ "$service" = "frontend" ]; then
        deployment="frontend"
    fi
    
    echo -e "\n${BLUE}🔙 Rolling back $service...${NC}"
    
    # Check if deployment exists
    if ! kubectl get deployment $deployment -n $NAMESPACE > /dev/null 2>&1; then
        echo -e "${RED}❌ Deployment $deployment not found in namespace $NAMESPACE${NC}"
        return 1
    fi
    
    # Get current revision
    local current_revision=$(kubectl rollout history deployment/$deployment -n $NAMESPACE --output=jsonpath='{.metadata.generation}')
    echo "📊 Current revision: $current_revision"
    
    # Show rollout history
    echo "📜 Rollout history for $service:"
    kubectl rollout history deployment/$deployment -n $NAMESPACE
    
    # Perform rollback
    echo "⏪ Executing rollback..."
    kubectl rollout undo deployment/$deployment -n $NAMESPACE --to-revision=$((current_revision - ROLLBACK_STEPS))
    
    # Wait for rollback to complete
    echo "⏳ Waiting for rollback to complete..."
    if kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=300s; then
        echo -e "${GREEN}✅ $service rollback completed successfully${NC}"
    else
        echo -e "${RED}❌ $service rollback failed or timed out${NC}"
        return 1
    fi
    
    # Verify rollback
    local new_revision=$(kubectl rollout history deployment/$deployment -n $NAMESPACE --output=jsonpath='{.metadata.generation}')
    echo "📊 New revision: $new_revision"
    
    # Check pod health after rollback
    local ready_pods=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    local desired_pods=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [ "$ready_pods" = "$desired_pods" ] && [ "$ready_pods" != "" ]; then
        echo -e "${GREEN}✅ $service: $ready_pods/$desired_pods pods ready after rollback${NC}"
        return 0
    else
        echo -e "${RED}❌ $service: $ready_pods/$desired_pods pods ready after rollback${NC}"
        return 1
    fi
}

# Health check after rollback
health_check_after_rollback() {
    echo -e "\n${BLUE}🏥 Running health check after rollback...${NC}"
    
    # Wait a bit for services to stabilize
    sleep 30
    
    local all_healthy=true
    
    for service in "${SERVICES[@]}"; do
        local deployment="${service}-deployment"
        
        if [ "$service" = "frontend" ]; then
            deployment="frontend"
        fi
        
        # Check deployment status
        local ready=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
        local desired=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        
        if [ "$ready" = "$desired" ] && [ "$ready" != "" ] && [ "$ready" != "0" ]; then
            echo -e "${GREEN}✅ $service: Healthy after rollback${NC}"
        else
            echo -e "${RED}❌ $service: Unhealthy after rollback ($ready/$desired)${NC}"
            all_healthy=false
        fi
        
        # Test service endpoint
        local service_port=""
        case $service in
            "frontend") service_port="80" ;;
            "game-service") service_port="3001" ;;
            "order-service") service_port="3002" ;;
            "analytics-service") service_port="3003" ;;
        esac
        
        if [ -n "$service_port" ]; then
            local pod_name=$(kubectl get pods -n $NAMESPACE -l app=$service --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
            
            if [ -n "$pod_name" ]; then
                local response_code=$(kubectl exec -n $NAMESPACE $pod_name -- curl -s -o /dev/null -w "%{http_code}" http://localhost:$service_port/ 2>/dev/null || echo "000")
                
                if [ "$response_code" = "200" ]; then
                    echo -e "${GREEN}✅ $service: HTTP endpoint responding after rollback${NC}"
                else
                    echo -e "${RED}❌ $service: HTTP endpoint not responding after rollback (HTTP $response_code)${NC}"
                    all_healthy=false
                fi
            fi
        fi
    done
    
    return $([ "$all_healthy" = true ])
}

# Backup current state before rollback
backup_current_state() {
    echo -e "\n${BLUE}💾 Backing up current state before rollback...${NC}"
    
    local backup_dir="rollback-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p $backup_dir
    
    for service in "${SERVICES[@]}"; do
        local deployment="${service}-deployment"
        
        if [ "$service" = "frontend" ]; then
            deployment="frontend"
        fi
        
        # Backup deployment configuration
        kubectl get deployment $deployment -n $NAMESPACE -o yaml > $backup_dir/${service}-deployment.yaml 2>/dev/null || true
        
        # Backup service configuration
        kubectl get service $service -n $NAMESPACE -o yaml > $backup_dir/${service}-service.yaml 2>/dev/null || true
    done
    
    echo "💾 Current state backed up to: $backup_dir"
}

# Emergency rollback (rollback all services regardless of individual failures)
emergency_rollback() {
    echo -e "\n${RED}🚨 EMERGENCY ROLLBACK MODE${NC}"
    echo "Rolling back all services immediately..."
    
    for service in "${SERVICES[@]}"; do
        local deployment="${service}-deployment"
        
        if [ "$service" = "frontend" ]; then
            deployment="frontend"
        fi
        
        echo "🔙 Emergency rollback: $service"
        kubectl rollout undo deployment/$deployment -n $NAMESPACE || true
    done
    
    echo "⏳ Waiting for emergency rollback to complete..."
    sleep 60
    
    # Check final state
    kubectl get deployments -n $NAMESPACE
    kubectl get pods -n $NAMESPACE
}

# Main rollback execution
main() {
    echo -e "\n${BLUE}🚀 Starting rollback process...${NC}"
    
    # Check if we're in a critical failure state
    local critical_failures=0
    
    for service in "${SERVICES[@]}"; do
        local deployment="${service}-deployment"
        
        if [ "$service" = "frontend" ]; then
            deployment="frontend"
        fi
        
        local ready=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        
        if [ "$ready" = "0" ] || [ "$ready" = "" ]; then
            critical_failures=$((critical_failures + 1))
        fi
    done
    
    # If more than half the services are down, do emergency rollback
    if [ "$critical_failures" -gt 2 ]; then
        emergency_rollback
        return $?
    fi
    
    # Normal rollback process
    backup_current_state
    
    local rollback_success=true
    
    # Rollback services one by one
    for service in "${SERVICES[@]}"; do
        if ! rollback_service "$service"; then
            echo -e "${RED}❌ Failed to rollback $service${NC}"
            rollback_success=false
            # Continue with other services
        fi
    done
    
    # Health check after all rollbacks
    if health_check_after_rollback; then
        echo -e "\n${GREEN}🎉 Rollback completed successfully! All services healthy.${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️  Rollback completed but some services are unhealthy.${NC}"
        
        # Show current status
        echo -e "\n${BLUE}📊 Current system status:${NC}"
        kubectl get deployments -n $NAMESPACE
        kubectl get pods -n $NAMESPACE
        
        return 1
    fi
}

# Verify prerequisites
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl.${NC}"
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster.${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
    echo -e "${RED}❌ Namespace $NAMESPACE not found.${NC}"
    exit 1
fi

# Execute main rollback
main