import { Router } from 'express';
import { prdController } from './prd.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  generatePrdSchema,
  listPrdsSchema,
  prdParamsSchema,
  updatePrdSchema,
  exportPrdSchema,
} from './prd.schema';

const router = Router();

router.use(requireAuth);

router.post(
  '/opportunities/:id/generate-prd',
  validate(generatePrdSchema),
  (req, res, next) => prdController.generate(req, res, next)
);

router.get(
  '/projects/:id/prds',
  validate(listPrdsSchema),
  (req, res, next) => prdController.list(req, res, next)
);

router.get(
  '/prds/:id',
  validate(prdParamsSchema),
  (req, res, next) => prdController.getById(req, res, next)
);

router.patch(
  '/prds/:id',
  validate(updatePrdSchema),
  (req, res, next) => prdController.update(req, res, next)
);

router.delete(
  '/prds/:id',
  validate(prdParamsSchema),
  (req, res, next) => prdController.delete(req, res, next)
);

router.get(
  '/prds/:id/export',
  validate(exportPrdSchema),
  (req, res, next) => prdController.exportPrd(req, res, next)
);

export const prdRoutes = router;
