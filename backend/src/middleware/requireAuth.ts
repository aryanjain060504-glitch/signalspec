import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../modules/users/user.model';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. No Bearer token provided.',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Malformed authorization token',
        },
      });
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findOne({ _id: payload.userId, isDeleted: false });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found or has been deactivated',
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired. Please refresh your session.',
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid authorization token',
      },
    });
  }
}
