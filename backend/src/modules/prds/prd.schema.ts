import { z } from 'zod';

export const generatePrdSchema = {
  params: z.object({
    id: z.string().min(1, 'Opportunity ID is required'),
  }),
};

export const listPrdsSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    status: z.enum(['draft', 'in_review', 'approved', 'exported']).optional(),
  }),
};

export const prdParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'PRD ID is required'),
  }),
};

export const updatePrdSchema = {
  params: z.object({
    id: z.string().min(1, 'PRD ID is required'),
  }),
  body: z.object({
    title: z.string().min(2).optional(),
    overview: z.string().optional(),
    problemStatement: z.string().optional(),
    targetUsers: z.array(z.string()).optional(),
    userStories: z
      .array(
        z.object({
          role: z.string(),
          action: z.string(),
          benefit: z.string(),
          priority: z.enum(['P0', 'P1', 'P2']),
        })
      )
      .optional(),
    goals: z.array(z.string()).optional(),
    nonGoals: z.array(z.string()).optional(),
    functionalRequirements: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          priority: z.enum(['P0', 'P1', 'P2']),
          acceptanceCriteria: z.array(z.string()),
        })
      )
      .optional(),
    userFlow: z.string().optional(),
    edgeCases: z.array(z.string()).optional(),
    successMetrics: z
      .array(
        z.object({
          metric: z.string(),
          target: z.string(),
          timeframe: z.string(),
        })
      )
      .optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    rawMarkdown: z.string().optional(),
    status: z.enum(['draft', 'in_review', 'approved', 'exported']).optional(),
  }),
};

export const exportPrdSchema = {
  params: z.object({
    id: z.string().min(1, 'PRD ID is required'),
  }),
  query: z.object({
    format: z.enum(['markdown', 'json', 'text']).default('markdown'),
  }),
};
