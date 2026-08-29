import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: (env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
