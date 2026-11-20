import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { PublicUser, UserRole } from '../types.ts';

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  name: string;
  department: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'campus-lab-reserve-dev-jwt-secret-key';
}

export function signAuthToken(user: PublicUser): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    department: user.department,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'Lab Admin') {
    res.status(403).json({ error: 'Access denied. Lab Admin privileges required.' });
    return;
  }
  next();
}
