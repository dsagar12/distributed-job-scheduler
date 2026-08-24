const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const requestIdMiddleware = require('./middleware/request-id');
const errorHandler = require('./middleware/error-handler');
const routes = require('./routes');
const setupSwagger = require('./swagger/swagger');

const app = express();

// Security and basic middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-project-id', 'x-organization-id', 'x-request-id', 'x-api-key', '*'],
  exposedHeaders: ['*'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status - :response-time ms (reqId: :res[x-request-id])', {
    stream: {
      write: (message) => logger.info('HTTP', message.trim()),
    },
  }));
}

// Swagger OpenAPI Documentation
setupSwagger(app);

// Mount API v1 router
app.use('/api/v1', routes);
app.use('/api', routes); // Alias for convenience

// Root health & welcome
app.get('/', (req, res) => {
  res.json({
    name: 'Distributed Job Scheduler API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: '/api/v1',
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
