import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { reviewService } from './review.service';
import { AppError } from '../../utils/ownershipCheck';

// In-memory multer storage with 10MB limit and CSV mimetype check
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new AppError('Only .csv files are supported for review imports', 400, 'INVALID_FILE_TYPE') as any, false);
    }
  },
});

export class ReviewController {
  async importReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id!;
      const userId = req.user!._id.toString();

      let summary;

      if (req.file) {
        summary = await reviewService.importCSV(userId, projectId, req.file.buffer);
      } else if (req.body?.manualText) {
        summary = await reviewService.importManualText(userId, projectId, req.body.manualText);
      } else if (Array.isArray(req.body?.reviews)) {
        summary = await reviewService.importJSON(userId, projectId, req.body.reviews);
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Please provide either a CSV file, manualText, or an array of reviews',
          },
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reviewService.listReviews(
        req.user!._id.toString(),
        req.params.id!,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.getReviewById(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.deleteReview(
        req.user!._id.toString(),
        req.params.id!
      );
      res.status(200).json({
        success: true,
        data: { message: 'Review deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
