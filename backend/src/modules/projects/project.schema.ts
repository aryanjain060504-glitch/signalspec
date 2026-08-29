import { z } from 'zod';

export const createProjectSchema = {
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters long').trim(),
    description: z.string().optional(),
    targetIcp: z.string().optional(),
    competitors: z
      .array(
        z.object({
          name: z.string().min(1, 'Competitor name is required').trim(),
          website: z.string().url('Competitor website must be a valid URL').optional().or(z.literal('')),
          notes: z.string().optional(),
        })
      )
      .optional(),
  }),
};

export const updateProjectSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters').trim().optional(),
    description: z.string().optional(),
    targetIcp: z.string().optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
};

export const projectParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
};

export const listProjectsSchema = {
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    search: z.string().optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
};

export const addCompetitorSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    name: z.string().min(1, 'Competitor name is required').trim(),
    website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
    notes: z.string().optional(),
  }),
};

export const removeCompetitorSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
    competitorId: z.string().min(1, 'Competitor ID is required'),
  }),
};
