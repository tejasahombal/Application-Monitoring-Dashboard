const express = require('express');
const { Kafka } = require('kafkajs');
const client = require('prom-client');
const winston = require('winston');
const bodyParser = require('body-parser');

// Initialize Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'api_' });

// Create custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const errorCounter = new client.Counter({
  name: 'api_errors_total',
  help: 'Count of API errors',
  labelNames: ['type']
});

const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Count of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Initialize Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'api-server',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Middleware to track request metrics
app.use(async (req, res, next) => {
  const start = Date.now();

  // Add response hook to track metrics
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    
    // Record request duration
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration / 1000);

    // Record request count
    requestCounter
      .labels(req.method, route, res.statusCode)
      .inc();

    // Send log to Kafka
    const logMessage = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip
    };

    producer.send({
      topic: 'api-logs',
      messages: [
        { value: JSON.stringify(logMessage) },
      ],
    }).catch(e => logger.error('Error sending to Kafka:', e));
  });

  next();
});

// API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Validation middleware
const validateTask = (req, res, next) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'Task name is required' });
  }
  next();
};

const validateUser = (req, res, next) => {
  if (!req.body.name) {
    return res.status(400).json({ error: 'User name is required' });
  }
  next();
};

// Auth middleware
const checkAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth === 'invalid') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/tasks', (req, res) => {
  res.json([
    { id: 1, name: 'Task 1', completed: false },
    { id: 2, name: 'Task 2', completed: true }
  ]);
});

app.post('/api/tasks', validateTask, async (req, res) => {
  const task = { id: Date.now(), ...req.body };
  res.status(201).json(task);
});

app.get('/api/tasks/:id', (req, res) => {
  // Return 404 for specific IDs to simulate not found
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ id: req.params.id, name: 'Task ' + req.params.id, completed: false });
});

app.put('/api/tasks/:id', validateTask, (req, res) => {
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ id: req.params.id, name: 'Task ' + req.params.id, completed: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).send();
});

app.get('/api/users', checkAuth, (req, res) => {
  res.json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

app.post('/api/users', validateUser, async (req, res) => {
  const user = { id: Date.now(), ...req.body };
  res.status(201).json(user);
});

app.get('/api/users/:id', (req, res) => {
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'User not found' });
  }
  if (req.params.id === 'protected') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.json({ id: req.params.id, name: 'User ' + req.params.id });
});

app.put('/api/users/:id', validateUser, (req, res) => {
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: req.params.id, name: 'User ' + req.params.id });
});

app.delete('/api/users/:id', (req, res) => {
  if (req.params.id === '999') {
    return res.status(404).json({ error: 'User not found' });
  }
  if (req.params.id === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin user' });
  }
  res.status(204).send();
});

// Error simulation endpoints
app.get('/api/error', (req, res) => {
  throw new Error('Simulated server error');
});

app.post('/api/tasks/error', (req, res) => {
  throw new Error('Simulated task creation error');
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Internal server error:', err);
  errorCounter.labels('internal_error').inc();
  
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path
  };

  producer.send({
    topic: 'error-logs',
    messages: [
      { value: JSON.stringify(errorLog) },
    ],
  }).catch(e => logger.error('Error sending to Kafka:', e));

  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
  try {
    await producer.connect();
    logger.info('Connected to Kafka');
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 