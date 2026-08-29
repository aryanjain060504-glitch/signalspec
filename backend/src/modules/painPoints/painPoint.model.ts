import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPainPoint extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  userSegment?: string;
  relatedThemes: string[];
  evidenceReviewIds: Types.ObjectId[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const PainPointSchema = new Schema<IPainPoint>(
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
    frequency: {
      type: Number,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 80,
    },
    userSegment: {
      type: String,
      trim: true,
    },
    relatedThemes: {
      type: [String],
      default: [],
      index: true,
    },
    evidenceReviewIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PainPointSchema.index({ projectId: 1, severity: 1, status: 1 });

export const PainPoint = mongoose.model<IPainPoint>('PainPoint', PainPointSchema);
