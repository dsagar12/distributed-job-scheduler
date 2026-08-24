const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const eventsGateway = require('./src/websocket/events.gateway');

const server = http.createServer(app);

// Initialize Socket.IO WebSocket gateway
eventsGateway.init(server);

server.listen(env.PORT, () => {
  logger.info('API_BOOTSTRAP', `🚀 Express API Server running on: http://localhost:${env.PORT}`);
  logger.info('API_BOOTSTRAP', `📚 OpenAPI / Swagger documentation available at: http://localhost:${env.PORT}/api/docs`);
  logger.info('API_BOOTSTRAP', `⚡ WebSocket Gateway namespace active at: /events`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SERVER', 'SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('SERVER', 'HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SERVER', 'SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('SERVER', 'HTTP server closed');
  });
});

module.exports = server;
