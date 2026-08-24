class ApiError extends Error {
  constructor(statusCode, message, errorDetails = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errorDetails = null) {
    super(400, message, errorDetails);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', errorDetails = null) {
    super(401, message, errorDetails);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', errorDetails = null) {
    super(403, message, errorDetails);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource Not Found', errorDetails = null) {
    super(404, message, errorDetails);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource Conflict', errorDetails = null) {
    super(409, message, errorDetails);
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', errorDetails = null) {
    super(500, message, errorDetails);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
