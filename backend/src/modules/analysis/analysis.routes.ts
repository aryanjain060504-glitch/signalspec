import { Router } from 'express';
import { analysisController } from './analysis.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { startAnalysisSchema, jobParamsSchema } from './analysis.schema';

const router = Router();

router.use(requireAuth);

router.post(
  '/projects/:id/analyze',
  validate(startAnalysisSchema),
  (req, res, next) => analysisController.start(req, res, next)
);

router.get(
  '/projects/:id/jobs',
  validate(startAnalysisSchema),
  (req, res, next) => analysisController.listJobs(req, res, next)
);

router.get(
  '/analysis-jobs/:id',
  validate(jobParamsSchema),
  (req, res, next) => analysisController.getStatus(req, res, next)
);

router.post(
  '/analysis-jobs/:id/cancel',
  validate(jobParamsSchema),
  (req, res, next) => analysisController.cancel(req, res, next)
);

export const analysisRoutes = router;
