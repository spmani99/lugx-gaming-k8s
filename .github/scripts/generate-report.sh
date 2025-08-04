#!/bin/bash

# Generate Deployment Report for Lugx Gaming Platform
# Usage: ./generate-report.sh [namespace]

set -e

NAMESPACE=${1:-default}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')

echo "�� Generating Deployment Report for Lugx Gaming Platform"
echo "Generated: $TIMESTAMP"
echo "Namespace: $NAMESPACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deployment Summary
echo ""
echo "📋 DEPLOYMENT STATUS:"
kubectl get deployments -n $NAMESPACE 2>/dev/null || echo "No deployments found"

# Service Health
echo ""
echo "🏥 SERVICE HEALTH:"
kubectl get services -n $NAMESPACE 2>/dev/null || echo "No services found"

# Pod Status
echo ""
echo "🔍 POD STATUS:"
kubectl get pods -n $NAMESPACE 2>/dev/null || echo "No pods found"

# Resource Usage
echo ""
echo "💾 RESOURCE USAGE:"
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics not available"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment report completed"
