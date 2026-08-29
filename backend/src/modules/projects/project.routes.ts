import { Router } from 'express';
import { projectController } from './project.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
  listProjectsSchema,
  addCompetitorSchema,
  removeCompetitorSchema,
} from './project.schema';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createProjectSchema), (req, res, next) =>
  projectController.create(req, res, next)
);

router.get('/', validate(listProjectsSchema), (req, res, next) =>
  projectController.list(req, res, next)
);

router.get('/:id', validate(projectParamsSchema), (req, res, next) =>
  projectController.getById(req, res, next)
);

router.patch('/:id', validate(updateProjectSchema), (req, res, next) =>
  projectController.update(req, res, next)
);

router.delete('/:id', validate(projectParamsSchema), (req, res, next) =>
  projectController.delete(req, res, next)
);

router.get('/:id/dashboard', validate(projectParamsSchema), (req, res, next) =>
  projectController.getDashboard(req, res, next)
);

router.post('/:id/competitors', validate(addCompetitorSchema), (req, res, next) =>
  projectController.addCompetitor(req, res, next)
);

router.delete(
  '/:id/competitors/:competitorId',
  validate(removeCompetitorSchema),
  (req, res, next) => projectController.removeCompetitor(req, res, next)
);

export const projectRoutes = router;
