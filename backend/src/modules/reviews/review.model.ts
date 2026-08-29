import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  competitorName: string;
  source: string;
  rating?: number;
  reviewText: string;
  author?: string;
  reviewDate: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  extractedThemes: string[];
  extractedPainPoints: string[];
  contentHash: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
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
    competitorName: {
      type: String,
      default: 'General',
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: 'CSV Import',
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
    },
    reviewDate: {
      type: Date,
      default: Date.now,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      index: true,
    },
    sentimentScore: {
      type: Number,
    },
    extractedThemes: {
      type: [String],
      default: [],
      index: true,
    },
    extractedPainPoints: {
      type: [String],
      default: [],
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
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

// Compound indexes for high performance querying
ReviewSchema.index({ projectId: 1, contentHash: 1 });
ReviewSchema.index({ projectId: 1, sentiment: 1, rating: 1 });
ReviewSchema.index({ reviewText: 'text' });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
