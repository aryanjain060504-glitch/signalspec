import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model';
import { AppError } from '../../utils/ownershipCheck';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { emailService } from '../../services/email.service';
import { env } from '../../config/env';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
const BCRYPT_ROUNDS = 10;

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export class AuthService {
  /**
   * Registers a new user account
   */
  async register(
    data: { email: string; password: string; name: string },
    meta?: SessionMeta
  ): Promise<AuthResult> {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'CONFLICT', {
        email: ['An account with this email already exists'],
      });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = await bcrypt.hash(verificationToken, BCRYPT_ROUNDS);

    const user = new User({
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'user',
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    const sessionId = crypto.randomUUID();
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({
      sessionId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });
    await user.save();

    const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    await emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email for SignalSpec',
      text: `Please verify your email by clicking on the following link: ${verifyUrl}`,
    });

    return {
      user,
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Authenticates user via email and password
   */
  async login(
    data: { email: string; password: string },
    meta?: SessionMeta
  ): Promise<AuthResult> {
    const user = await User.findOne({ email: data.email, isDeleted: false }).select(
      '+passwordHash'
    );

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Account is temporarily locked due to too many failed login attempts. Try again in ${remainingMin} minutes.`,
        403,
        'ACCOUNT_LOCKED'
      );
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }
      await user.save();
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts on successful authentication
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    const sessionId = crypto.randomUUID();
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    });

    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens.push({
      sessionId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    });

    await user.save();

    return {
      user,
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  /**
   * Refreshes access token and rotates refresh token
   */
  async refreshSession(
    currentRefreshToken: string,
    meta?: SessionMeta
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    let payload;
    try {
      payload = verifyRefreshToken(currentRefreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
    }

    const user = await User.findById(payload.userId);
    if (!user || user.isDeleted) {
      throw new AppError('User not found or deactivated', 401, 'REFRESH_TOKEN_INVALID');
    }

    // Find session in user's refresh token array
    const sessionIndex = user.refreshTokens.findIndex(
      (s) => s.sessionId === payload.sessionId && s.expiresAt > new Date()
    );

    if (sessionIndex === -1) {
      // Possible token reuse attack detected! Revoke all active sessions for this user.
      user.refreshTokens = [];
      await user.save();
      throw new AppError(
        'Token reuse detected. All sessions have been terminated for security.',
        401,
        'TOKEN_BREACH_DETECTED'
      );
    }

    const session = user.refreshTokens[sessionIndex]!;
    const isTokenValid = await bcrypt.compare(currentRefreshToken, session.tokenHash);

    if (!isTokenValid) {
      // Revoke all sessions on tampered token
      user.refreshTokens = [];
      await user.save();
      throw new AppError('Invalid refresh token signature', 401, 'REFRESH_TOKEN_INVALID');
    }

    // Rotate refresh token
    const newSessionId = crypto.randomUUID();
    const newAccessToken = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: newSessionId,
    });

    const newRefreshToken = signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: newSessionId,
    });

    const newTokenHash = await bcrypt.hash(newRefreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove old session and insert new rotated session
    user.refreshTokens.splice(sessionIndex, 1);
    user.refreshTokens.push({
      sessionId: newSessionId,
      tokenHash: newTokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent: meta?.userAgent || session.userAgent,
      ip: meta?.ip || session.ip,
    });

    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Logs out user by removing active session
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { sessionId } },
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  }

  /**
   * Lists active sessions for user
   */
  async listSessions(userId: string): Promise<any[]> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    return user.refreshTokens.map((s) => ({
      sessionId: s.sessionId,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      userAgent: s.userAgent,
      ip: s.ip,
    }));
  }

  /**
   * Revokes a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { sessionId } },
    });
    if (!result) throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  /**
   * Verifies a user's email address using the token
   */
  async verifyEmail(token: string): Promise<void> {
    const users = await User.find({
      isEmailVerified: false,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken');

    let matchedUser = null;
    for (const user of users) {
      if (user.emailVerificationToken) {
        const isMatch = await bcrypt.compare(token, user.emailVerificationToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    matchedUser.isEmailVerified = true;
    matchedUser.emailVerificationToken = undefined;
    matchedUser.emailVerificationExpires = undefined;
    await matchedUser.save();
  }

  /**
   * Initiates the password reset flow
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      // Don't throw error to prevent email enumeration attacks
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = await bcrypt.hash(resetToken, BCRYPT_ROUNDS);

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    });
  }

  /**
   * Completes the password reset flow
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const users = await User.find({
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken');

    let matchedUser = null;
    for (const user of users) {
      if (user.resetPasswordToken) {
        const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    matchedUser.passwordHash = newPasswordHash;
    matchedUser.resetPasswordToken = undefined;
    matchedUser.resetPasswordExpires = undefined;
    
    // Clear all active sessions for security
    matchedUser.refreshTokens = [];
    
    await matchedUser.save();
  }
}

export const authService = new AuthService();
