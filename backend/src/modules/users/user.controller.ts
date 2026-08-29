import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!._id.toString());
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!._id.toString(), req.body);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const exportData = await userService.exportUserData(req.user!._id.toString());
      res.status(200).json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.deleteAccount(req.user!._id.toString(), req.body.confirmText);
      res.clearCookie('refreshToken', { path: '/api/v1/auth' });
      res.status(200).json({
        success: true,
        data: { message: 'Account has been deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
