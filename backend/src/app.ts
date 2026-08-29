import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';
import passport from 'passport';

import { env } from './config/env';
import { configurePassport } from './config/passport';
import { errorHandler } from './middleware/errorHandler';

// Import domain routes
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { projectRoutes } from './modules/projects/project.routes';
import { reviewRoutes } from './modules/reviews/review.routes';
import { painPointRoutes } from './modules/painPoints/painPoint.routes';
import { opportunityRoutes } from './modules/opportunities/opportunity.routes';
import { analysisRoutes } from './modules/analysis/analysis.routes';
import { prdRoutes } from './modules/prds/prd.routes';

const app = express();

// Configure passport
configurePassport();
app.use(passport.initialize());

// 1. Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows SPA client consumption
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS - Explicit allowed origins only
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or if origin is in allowlist
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Cookie parser
app.use(cookieParser());

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. NoSQL injection sanitization
app.use(mongoSanitize());

// 6. HTTP Request logging (dev only)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 7. Health & Readiness endpoints (Public, unauthenticated, exempt from strict API rate limits)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'signalspec-backend',
    version: '1.0.0',
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (isDbReady) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// 8. Global API Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
    },
  },
});

app.use('/api', globalLimiter);

// 9. API v1 Routes Mount
const apiV1 = express.Router();
apiV1.use('/auth', authRoutes);
apiV1.use('/users', userRoutes);
apiV1.use('/projects', projectRoutes);
apiV1.use(reviewRoutes);
apiV1.use(painPointRoutes);
apiV1.use(opportunityRoutes);
apiV1.use(analysisRoutes);
apiV1.use(prdRoutes);

app.use('/api/v1', apiV1);

// 10. 404 Route Not Found Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist',
    },
  });
});

// 11. Central Error Handler (Always Last)
app.use(errorHandler);

export default app;
