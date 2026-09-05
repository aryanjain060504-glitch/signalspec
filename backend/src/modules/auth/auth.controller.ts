import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = { userAgent: req.headers['user-agent'], ip: req.ip };
      const result = await authService.register(req.body, meta);
      setRefreshTokenCookie(res, result.refreshToken);
      res.status(201).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meta = { userAgent: req.headers['user-agent'], ip: req.ip };
      const result = await authService.login(req.body, meta);
      setRefreshTokenCookie(res, result.refreshToken);
      res.status(200).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, error: { code: 'REFRESH_TOKEN_INVALID', message: 'Refresh token not found. Please log in again.' } });
        return;
      }
      const meta = { userAgent: req.headers['user-agent'], ip: req.ip };
      const result = await authService.refreshSession(refreshToken, meta);
      setRefreshTokenCookie(res, result.refreshToken);
      res.status(200).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
    } catch (error) {
      clearRefreshTokenCookie(res);
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        const payloadSessionId = (req as any).sessionId;
        await authService.logout(req.user._id.toString(), payloadSessionId);
      }
      clearRefreshTokenCookie(res);
      res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.listSessions(req.user!._id.toString());
      res.status(200).json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.revokeSession(req.user!._id.toString(), req.params.sessionId!);
      res.status(200).json({ success: true, data: { message: 'Session revoked successfully' } });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
