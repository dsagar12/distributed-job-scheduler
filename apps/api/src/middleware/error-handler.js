const logger = require('../config/logger');
const { sendError } = require('../utils/response');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'An unexpected error occurred';

  logger.error('ErrorHandler', `${req.method} ${req.originalUrl} - ${statusCode} ${message}`, {
    requestId: req.id,
    stack: statusCode >= 500 ? err.stack : undefined,
    errorDetails: err.errorDetails,
  });

  return sendError(res, err, statusCode);
}

module.exports = errorHandler;
