// Consistent responses + async error handling.
export const asyncH = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg) => new ApiError(400, msg);
export const unauthorized = (msg = 'Please log in.') => new ApiError(401, msg);
export const forbidden = (msg = 'Admins only.') => new ApiError(403, msg);
export const notFound = (msg = 'Not found.') => new ApiError(404, msg);
export const conflict = (msg) => new ApiError(409, msg);
