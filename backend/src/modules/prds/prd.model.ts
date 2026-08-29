import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEvidenceQuote {
  reviewId: string;
  quote: string;
  source: string;
  rating?: number;
}

export interface IUserStory {
  role: string;
  action: string;
  benefit: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface IFunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  acceptanceCriteria: string[];
}

export interface ISuccessMetric {
  metric: string;
  target: string;
  timeframe: string;
}

export interface IPrd extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  opportunityId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  version: number;
  status: 'draft' | 'in_review' | 'approved' | 'exported';
  overview: string;
  problemStatement: string;
  evidenceQuotes: IEvidenceQuote[];
  targetUsers: string[];
  userStories: IUserStory[];
  goals: string[];
  nonGoals: string[];
  functionalRequirements: IFunctionalRequirement[];
  userFlow: string;
  edgeCases: string[];
  successMetrics: ISuccessMetric[];
  acceptanceCriteria: string[];
  rawMarkdown: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceQuoteSchema = new Schema<IEvidenceQuote>(
  {
    reviewId: { type: String, required: true },
    quote: { type: String, required: true },
    source: { type: String, default: 'Review Import' },
    rating: { type: Number },
  },
  { _id: false }
);

const UserStorySchema = new Schema<IUserStory>(
  {
    role: { type: String, required: true },
    action: { type: String, required: true },
    benefit: { type: String, required: true },
    priority: { type: String, enum: ['P0', 'P1', 'P2'], default: 'P0' },
  },
  { _id: false }
);

const FunctionalRequirementSchema = new Schema<IFunctionalRequirement>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['P0', 'P1', 'P2'], default: 'P0' },
    acceptanceCriteria: { type: [String], default: [] },
  },
  { _id: false }
);

const SuccessMetricSchema = new Schema<ISuccessMetric>(
  {
    metric: { type: String, required: true },
    target: { type: String, required: true },
    timeframe: { type: String, required: true },
  },
  { _id: false }
);

const PrdSchema = new Schema<IPrd>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    opportunityId: {
      type: Schema.Types.ObjectId,
      ref: 'Opportunity',
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
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'approved', 'exported'],
      default: 'draft',
      index: true,
    },
    overview: {
      type: String,
      required: true,
    },
    problemStatement: {
      type: String,
      required: true,
    },
    evidenceQuotes: [EvidenceQuoteSchema],
    targetUsers: {
      type: [String],
      default: [],
    },
    userStories: [UserStorySchema],
    goals: {
      type: [String],
      default: [],
    },
    nonGoals: {
      type: [String],
      default: [],
    },
    functionalRequirements: [FunctionalRequirementSchema],
    userFlow: {
      type: String,
      required: true,
    },
    edgeCases: {
      type: [String],
      default: [],
    },
    successMetrics: [SuccessMetricSchema],
    acceptanceCriteria: {
      type: [String],
      default: [],
    },
    rawMarkdown: {
      type: String,
      required: true,
    },
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

PrdSchema.index({ projectId: 1, createdAt: -1, isDeleted: 1 });

export const Prd = mongoose.model<IPrd>('Prd', PrdSchema);
