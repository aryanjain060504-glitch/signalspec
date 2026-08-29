import { z } from 'zod';

export const listPainPointsSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    theme: z.string().optional(),
  }),
};

export const painPointParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'Pain point ID is required'),
  }),
};

export const updatePainPointSchema = {
  params: z.object({
    id: z.string().min(1, 'Pain point ID is required'),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    userSegment: z.string().optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
};
