import { z } from 'zod';

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    avatar: z.string().url('Avatar must be a valid URL').optional(),
  }),
};

export const deleteAccountSchema = {
  body: z.object({
    confirmText: z.string().refine((val) => val === 'DELETE MY ACCOUNT', {
      message: 'Confirmation text must match "DELETE MY ACCOUNT" exactly',
    }),
  }),
};
