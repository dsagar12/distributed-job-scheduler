const { v4: uuidv4 } = require('uuid');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = requestIdMiddleware;
