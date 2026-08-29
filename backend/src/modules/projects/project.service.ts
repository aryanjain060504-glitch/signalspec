import { Types } from 'mongoose';
import { Project, IProject, ICompetitor } from './project.model';
import { Review } from '../reviews/review.model';
import { PainPoint } from '../painPoints/painPoint.model';
import { Opportunity } from '../opportunities/opportunity.model';
import { Prd } from '../prds/prd.model';
import { assertOwnership } from '../../utils/ownershipCheck';

export interface ListProjectsFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'archived';
}

export class ProjectService {
  async createProject(userId: string, data: any): Promise<IProject> {
    const project = new Project({
      userId: new Types.ObjectId(userId),
      name: data.name,
      description: data.description,
      targetIcp: data.targetIcp,
      competitors: data.competitors || [],
    });

    await project.save();
    return project;
  }

  async listProjects(
    userId: string,
    filter: ListProjectsFilter
  ): Promise<{ projects: IProject[]; pagination: any }> {
    const page = Math.max(Number(filter.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(query),
    ]);

    return {
      projects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProject(userId: string, projectId: string): Promise<IProject> {
    return assertOwnership(Project, projectId, userId);
  }

  async updateProject(userId: string, projectId: string, data: any): Promise<IProject> {
    const project = await assertOwnership(Project, projectId, userId);

    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.targetIcp !== undefined) project.targetIcp = data.targetIcp;
    if (data.status !== undefined) project.status = data.status;

    await project.save();
    return project;
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await assertOwnership(Project, projectId, userId);
    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();

    // Cascade soft delete to associated reviews, pain points, opportunities, PRDs
    await Promise.all([
      Review.updateMany({ projectId: project._id }, { $set: { isDeleted: true } }),
      PainPoint.updateMany({ projectId: project._id }, { $set: { status: 'archived' } }),
      Opportunity.updateMany({ projectId: project._id }, { $set: { isDeleted: true } }),
      Prd.updateMany({ projectId: project._id }, { $set: { isDeleted: true } }),
    ]);
  }

  async addCompetitor(userId: string, projectId: string, data: any): Promise<IProject> {
    const project = await assertOwnership(Project, projectId, userId);
    project.competitors.push(data as ICompetitor);
    await project.save();
    return project;
  }

  async removeCompetitor(
    userId: string,
    projectId: string,
    competitorId: string
  ): Promise<IProject> {
    const project = await assertOwnership(Project, projectId, userId);
    project.competitors = project.competitors.filter(
      (c) => c._id?.toString() !== competitorId
    );
    await project.save();
    return project;
  }

  /**
   * Aggregates Research Summary Dashboard for a project (PRD Section 23)
   */
  async getProjectDashboard(userId: string, projectId: string): Promise<any> {
    const project = await assertOwnership(Project, projectId, userId);

    const [reviews, painPoints, opportunities, prds] = await Promise.all([
      Review.find({ projectId: project._id, isDeleted: { $ne: true } }),
      PainPoint.find({ projectId: project._id, status: { $ne: 'archived' } }),
      Opportunity.find({ projectId: project._id, isDeleted: false }).sort({ score: -1 }),
      Prd.find({ projectId: project._id, isDeleted: false }),
    ]);

    // Calculate unique products/competitors analyzed
    const uniqueProducts = Array.from(new Set(reviews.map((r) => r.competitorName || r.source)));

    // Sentiment breakdown
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    reviews.forEach((r) => {
      if (r.sentiment === 'positive') positive++;
      else if (r.sentiment === 'negative') negative++;
      else neutral++;
    });

    // Theme frequencies
    const themeCounts: Record<string, number> = {};
    reviews.forEach((r) => {
      (r.extractedThemes || []).forEach((theme) => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top ranked opportunities (PRD Section 17 & 23)
    const topOpportunities = opportunities.slice(0, 5).map((o) => ({
      id: o._id,
      title: o.title,
      score: o.score,
      confidence: o.confidence,
      severity: o.severity,
      frequencyCount: o.frequencyCount,
      status: o.status,
    }));

    return {
      summary: {
        totalReviews: reviews.length,
        productsAnalyzed: uniqueProducts.length,
        painPointsDiscovered: painPoints.length,
        opportunitiesDiscovered: opportunities.length,
        prdsGenerated: prds.length,
        highPriorityOpportunities: opportunities.filter((o) => o.score >= 80).length,
      },
      sentiment: {
        positive,
        neutral,
        negative,
        total: reviews.length,
      },
      topThemes,
      topOpportunities,
      products: uniqueProducts,
    };
  }
}

export const projectService = new ProjectService();
