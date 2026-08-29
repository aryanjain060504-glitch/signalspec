import { Types } from 'mongoose';
import { Prd, IPrd } from './prd.model';
import { Opportunity } from '../opportunities/opportunity.model';
import { Project } from '../projects/project.model';
import { Review } from '../reviews/review.model';
import { aiService, RawReviewItem } from '../../services/ai.service';
import { assertOwnership } from '../../utils/ownershipCheck';

export interface ListPrdsFilter {
  page?: number;
  limit?: number;
  status?: 'draft' | 'in_review' | 'approved' | 'exported';
}

export class PrdService {
  /**
   * Generates a new evidence-grounded PRD from a selected Opportunity (PRD Sections 19-21)
   */
  async generatePrdFromOpportunity(userId: string, opportunityId: string): Promise<IPrd> {
    const opp = await assertOwnership(Opportunity, opportunityId, userId);
    const project = await Project.findById(opp.projectId);
    const projectName = project ? project.name : 'SaaS Project';

    // Fetch supporting review evidence
    const supportingReviews = await Review.find({
      _id: { $in: opp.evidenceReviews },
    });

    const rawReviews: RawReviewItem[] = supportingReviews.map((r) => ({
      id: r._id.toString(),
      source: r.source,
      product: r.competitorName,
      rating: r.rating,
      reviewText: r.reviewText,
    }));

    const prdData = await aiService.generatePRD(
      {
        title: opp.title,
        description: opp.description,
        problemSummary: opp.problemSummary,
        userImpact: opp.userImpact,
        suggestedSolution: opp.suggestedSolution,
        aiReasoning: opp.aiReasoning,
        score: opp.score,
      },
      rawReviews,
      projectName
    );

    const prd = new Prd({
      projectId: opp.projectId,
      opportunityId: opp._id,
      userId: new Types.ObjectId(userId),
      title: prdData.title || `PRD: ${opp.title}`,
      overview: prdData.overview,
      problemStatement: prdData.problemStatement,
      evidenceQuotes: prdData.evidenceQuotes,
      targetUsers: prdData.targetUsers,
      userStories: prdData.userStories,
      goals: prdData.goals,
      nonGoals: prdData.nonGoals,
      functionalRequirements: prdData.functionalRequirements,
      userFlow: prdData.userFlow,
      edgeCases: prdData.edgeCases,
      successMetrics: prdData.successMetrics,
      acceptanceCriteria: prdData.acceptanceCriteria,
      rawMarkdown: prdData.rawMarkdown,
      status: 'draft',
    });

    await prd.save();

    // Mark opportunity as accepted & increment project metric
    opp.status = 'accepted';
    await opp.save();

    await Project.findByIdAndUpdate(opp.projectId, {
      $inc: { 'metrics.prdsCount': 1 },
    });

    return prd;
  }

  async listPrds(
    userId: string,
    projectId: string,
    filter: ListPrdsFilter
  ): Promise<{ prds: IPrd[]; pagination: any }> {
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

    const [prds, total] = await Promise.all([
      Prd.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Prd.countDocuments(query),
    ]);

    return {
      prds,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPrdById(userId: string, prdId: string): Promise<IPrd> {
    return assertOwnership(Prd, prdId, userId);
  }

  async updatePrd(userId: string, prdId: string, data: any): Promise<IPrd> {
    const prd = await assertOwnership(Prd, prdId, userId);

    if (data.title !== undefined) prd.title = data.title;
    if (data.overview !== undefined) prd.overview = data.overview;
    if (data.problemStatement !== undefined) prd.problemStatement = data.problemStatement;
    if (data.targetUsers !== undefined) prd.targetUsers = data.targetUsers;
    if (data.userStories !== undefined) prd.userStories = data.userStories;
    if (data.goals !== undefined) prd.goals = data.goals;
    if (data.nonGoals !== undefined) prd.nonGoals = data.nonGoals;
    if (data.functionalRequirements !== undefined) prd.functionalRequirements = data.functionalRequirements;
    if (data.userFlow !== undefined) prd.userFlow = data.userFlow;
    if (data.edgeCases !== undefined) prd.edgeCases = data.edgeCases;
    if (data.successMetrics !== undefined) prd.successMetrics = data.successMetrics;
    if (data.acceptanceCriteria !== undefined) prd.acceptanceCriteria = data.acceptanceCriteria;
    if (data.rawMarkdown !== undefined) prd.rawMarkdown = data.rawMarkdown;
    if (data.status !== undefined) prd.status = data.status;

    prd.version += 1;
    await prd.save();

    return prd;
  }

  async deletePrd(userId: string, prdId: string): Promise<void> {
    const prd = await assertOwnership(Prd, prdId, userId);
    prd.isDeleted = true;
    await prd.save();

    await Project.findByIdAndUpdate(prd.projectId, {
      $inc: { 'metrics.prdsCount': -1 },
    });
  }

  async exportPrd(
    userId: string,
    prdId: string,
    format: 'markdown' | 'json' | 'text' = 'markdown'
  ): Promise<{ content: string; contentType: string; filename: string }> {
    const prd = await assertOwnership(Prd, prdId, userId);
    const sanitizedTitle = prd.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    // Mark as exported
    if (prd.status === 'draft') {
      prd.status = 'exported';
      await prd.save();
    }

    if (format === 'json') {
      return {
        content: JSON.stringify(prd, null, 2),
        contentType: 'application/json',
        filename: `${sanitizedTitle}.json`,
      };
    }

    if (format === 'text') {
      const plainText = prd.rawMarkdown.replace(/#+\s/g, '').replace(/[*_`]/g, '');
      return {
        content: plainText,
        contentType: 'text/plain',
        filename: `${sanitizedTitle}.txt`,
      };
    }

    // Default: Markdown
    return {
      content: prd.rawMarkdown,
      contentType: 'text/markdown',
      filename: `${sanitizedTitle}.md`,
    };
  }
}

export const prdService = new PrdService();
