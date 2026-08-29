import { Router } from 'express';
import { opportunityController } from './opportunity.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  listOpportunitiesSchema,
  opportunityParamsSchema,
  updateOpportunitySchema,
} from './opportunity.schema';

const router = Router();

router.use(requireAuth);

router.get(
  '/projects/:id/opportunities',
  validate(listOpportunitiesSchema),
  (req, res, next) => opportunityController.list(req, res, next)
);

router.get(
  '/opportunities/:id',
  validate(opportunityParamsSchema),
  (req, res, next) => opportunityController.getById(req, res, next)
);

router.patch(
  '/opportunities/:id',
  validate(updateOpportunitySchema),
  (req, res, next) => opportunityController.update(req, res, next)
);

router.post(
  '/opportunities/:id/recalculate-score',
  validate(opportunityParamsSchema),
  (req, res, next) => opportunityController.recalculateScore(req, res, next)
);

export const opportunityRoutes = router;
