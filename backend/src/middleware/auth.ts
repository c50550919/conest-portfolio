import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as { userId: string };
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'Invalid token - user not found' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account is not active' });
      return;
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireVerification = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.email_verified) {
    res.status(403).json({ error: 'Email verification required' });
    return;
  }

  next();
};

export const requireFullVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const verification = await db('verifications')
      .where({ user_id: req.userId })
      .first();

    if (!verification || !verification.fully_verified) {
      res.status(403).json({
        error: 'Full verification required',
        message: 'Please complete ID verification and background check',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Verification check failed' });
  }
};

// Import db for the requireFullVerification function
import db from '../config/database';

// Export alias for backwards compatibility
export const authMiddleware = authenticateToken;
