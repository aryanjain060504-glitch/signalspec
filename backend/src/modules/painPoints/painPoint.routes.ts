import { Router } from 'express';
import { painPointController } from './painPoint.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  listPainPointsSchema,
  painPointParamsSchema,
  updatePainPointSchema,
} from './painPoint.schema';

const router = Router();

router.use(requireAuth);

router.get('/projects/:id/pain-points', validate(listPainPointsSchema), (req, res, next) =>
  painPointController.list(req, res, next)
);

router.get('/pain-points/:id', validate(painPointParamsSchema), (req, res, next) =>
  painPointController.getById(req, res, next)
);

router.patch('/pain-points/:id', validate(updatePainPointSchema), (req, res, next) =>
  painPointController.update(req, res, next)
);

export const painPointRoutes = router;
