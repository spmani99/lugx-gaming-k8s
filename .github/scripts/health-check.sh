#!/bin/bash

# Health Check Script for Lugx Gaming Platform
# Usage: ./health-check.sh [namespace]

set -e

NAMESPACE=${1:-default}

echo "🏥 Health Check for Lugx Gaming Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace: $NAMESPACE"

# Check 1: Pod Health
echo "🔍 Check 1: Pod Health Status"
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
RUNNING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)

echo "Total Pods: $TOTAL_PODS | Running Pods: $RUNNING_PODS"

if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    echo "✅ All pods are healthy and running"
else
    echo "⚠️  Pod health issues detected:"
    kubectl get pods -n $NAMESPACE 2>/dev/null || true
fi

# Check 2: Service Readiness
echo ""
echo "🌐 Check 2: Service Readiness"
SERVICES=("frontend" "game-service" "order-service" "analytics-service")

for service in "${SERVICES[@]}"; do
    SERVICE_EXISTS=$(kubectl get service $service -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [ "$SERVICE_EXISTS" -eq 1 ]; then
        ENDPOINTS=$(kubectl get endpoints $service -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
        if [ "$ENDPOINTS" -gt 0 ]; then
            echo "✅ $service: Ready ($ENDPOINTS endpoints)"
        else
            echo "❌ $service: No endpoints available"
        fi
    else
        echo "❌ $service: Service not found"
    fi
done

# Check 3: Deployment Status
echo ""
echo "📦 Check 3: Deployment Status"
kubectl get deployments -n $NAMESPACE 2>/dev/null || echo "No deployments found"

# Check 4: Resource Usage
echo ""
echo "💾 Check 4: Resource Usage"
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics not available"

# Check 5: Recent Events
echo ""
echo "📋 Check 5: Recent Events (Last 5 minutes)"
kubectl get events -n $NAMESPACE --sort-by=.metadata.creationTimestamp --field-selector type!=Normal 2>/dev/null | tail -10 || echo "No recent warning/error events"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Health check completed for namespace: $NAMESPACE"