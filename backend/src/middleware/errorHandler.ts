import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/ownershipCheck';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. AppError (custom domain errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedFields: Record<string, string[]> = {};
    err.errors.forEach((issue) => {
      const fieldName = issue.path.join('.') || 'root';
      if (!formattedFields[fieldName]) {
        formattedFields[fieldName] = [];
      }
      formattedFields[fieldName].push(issue.message);
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed on request data',
        fields: formattedFields,
      },
    });
    return;
  }

  // 3. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid access token provided',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Access token has expired',
      },
    });
    return;
  }

  // 4. Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with that ${fields.join(', ')} already exists`,
      },
    });
    return;
  }

  // 5. Mongoose Cast Error (Invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
    return;
  }

  // 6. Generic unhandled internal errors
  logger.error('Unhandled server exception:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message,
    },
  });
}
