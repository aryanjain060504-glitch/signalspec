import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const revokeSessionSchema = {
  params: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
};

export const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
};
