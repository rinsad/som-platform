class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sendError(res, error) {
  return res.status(error.status || 500).json({
    error: error.message || 'Unexpected CAPEX v2 error',
    code: error.code || 'CAPEX_V2_ERROR',
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = { HttpError, asyncHandler, sendError };

