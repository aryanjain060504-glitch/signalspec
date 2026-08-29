import { Request, Response, NextFunction } from 'express';
import { painPointService } from './painPoint.service';

export class PainPointController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await painPointService.listPainPoints(
        req.user!._id.toString(),
        req.params.id!,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.painPoints,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const painPoint = await painPointService.getPainPointById(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: painPoint,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const painPoint = await painPointService.updatePainPoint(
        req.user!._id.toString(),
        req.params.id!,
        req.body
      );
      res.status(200).json({
        success: true,
        data: painPoint,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const painPointController = new PainPointController();
