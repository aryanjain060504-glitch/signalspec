import { z } from 'zod';

export const importReviewsSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    reviews: z
      .array(
        z.object({
          reviewText: z.string().min(3, 'Review text must be at least 3 characters'),
          product: z.string().optional(),
          competitorName: z.string().optional(),
          source: z.string().optional(),
          rating: z.number().min(0).max(5).optional(),
          author: z.string().optional(),
          date: z.string().optional(),
        })
      )
      .optional(),
    manualText: z.string().optional(),
  }),
};

export const listReviewsSchema = {
  params: z.object({
    id: z.string().min(1, 'Project ID is required'),
  }),
  query: z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    rating: z.string().transform(Number).optional(),
    competitorName: z.string().optional(),
    theme: z.string().optional(),
    search: z.string().optional(),
  }),
};

export const reviewParamsSchema = {
  params: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),
};
