# Minimal Observability Setup

This is a minimal, free observability setup for the Lugx Gaming application using only Prometheus and Grafana.

## What's Included

### 🎯 Core Components
- **Prometheus**: Collects and stores metrics
- **Grafana**: Visualizes metrics with dashboards

### 📊 What You Can Monitor
- **Service Health**: Are your services running?
- **Response Times**: How fast are your APIs responding?
- **Request Rates**: How many requests per second?
- **Error Rates**: How many errors are occurring?
- **Resource Usage**: CPU and memory usage

### 🚀 Quick Deploy

```bash
# Make the script executable
chmod +x minimal-deploy.sh

# Deploy monitoring
./minimal-deploy.sh
```

### 🌐 Access URLs
- **Grafana**: http://monitoring.lugx-games.local/grafana
- **Prometheus**: http://monitoring.lugx-games.local/prometheus

### 🔑 Login Credentials
- **Username**: admin
- **Password**: admin123

## Adding Metrics to Your Services

1. Install prom-client in your service:
```bash
npm install prom-client
```

2. Add the metrics middleware to your service:
```javascript
const { metricsMiddleware, metricsEndpoint } = require('./shared/metrics-middleware');

// Add middleware
app.use(metricsMiddleware);

// Add metrics endpoint
app.get('/metrics', metricsEndpoint);
```

## Why This Setup?

✅ **Free**: No licensing costs  
✅ **Lightweight**: Minimal resource usage  
✅ **Essential**: Covers the most important monitoring needs  
✅ **Simple**: Easy to deploy and maintain  

## What's NOT Included

❌ Alertmanager (alerts) - Can add later if needed  
❌ Node Exporter (system metrics) - Can add later if needed  
❌ Kube State Metrics (K8s metrics) - Can add later if needed  

This gives you 80% of monitoring value with 20% of the complexity! 