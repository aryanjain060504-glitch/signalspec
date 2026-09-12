import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/requireAuth';
import { registerSchema, loginSchema, revokeSessionSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from './auth.schema';

const router = Router();

// Strict auth rate limiter: max 10 requests per 15 minutes for brute force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many failed login attempts. Please try again later.',
    },
  },
});

router.post('/register', authLimiter, validate(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', authLimiter, loginLimiter, validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/verify-email', authLimiter, validate(verifyEmailSchema), (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

router.post('/reset-password', authLimiter, validate(resetPasswordSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);


router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);

router.post('/logout', requireAuth, (req, res, next) =>
  authController.logout(req, res, next)
);

router.get('/sessions', requireAuth, (req, res, next) =>
  authController.getSessions(req, res, next)
);

router.delete('/sessions/:sessionId', requireAuth, validate(revokeSessionSchema), (req, res, next) =>
  authController.revokeSession(req, res, next)
);

export const authRoutes = router;
