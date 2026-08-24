/**
 * Formats API responses matching the TransformInterceptor contract.
 */
function sendSuccess(res, data, statusCode = 200, meta = null) {
  const responsePayload = {
    success: true,
  };

  if (meta) {
    responsePayload.data = data;
    responsePayload.meta = meta;
  } else if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
    responsePayload.data = data.data;
    responsePayload.meta = data.meta;
  } else {
    responsePayload.data = data;
  }

  return res.status(statusCode).json(responsePayload);
}

function sendError(res, error, statusCode = 500) {
  const code = error.statusCode || statusCode;
  return res.status(code).json({
    success: false,
    statusCode: code,
    message: error.message || 'Internal Server Error',
    errorDetails: error.errorDetails || null,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
