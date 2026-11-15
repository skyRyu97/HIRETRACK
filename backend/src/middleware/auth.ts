import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export const DEMO_USER_EMAIL = 'demo.reviewer@hiretrack.dev';

export function isDemoUser(email?: string): boolean {
  return email?.toLowerCase() === DEMO_USER_EMAIL;
}

export function requireValidObjectId(id: string | undefined, res: Response, label = 'ID'): boolean {
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: `Invalid ${label}` });
    return false;
  }
  return true;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  file?: Express.Multer.File;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid authentication token' });
  }
}
