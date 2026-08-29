import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { updateProfileSchema, deleteAccountSchema } from './user.schema';

const router = Router();

router.use(requireAuth);

router.get('/me', (req, res, next) => userController.getMe(req, res, next));
router.patch('/me', validate(updateProfileSchema), (req, res, next) =>
  userController.updateMe(req, res, next)
);
router.get('/me/export', (req, res, next) => userController.exportMe(req, res, next));
router.delete('/me', validate(deleteAccountSchema), (req, res, next) =>
  userController.deleteMe(req, res, next)
);

export const userRoutes = router;
