import { Types } from 'mongoose';
import { Review, IReview } from './review.model';
import { Project } from '../projects/project.model';
import { assertOwnership } from '../../utils/ownershipCheck';
import { parseReviewCSV, generateContentHash } from '../../utils/csvParser';

export interface ListReviewsFilter {
  page?: number;
  limit?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  rating?: number;
  competitorName?: string;
  theme?: string;
  search?: string;
}

export interface ImportSummary {
  totalProcessed: number;
  insertedCount: number;
  duplicateCount: number;
  invalidCount: number;
  errors: string[];
}

export class ReviewService {
  /**
   * Imports reviews from a CSV buffer
   */
  async importCSV(
    userId: string,
    projectId: string,
    buffer: Buffer
  ): Promise<ImportSummary> {
    const project = await assertOwnership(Project, projectId, userId);
    const parsed = parseReviewCSV(buffer);

    if (parsed.errors.length > 0 && parsed.validReviews.length === 0) {
      return {
        totalProcessed: 0,
        insertedCount: 0,
        duplicateCount: 0,
        invalidCount: parsed.invalidCount,
        errors: parsed.errors,
      };
    }

    // Find existing review hashes for this project to prevent duplicate insertions
    const candidateHashes = parsed.validReviews.map((r) => r.contentHash);
    const existing = await Review.find({
      projectId: project._id,
      contentHash: { $in: candidateHashes },
    }).select('contentHash');

    const existingHashes = new Set(existing.map((r) => r.contentHash));
    const toInsert = parsed.validReviews
      .filter((r) => !existingHashes.has(r.contentHash))
      .map((r) => ({
        projectId: project._id,
        userId: new Types.ObjectId(userId),
        competitorName: r.product || 'General',
        source: r.source || 'CSV Import',
        rating: r.rating,
        reviewText: r.reviewText,
        author: r.author,
        reviewDate: r.reviewDate || new Date(),
        contentHash: r.contentHash,
      }));

    if (toInsert.length > 0) {
      await Review.insertMany(toInsert, { ordered: false });
    }

    const insertedCount = toInsert.length;
    const duplicateCount = parsed.duplicateCount + (parsed.validReviews.length - insertedCount);

    // Update project metrics
    const totalReviewsInDb = await Review.countDocuments({
      projectId: project._id,
      isDeleted: false,
    });
    project.metrics.totalReviews = totalReviewsInDb;
    await project.save();

    return {
      totalProcessed: parsed.validReviews.length + parsed.invalidCount,
      insertedCount,
      duplicateCount,
      invalidCount: parsed.invalidCount,
      errors: parsed.errors,
    };
  }

  /**
   * Imports reviews from raw structured JSON or manual text entries
   */
  async importJSON(
    userId: string,
    projectId: string,
    items: Array<{
      reviewText: string;
      product?: string;
      competitorName?: string;
      source?: string;
      rating?: number;
      author?: string;
      date?: string;
    }>
  ): Promise<ImportSummary> {
    const project = await assertOwnership(Project, projectId, userId);

    const validReviews = items
      .filter((item) => item.reviewText && item.reviewText.trim().length >= 5)
      .map((item) => {
        const product = item.competitorName || item.product || 'General';
        const contentHash = generateContentHash(product, item.reviewText);
        return {
          projectId: project._id,
          userId: new Types.ObjectId(userId),
          competitorName: product,
          source: item.source || 'Manual Entry',
          rating: item.rating,
          reviewText: item.reviewText.trim(),
          author: item.author,
          reviewDate: item.date ? new Date(item.date) : new Date(),
          contentHash,
        };
      });

    const invalidCount = items.length - validReviews.length;

    // Filter duplicates
    const hashes = validReviews.map((r) => r.contentHash);
    const existing = await Review.find({
      projectId: project._id,
      contentHash: { $in: hashes },
    }).select('contentHash');

    const existingHashes = new Set(existing.map((e) => e.contentHash));
    const toInsert = validReviews.filter((r) => !existingHashes.has(r.contentHash));

    if (toInsert.length > 0) {
      await Review.insertMany(toInsert, { ordered: false });
    }

    const insertedCount = toInsert.length;
    const duplicateCount = validReviews.length - insertedCount;

    // Update project metrics
    const totalReviewsInDb = await Review.countDocuments({
      projectId: project._id,
      isDeleted: false,
    });
    project.metrics.totalReviews = totalReviewsInDb;
    await project.save();

    return {
      totalProcessed: items.length,
      insertedCount,
      duplicateCount,
      invalidCount,
      errors: [],
    };
  }

  /**
   * Imports reviews by splitting raw multi-line text (pasted reviews)
   */
  async importManualText(
    userId: string,
    projectId: string,
    rawText: string
  ): Promise<ImportSummary> {
    // Split by newlines, paragraphs, or bullet points
    const lines = rawText
      .split(/\n\s*\n|\r\n\s*\r\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 5);

    const items = lines.map((line) => ({
      reviewText: line,
      source: 'Pasted Text',
    }));

    return this.importJSON(userId, projectId, items);
  }

  async listReviews(
    userId: string,
    projectId: string,
    filter: ListReviewsFilter
  ): Promise<{ reviews: IReview[]; pagination: any }> {
    await assertOwnership(Project, projectId, userId);

    const page = Math.max(Number(filter.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      projectId: new Types.ObjectId(projectId),
      isDeleted: false,
    };

    if (filter.sentiment) {
      query.sentiment = filter.sentiment;
    }

    if (filter.rating !== undefined && !isNaN(Number(filter.rating))) {
      query.rating = Number(filter.rating);
    }

    if (filter.competitorName) {
      query.competitorName = filter.competitorName;
    }

    if (filter.theme) {
      query.extractedThemes = filter.theme;
    }

    if (filter.search) {
      query.reviewText = { $regex: filter.search, $options: 'i' };
    }

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ reviewDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      Review.countDocuments(query),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewById(userId: string, reviewId: string): Promise<IReview> {
    return assertOwnership(Review, reviewId, userId);
  }

  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await assertOwnership(Review, reviewId, userId);
    review.isDeleted = true;
    await review.save();

    // Decrement project metric
    await Project.findByIdAndUpdate(review.projectId, {
      $inc: { 'metrics.totalReviews': -1 },
    });
  }
}

export const reviewService = new ReviewService();
