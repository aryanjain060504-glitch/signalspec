import { Types } from 'mongoose';
import { PainPoint, IPainPoint } from './painPoint.model';
import { Project } from '../projects/project.model';
import { assertOwnership, AppError } from '../../utils/ownershipCheck';

export interface ListPainPointsFilter {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  theme?: string;
}

export class PainPointService {
  async listPainPoints(
    userId: string,
    projectId: string,
    filter: ListPainPointsFilter
  ): Promise<{ painPoints: IPainPoint[]; pagination: any }> {
    await assertOwnership(Project, projectId, userId);

    const page = Math.max(Number(filter.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      projectId: new Types.ObjectId(projectId),
      status: 'active',
    };

    if (filter.severity) {
      query.severity = filter.severity;
    }

    if (filter.theme) {
      query.relatedThemes = filter.theme;
    }

    const [painPoints, total] = await Promise.all([
      PainPoint.find(query)
        .sort({ frequency: -1, confidence: -1 })
        .skip(skip)
        .limit(limit),
      PainPoint.countDocuments(query),
    ]);

    return {
      painPoints,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPainPointById(userId: string, painPointId: string): Promise<IPainPoint> {
    if (!Types.ObjectId.isValid(painPointId)) {
      throw new AppError('Pain point not found', 404, 'NOT_FOUND');
    }

    const doc = await PainPoint.findOne({
      _id: new Types.ObjectId(painPointId),
      userId: new Types.ObjectId(userId),
    }).populate({
      path: 'evidenceReviewIds',
      select: 'reviewText rating source competitorName author reviewDate',
    });

    if (!doc) {
      throw new AppError('Pain point not found', 404, 'NOT_FOUND');
    }

    return doc;
  }

  async updatePainPoint(
    userId: string,
    painPointId: string,
    data: any
  ): Promise<IPainPoint> {
    const painPoint = await assertOwnership(PainPoint, painPointId, userId, {});

    if (data.title !== undefined) painPoint.title = data.title;
    if (data.description !== undefined) painPoint.description = data.description;
    if (data.severity !== undefined) painPoint.severity = data.severity;
    if (data.userSegment !== undefined) painPoint.userSegment = data.userSegment;
    if (data.status !== undefined) painPoint.status = data.status;

    await painPoint.save();
    return painPoint;
  }
}

export const painPointService = new PainPointService();
