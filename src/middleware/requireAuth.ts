import type { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/tokens.js';
import type { AuthenticatedRequest } from '../types/authTypes.js';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]!;
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId };  // attach to req
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};