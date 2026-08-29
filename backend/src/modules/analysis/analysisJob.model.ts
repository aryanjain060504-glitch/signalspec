import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAnalysisJob extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentStage:
    | 'cleaning'
    | 'sentiment_theme'
    | 'pain_points'
    | 'clustering'
    | 'opportunities'
    | 'scoring'
    | 'completed';
  progress: number;
  message: string;
  totalReviews: number;
  processedReviews: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisJobSchema = new Schema<IAnalysisJob>(
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
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    currentStage: {
      type: String,
      enum: [
        'cleaning',
        'sentiment_theme',
        'pain_points',
        'clustering',
        'opportunities',
        'scoring',
        'completed',
      ],
      default: 'cleaning',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    message: {
      type: String,
      default: 'Job queued',
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    processedReviews: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AnalysisJobSchema.index({ projectId: 1, createdAt: -1 });

export const AnalysisJob = mongoose.model<IAnalysisJob>('AnalysisJob', AnalysisJobSchema);
