import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { reviewController, uploadMiddleware } from './review.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { importReviewsSchema, listReviewsSchema, reviewParamsSchema } from './review.schema';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // limit each IP to 3 CSV uploads per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'CSV upload limit reached. You can only upload 3 files per hour.',
    },
  },
});

router.use(requireAuth);

// Project scoped review routes
router.post(
  '/projects/:id/reviews/import',
  uploadLimiter,
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
