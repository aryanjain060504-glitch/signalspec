import { Request, Response, NextFunction } from 'express';
import { analysisService } from './analysis.service';

export class AnalysisController {
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await analysisService.startAnalysis(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(202).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await analysisService.getJobById(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobs = await analysisService.listProjectJobs(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await analysisService.cancelJob(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analysisController = new AnalysisController();
