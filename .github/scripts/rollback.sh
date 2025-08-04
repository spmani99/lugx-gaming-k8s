#!/bin/bash

# Rollback Script for Lugx Gaming Platform
# Usage: ./rollback.sh [namespace]

set -e

NAMESPACE=${1:-default}

echo "🔄 Rollback Script for Lugx Gaming Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace: $NAMESPACE"

SERVICES=("frontend" "game-service" "order-service" "analytics-service")

# Check if rollback is needed
echo "🔍 Checking deployment status before rollback..."
FAILED_DEPLOYMENTS=0

for service in "${SERVICES[@]}"; do
    DEPLOYMENT_STATUS=$(kubectl rollout status deployment/${service}-deployment -n $NAMESPACE --timeout=10s 2>/dev/null || echo "FAILED")
    if [[ "$DEPLOYMENT_STATUS" == *"FAILED"* ]] || [[ "$DEPLOYMENT_STATUS" == *"error"* ]]; then
        echo "❌ $service deployment is unhealthy"
        FAILED_DEPLOYMENTS=$((FAILED_DEPLOYMENTS + 1))
    else
        echo "✅ $service deployment is healthy"
    fi
done

if [ "$FAILED_DEPLOYMENTS" -eq 0 ]; then
    echo "✅ All deployments are healthy. No rollback needed."
    exit 0
fi

echo ""
echo "⚠️  Found $FAILED_DEPLOYMENTS failed deployments. Initiating rollback..."

# Perform rollback for each service
for service in "${SERVICES[@]}"; do
    echo ""
    echo "🔄 Rolling back $service..."
    
    # Check if deployment exists
    if kubectl get deployment ${service}-deployment -n $NAMESPACE >/dev/null 2>&1; then
        # Get rollout history
        echo "📋 Rollout history for $service:"
        kubectl rollout history deployment/${service}-deployment -n $NAMESPACE || true
        
        # Perform rollback
        echo "⏪ Executing rollback for $service..."
        kubectl rollout undo deployment/${service}-deployment -n $NAMESPACE
        
        # Wait for rollback to complete
        echo "⏳ Waiting for $service rollback to complete..."
        kubectl rollout status deployment/${service}-deployment -n $NAMESPACE --timeout=300s
        
        # Verify rollback success
        PODS_READY=$(kubectl get deployment ${service}-deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        PODS_DESIRED=$(kubectl get deployment ${service}-deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
        
        if [ "$PODS_READY" = "$PODS_DESIRED" ]; then
            echo "✅ $service rollback completed successfully"
        else
            echo "❌ $service rollback may have issues (Ready: $PODS_READY, Desired: $PODS_DESIRED)"
        fi
    else
        echo "⚠️  Deployment ${service}-deployment not found in namespace $NAMESPACE"
    fi
done

echo ""
echo "🔍 Post-rollback health check..."
kubectl get pods -n $NAMESPACE
kubectl get deployments -n $NAMESPACE

echo ""
echo "📋 Recent events after rollback:"
kubectl get events -n $NAMESPACE --sort-by=.metadata.creationTimestamp | tail -10

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Rollback process completed for namespace: $NAMESPACE"
echo "🔍 Please verify service functionality and monitor for stability"