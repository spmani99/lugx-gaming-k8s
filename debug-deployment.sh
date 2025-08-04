#!/bin/bash

echo "🔍 DEBUGGING FRONTEND DEPLOYMENT ISSUES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📊 1. Checking cluster nodes:"
kubectl get nodes -o wide

echo ""
echo "📊 2. Checking node resources:"
kubectl describe nodes

echo ""
echo "📊 3. Checking frontend pods:"
kubectl get pods -l app=frontend -o wide

echo ""
echo "📊 4. Checking pod events:"
kubectl get events --sort-by=.metadata.creationTimestamp | grep frontend

echo ""
echo "📊 5. Describing frontend pods:"
kubectl describe pods -l app=frontend

echo ""
echo "📊 6. Checking deployments:"
kubectl get deployments

echo ""
echo "📊 7. Describing frontend deployment:"
kubectl describe deployment frontend-deployment

echo ""
echo "📊 8. Checking if image can be pulled:"
kubectl run test-frontend --image=spmani99/frontend:latest --dry-run=client -o yaml

echo ""
echo "🔍 DIAGNOSTIC COMPLETE - Check output above for issues"