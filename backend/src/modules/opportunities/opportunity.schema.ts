import { z } from 'zod';

export const listOpportunitiesSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    status: z.enum(['open', 'accepted', 'rejected', 'edited']).optional(),
    minScore: z.string().transform(Number).optional(),
    search: z.string().optional(),
  }),
};

export const opportunityParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'Opportunity ID is required'),
  }),
};

export const updateOpportunitySchema = {
  params: z.object({
    id: z.string().min(1, 'Opportunity ID is required'),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    problemSummary: z.string().optional(),
    userImpact: z.string().optional(),
    suggestedSolution: z.string().optional(),
    status: z.enum(['open', 'accepted', 'rejected', 'edited']).optional(),
    strategicRelevance: z.number().min(0).max(1).optional(),
  }),
};
