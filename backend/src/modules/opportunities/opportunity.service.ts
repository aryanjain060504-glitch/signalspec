import { Types } from 'mongoose';
import { Opportunity, IOpportunity } from './opportunity.model';
import { Project } from '../projects/project.model';
import { Review } from '../reviews/review.model';
import { assertOwnership, AppError } from '../../utils/ownershipCheck';
import { calculateOpportunityScore } from '../../utils/scoring';

export interface ListOpportunitiesFilter {
  page?: number;
  limit?: number;
  status?: 'open' | 'accepted' | 'rejected' | 'edited';
  minScore?: number;
  search?: string;
}

export class OpportunityService {
  async listOpportunities(
    userId: string,
    projectId: string,
    filter: ListOpportunitiesFilter
  ): Promise<{ opportunities: IOpportunity[]; pagination: any }> {
    await assertOwnership(Project, projectId, userId);

    const page = Math.max(Number(filter.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      projectId: new Types.ObjectId(projectId),
      isDeleted: false,
    };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.minScore !== undefined && !isNaN(Number(filter.minScore))) {
      query.score = { $gte: Number(filter.minScore) };
    }

    if (filter.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
        { problemSummary: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      Opportunity.find(query).sort({ score: -1, createdAt: -1 }).skip(skip).limit(limit),
      Opportunity.countDocuments(query),
    ]);

    return {
      opportunities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOpportunityById(userId: string, opportunityId: string): Promise<IOpportunity> {
    if (!Types.ObjectId.isValid(opportunityId)) {
      throw new AppError('Opportunity not found', 404, 'NOT_FOUND');
    }

    const doc = await Opportunity.findOne({
      _id: new Types.ObjectId(opportunityId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    })
      .populate({
        path: 'evidenceReviews',
        select: 'reviewText rating source competitorName author reviewDate',
      })
      .populate({
        path: 'evidencePainPoints',
        select: 'title description severity confidence frequency userSegment relatedThemes',
      });

    if (!doc) {
      throw new AppError('Opportunity not found', 404, 'NOT_FOUND');
    }

    return doc;
  }

  async updateOpportunity(
    userId: string,
    opportunityId: string,
    data: any
  ): Promise<IOpportunity> {
    const opp = await assertOwnership(Opportunity, opportunityId, userId);

    if (data.title !== undefined) opp.title = data.title;
    if (data.description !== undefined) opp.description = data.description;
    if (data.problemSummary !== undefined) opp.problemSummary = data.problemSummary;
    if (data.userImpact !== undefined) opp.userImpact = data.userImpact;
    if (data.suggestedSolution !== undefined) opp.suggestedSolution = data.suggestedSolution;
    if (data.status !== undefined) opp.status = data.status;
    if (data.strategicRelevance !== undefined) opp.strategicRelevance = data.strategicRelevance;

    await opp.save();
    return opp;
  }

  async recalculateScore(userId: string, opportunityId: string): Promise<IOpportunity> {
    const opp = await assertOwnership(Opportunity, opportunityId, userId);
    const totalReviews = await Review.countDocuments({
      projectId: opp.projectId,
      isDeleted: false,
    });

    const breakdown = calculateOpportunityScore({
      frequency: opp.frequencyCount,
      totalReviewsInProject: Math.max(totalReviews, 1),
      severity: opp.severity,
      negativeSentimentRatio: opp.negativeSentimentRatio,
      strategicRelevance: opp.strategicRelevance,
      confidence: opp.confidence,
    });

    opp.score = breakdown.totalScore;
    opp.scoreBreakdown = breakdown;
    await opp.save();

    return opp;
  }
}

export const opportunityService = new OpportunityService();
