import { z } from 'zod';

export const startAnalysisSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
};

export const jobParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'Job ID is required'),
  }),
};
