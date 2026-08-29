import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICompetitor {
  _id?: Types.ObjectId;
  name: string;
  website?: string;
  notes?: string;
  createdAt: Date;
}

export interface IProjectMetrics {
  totalReviews: number;
  painPointsCount: number;
  opportunitiesCount: number;
  prdsCount: number;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  targetIcp?: string;
  competitors: ICompetitor[];
  status: 'active' | 'archived';
  metrics: IProjectMetrics;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema = new Schema<ICompetitor>({
  name: { type: String, required: true, trim: true },
  website: { type: String, trim: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetIcp: {
      type: String,
      trim: true,
    },
    competitors: [CompetitorSchema],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    metrics: {
      totalReviews: { type: Number, default: 0 },
      painPointsCount: { type: Number, default: 0 },
      opportunitiesCount: { type: Number, default: 0 },
      prdsCount: { type: Number, default: 0 },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProjectSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
ProjectSchema.index({ name: 'text', description: 'text' });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
