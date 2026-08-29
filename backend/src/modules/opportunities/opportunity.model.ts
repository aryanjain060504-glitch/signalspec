import mongoose, { Document, Schema, Types } from 'mongoose';
import { ScoreBreakdown } from '../../utils/scoring';

export interface IOpportunity extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  problemSummary: string;
  userImpact: string;
  suggestedSolution: string;
  aiReasoning: string;
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  confidence: number;
  frequencyCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'negative';
  negativeSentimentRatio: number;
  strategicRelevance: number;
  competitorContext?: string;
  status: 'open' | 'accepted' | 'rejected' | 'edited';
  evidenceReviews: Types.ObjectId[];
  evidencePainPoints: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreBreakdownSchema = new Schema(
  {
    frequencyScore: { type: Number, default: 0 },
    severityScore: { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 0 },
    strategicScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    explanation: { type: String },
  },
  { _id: false }
);

const OpportunitySchema = new Schema<IOpportunity>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    problemSummary: {
      type: String,
      required: true,
      trim: true,
    },
    userImpact: {
      type: String,
      required: true,
      trim: true,
    },
    suggestedSolution: {
      type: String,
      required: true,
      trim: true,
    },
    aiReasoning: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    scoreBreakdown: ScoreBreakdownSchema,
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 80,
    },
    frequencyCount: {
      type: Number,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'negative',
    },
    negativeSentimentRatio: {
      type: Number,
      default: 0.8,
    },
    strategicRelevance: {
      type: Number,
      default: 0.8,
    },
    competitorContext: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'accepted', 'rejected', 'edited'],
      default: 'open',
      index: true,
    },
    evidenceReviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    evidencePainPoints: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PainPoint',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

OpportunitySchema.index({ projectId: 1, score: -1, isDeleted: 1 });

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
