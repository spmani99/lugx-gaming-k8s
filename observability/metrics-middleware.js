const prometheus = require('prom-client');

// Create a Registry
const register = new prometheus.Registry();

// Enable default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

// Middleware to track requests
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Track request count
  httpRequestsTotal.inc({ 
    method: req.method, 
    route: req.route?.path || req.path, 
    status_code: res.statusCode 
  });
  
  // Track response time
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { 
        method: req.method, 
        route: req.route?.path || req.path, 
        status_code: res.statusCode 
      },
      duration
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
    res.status(500).end(err.message);
  }
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint
}; 