import { Request, Response, NextFunction } from 'express';
import { prdService } from './prd.service';

export class PrdController {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prd = await prdService.generatePrdFromOpportunity(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(201).json({
        success: true,
        data: prd,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await prdService.listPrds(
        req.user!._id.toString(),
        req.params.id!,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.prds,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prd = await prdService.getPrdById(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: prd,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prd = await prdService.updatePrd(
        req.user!._id.toString(),
        req.params.id!,
        req.body
      );
      res.status(200).json({
        success: true,
        data: prd,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prdService.deletePrd(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: { message: 'PRD deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async exportPrd(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const format = (req.query.format as any) || 'markdown';
      const result = await prdService.exportPrd(
        req.user!._id.toString(),
        req.params.id!,
        format
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.content);
    } catch (error) {
      next(error);
    }
  }
}

export const prdController = new PrdController();
