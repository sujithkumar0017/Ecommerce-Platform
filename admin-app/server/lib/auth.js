import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { unauthorized, forbidden } from './http.js';

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// requireAdmin: verifies JWT AND enforces role=admin on every protected route.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.role !== 'admin') return next(forbidden('This dashboard is for admins only.'));
    req.user = payload;
    next();
  } catch {
    next(unauthorized('Your session has expired. Please log in again.'));
  }
}
