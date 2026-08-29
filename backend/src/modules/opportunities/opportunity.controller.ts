import { Request, Response, NextFunction } from 'express';
import { opportunityService } from './opportunity.service';

export class OpportunityController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await opportunityService.listOpportunities(
        req.user!._id.toString(),
        req.params.id!,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.opportunities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const opportunity = await opportunityService.getOpportunityById(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: opportunity,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const opportunity = await opportunityService.updateOpportunity(
        req.user!._id.toString(),
        req.params.id!,
        req.body
      );
      res.status(200).json({
        success: true,
        data: opportunity,
      });
    } catch (error) {
      next(error);
    }
  }

  async recalculateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const opportunity = await opportunityService.recalculateScore(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: opportunity,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const opportunityController = new OpportunityController();
