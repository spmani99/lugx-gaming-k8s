#!/bin/bash

# Minimal Observability Setup for Lugx Gaming
# Only Prometheus + Grafana (free and essential)

set -e

echo "🚀 Deploying Minimal Observability (Prometheus + Grafana)..."

# Deploy everything in one go
echo "📦 Deploying monitoring components..."
kubectl apply -f simple-monitoring.yaml

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n monitoring
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n monitoring

echo "✅ Minimal observability deployed successfully!"
echo ""
echo "📋 Access URLs:"
echo "   Grafana: http://monitoring.lugx-games.local/grafana"
echo "   Prometheus: http://monitoring.lugx-games.local/prometheus"
echo ""
echo "🔑 Grafana Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🔍 Check status: kubectl get all -n monitoring" 