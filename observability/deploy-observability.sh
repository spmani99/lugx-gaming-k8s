#!/bin/bash

# Deploy Observability Infrastructure for Lugx Gaming
# This script deploys Prometheus, Grafana, Alertmanager, and related components

set -e

echo "🚀 Deploying Observability Infrastructure for Lugx Gaming..."

# Create observability namespace
echo "📦 Creating observability namespace..."
kubectl apply -f namespace.yaml

# Deploy RBAC resources
echo "🔐 Deploying RBAC resources..."
kubectl apply -f prometheus-rbac.yaml
kubectl apply -f kube-state-metrics.yaml

# Deploy Prometheus configuration
echo "⚙️  Deploying Prometheus configuration..."
kubectl apply -f prometheus-config.yaml

# Deploy Prometheus
echo "📊 Deploying Prometheus..."
kubectl apply -f prometheus-deployment.yaml

# Deploy Node Exporter
echo "🖥️  Deploying Node Exporter..."
kubectl apply -f node-exporter.yaml

# Deploy Alertmanager
echo "🚨 Deploying Alertmanager..."
kubectl apply -f alertmanager.yaml

# Deploy Grafana configuration
echo "📈 Deploying Grafana configuration..."
kubectl apply -f grafana-config.yaml

# Deploy Grafana
echo "📊 Deploying Grafana..."
kubectl apply -f grafana-deployment.yaml

# Deploy Ingress
echo "🌐 Deploying Observability Ingress..."
kubectl apply -f observability-ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n observability
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n observability
kubectl wait --for=condition=available --timeout=300s deployment/alertmanager -n observability
kubectl wait --for=condition=available --timeout=300s deployment/kube-state-metrics -n observability

echo "✅ Observability infrastructure deployed successfully!"
echo ""
echo "📋 Access URLs:"
echo "   Grafana: http://monitoring.lugx-games.local/grafana"
echo "   Prometheus: http://monitoring.lugx-games.local/prometheus"
echo "   Alertmanager: http://monitoring.lugx-games.local/alertmanager"
echo ""
echo "🔑 Grafana Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Default Dashboard: Lugx Gaming Overview"
echo ""
echo "🔍 To check the status of all components:"
echo "   kubectl get all -n observability"
echo ""
echo "📝 To view logs:"
echo "   kubectl logs -f deployment/prometheus -n observability"
echo "   kubectl logs -f deployment/grafana -n observability" 