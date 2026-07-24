// Small helpers for consistent responses and async route error handling.

// Wrap an async route so thrown errors flow to the error middleware.
export const asyncH = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Throw this to send a friendly, specific error to the client.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new ApiError(400, msg);
export const unauthorized = (msg = 'Please log in to continue.') => new ApiError(401, msg);
export const forbidden = (msg = 'You do not have access to this.') => new ApiError(403, msg);
export const notFound = (msg = 'Not found.') => new ApiError(404, msg);
export const conflict = (msg) => new ApiError(409, msg);
