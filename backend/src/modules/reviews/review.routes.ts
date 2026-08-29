import { Router } from 'express';
import { reviewController, uploadMiddleware } from './review.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { importReviewsSchema, listReviewsSchema, reviewParamsSchema } from './review.schema';

const router = Router();

router.use(requireAuth);

// Project scoped review routes
router.post(
  '/projects/:id/reviews/import',
  uploadMiddleware.single('file'),
  validate(importReviewsSchema),
  (req, res, next) => reviewController.importReviews(req, res, next)
);

router.get(
  '/projects/:id/reviews',
  validate(listReviewsSchema),
  (req, res, next) => reviewController.list(req, res, next)
);

// Review detail and delete routes
router.get(
  '/reviews/:id',
  validate(reviewParamsSchema),
  (req, res, next) => reviewController.getById(req, res, next)
);

router.delete(
  '/reviews/:id',
  validate(reviewParamsSchema),
  (req, res, next) => reviewController.delete(req, res, next)
);

export const reviewRoutes = router;
