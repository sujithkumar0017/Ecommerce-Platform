import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { unauthorized, forbidden } from './http.js';

export const hashPassword = (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// Reads the Bearer token, verifies it, and attaches req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    next(unauthorized('Your session has expired. Please log in again.'));
  }
}

// Optional restriction to a role (used by admin app; harmless here).
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) return next(forbidden('Admins only.'));
    next();
  };
}
