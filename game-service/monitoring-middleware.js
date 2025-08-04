const prometheus = require('prom-client');

// Create a Registry to register the metrics
const register = new prometheus.Registry();

// Enable the collection of default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics for game service
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const gameOperationsTotal = new prometheus.Counter({
  name: 'game_operations_total',
  help: 'Total number of game operations',
  labelNames: ['operation', 'status']
});

// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(gameOperationsTotal);

// Middleware to track HTTP requests
const monitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Track request
  httpRequestsTotal.inc({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration / 1000
    );
  });
  
  next();
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

// Game operation tracking
const trackGameOperation = (operation, status = 'success') => {
  gameOperationsTotal.inc({ operation, status });
};

// Connection tracking
const trackConnection = (increment = true) => {
  if (increment) {
    activeConnections.inc();
  } else {
    activeConnections.dec();
  }
};

module.exports = {
  monitoringMiddleware,
  metricsEndpoint,
  trackGameOperation,
  trackConnection,
  register
}; 