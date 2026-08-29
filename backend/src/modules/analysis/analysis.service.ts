import { Types } from 'mongoose';
import { AnalysisJob, IAnalysisJob } from './analysisJob.model';
import { Project } from '../projects/project.model';
import { Review } from '../reviews/review.model';
import { PainPoint, IPainPoint } from '../painPoints/painPoint.model';
import { Opportunity } from '../opportunities/opportunity.model';
import { aiService, RawReviewItem } from '../../services/ai.service';
import { calculateOpportunityScore } from '../../utils/scoring';
import { assertOwnership, AppError } from '../../utils/ownershipCheck';
import { emitJobProgress } from '../../sockets';
import { logger } from '../../utils/logger';

export class AnalysisService {
  /**
   * Spawns an asynchronous analysis job for a project's reviews
   */
  async startAnalysis(userId: string, projectId: string): Promise<IAnalysisJob> {
    const project = await assertOwnership(Project, projectId, userId);

    const reviews = await Review.find({
      projectId: project._id,
      isDeleted: false,
    });

    if (reviews.length === 0) {
      throw new AppError(
        'No reviews found in this project. Please import reviews before starting analysis.',
        400,
        'NO_REVIEWS_FOUND'
      );
    }

    const job = new AnalysisJob({
      projectId: project._id,
      userId: new Types.ObjectId(userId),
      status: 'pending',
      currentStage: 'cleaning',
      progress: 0,
      message: 'Job initialized',
      totalReviews: reviews.length,
      startedAt: new Date(),
    });

    await job.save();

    // Execute analysis asynchronously
    this.executeAnalysisPipeline(job._id.toString(), userId, projectId, reviews).catch(
      (err) => {
        logger.error(`Analysis job ${job._id} execution failed:`, err);
      }
    );

    return job;
  }

  /**
   * Internal asynchronous worker for executing the AI pipeline
   */
  private async executeAnalysisPipeline(
    jobId: string,
    userId: string,
    projectId: string,
    reviews: any[]
  ): Promise<void> {
    const job = await AnalysisJob.findById(jobId);
    if (!job) return;

    job.status = 'processing';
    await job.save();

    const updateProgress = async (
      stage: any,
      progress: number,
      message: string,
      error?: string
    ) => {
      const updateData: Record<string, any> = {
        currentStage: stage,
        progress,
        message,
      };
      if (error) updateData.error = error;

      await AnalysisJob.findByIdAndUpdate(jobId, { $set: updateData });

      emitJobProgress(userId, projectId, {
        jobId,
        status: 'processing',
        stage,
        progress,
        message,
        error,
      });
    };

    try {
      const rawReviews: RawReviewItem[] = reviews.map((r) => ({
        id: r._id.toString(),
        source: r.source,
        product: r.competitorName,
        rating: r.rating,
        reviewText: r.reviewText,
        date: r.reviewDate,
        author: r.author,
      }));

      const project = await Project.findById(projectId);
      const projectName = project ? project.name : 'SaaS Project';

      // 1. Run AI Pipeline
      const pipelineOutput = await aiService.runReviewAnalysisPipeline(
        rawReviews,
        projectName,
        (stage, progress, msg) => {
          updateProgress(stage, progress, msg);
        }
      );

      // 2. Tag and update individual reviews with themes & sentiment
      const sentimentMap = new Map<string, 'positive' | 'neutral' | 'negative'>();
      reviews.forEach((r) => {
        const text = r.reviewText.toLowerCase();
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
        if (r.rating) {
          sentiment = r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral';
        } else if (/great|love|awesome|amazing|fantastic|best/i.test(text)) {
          sentiment = 'positive';
        } else if (/bad|terrible|awful|broken|crash|slow|worst|hate/i.test(text)) {
          sentiment = 'negative';
        }
        sentimentMap.set(r._id.toString(), sentiment);
      });

      const bulkOps = reviews.map((r) => ({
        updateOne: {
          filter: { _id: r._id },
          update: {
            $set: {
              sentiment: sentimentMap.get(r._id.toString()) || 'neutral',
              extractedThemes: pipelineOutput.themes.filter((theme) =>
                r.reviewText.toLowerCase().includes(theme.toLowerCase().split(' ')[0] || '')
              ),
            },
          },
        },
      }));

      if (bulkOps.length > 0) {
        await Review.bulkWrite(bulkOps as any);
      }

      // 3. Save Pain Points
      const createdPainPoints: IPainPoint[] = [];
      for (const pp of pipelineOutput.painPoints) {
        const validReviewObjectIds = pp.evidenceReviewIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id));

        const newPainPoint = new PainPoint({
          projectId: new Types.ObjectId(projectId),
          userId: new Types.ObjectId(userId),
          title: pp.title,
          description: pp.description,
          frequency: pp.frequency || validReviewObjectIds.length,
          severity: pp.severity,
          confidence: pp.confidence,
          userSegment: pp.userSegment,
          relatedThemes: pp.relatedThemes,
          evidenceReviewIds: validReviewObjectIds,
          status: 'active',
        });

        await newPainPoint.save();
        createdPainPoints.push(newPainPoint);
      }

      // 4. Save Opportunities with explainable scoring
      const totalReviews = reviews.length;
      for (const opp of pipelineOutput.opportunities) {
        const validReviewObjectIds = opp.evidenceReviewIds
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id));

        const matchedPainPointIds: Types.ObjectId[] = [];
        opp.evidencePainPointIndices.forEach((idx) => {
          if (createdPainPoints[idx]) {
            matchedPainPointIds.push(createdPainPoints[idx]!._id);
          }
        });

        const scoreBreakdown = calculateOpportunityScore({
          frequency: opp.frequency || validReviewObjectIds.length,
          totalReviewsInProject: Math.max(totalReviews, 1),
          severity: opp.severity,
          negativeSentimentRatio: opp.negativeSentimentRatio,
          strategicRelevance: opp.strategicRelevance,
          confidence: opp.confidence,
        });

        const newOpportunity = new Opportunity({
          projectId: new Types.ObjectId(projectId),
          userId: new Types.ObjectId(userId),
          title: opp.title,
          description: opp.description,
          problemSummary: opp.problemSummary,
          userImpact: opp.userImpact,
          suggestedSolution: opp.suggestedSolution,
          aiReasoning: opp.aiReasoning,
          score: scoreBreakdown.totalScore,
          scoreBreakdown,
          confidence: opp.confidence,
          frequencyCount: opp.frequency || validReviewObjectIds.length,
          severity: opp.severity,
          sentiment: 'negative',
          negativeSentimentRatio: opp.negativeSentimentRatio,
          strategicRelevance: opp.strategicRelevance,
          status: 'open',
          evidenceReviews: validReviewObjectIds,
          evidencePainPoints: matchedPainPointIds,
        });

        await newOpportunity.save();
      }

      // 5. Update Project Metrics
      const [totalPainPoints, totalOpportunities] = await Promise.all([
        PainPoint.countDocuments({ projectId: new Types.ObjectId(projectId), status: 'active' }),
        Opportunity.countDocuments({ projectId: new Types.ObjectId(projectId), isDeleted: false }),
      ]);

      await Project.findByIdAndUpdate(projectId, {
        $set: {
          'metrics.painPointsCount': totalPainPoints,
          'metrics.opportunitiesCount': totalOpportunities,
        },
      });

      // 6. Complete Job
      await AnalysisJob.findByIdAndUpdate(jobId, {
        $set: {
          status: 'completed',
          currentStage: 'completed',
          progress: 100,
          message: 'Analysis completed successfully',
          processedReviews: reviews.length,
          completedAt: new Date(),
        },
      });

      emitJobProgress(userId, projectId, {
        jobId,
        status: 'completed',
        stage: 'completed',
        progress: 100,
        message: 'Analysis completed successfully',
      });
    } catch (error: any) {
      logger.error(`Error in analysis execution pipeline for job ${jobId}:`, error);
      await AnalysisJob.findByIdAndUpdate(jobId, {
        $set: {
          status: 'failed',
          error: error.message,
          message: 'Analysis encountered an error',
        },
      });

      emitJobProgress(userId, projectId, {
        jobId,
        status: 'failed',
        stage: 'failed',
        progress: 0,
        message: 'Analysis encountered an error',
        error: error.message,
      });
    }
  }

  async getJobById(userId: string, jobId: string): Promise<IAnalysisJob> {
    return assertOwnership(AnalysisJob, jobId, userId, {});
  }

  async listProjectJobs(userId: string, projectId: string): Promise<IAnalysisJob[]> {
    await assertOwnership(Project, projectId, userId);
    return AnalysisJob.find({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }

  async cancelJob(userId: string, jobId: string): Promise<IAnalysisJob> {
    const job = await assertOwnership(AnalysisJob, jobId, userId, {});
    if (job.status === 'processing' || job.status === 'pending') {
      job.status = 'cancelled';
      job.message = 'Job cancelled by user';
      await job.save();
    }
    return job;
  }
}

export const analysisService = new AnalysisService();
