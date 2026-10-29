import mongoose, { Document, Schema, Types } from 'mongoose';

export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'oa'
  | 'interview'
  | 'offer'
  | 'rejected';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'wishlist',
  'applied',
  'oa',
  'interview',
  'offer',
  'rejected',
];

export interface IStatusHistoryItem {
  status: ApplicationStatus;
  at: Date;
}

export interface IApplication extends Document {
  userId: Types.ObjectId;
  company: string;
  role: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  jdText?: string;
  status: ApplicationStatus;
  position: number;
  appliedAt?: Date;
  followUpAt?: Date;
  statusHistory: IStatusHistoryItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const applicationSchema = new Schema<IApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role / Job title is required'],
      trim: true,
    },
    jobUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
    },
    jdText: {
      type: String,
      maxlength: [20000, 'Job description must not exceed 20,000 characters'],
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'wishlist',
      index: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    appliedAt: {
      type: Date,
    },
    followUpAt: {
      type: Date,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    notes: {
      type: String,
      maxlength: [5000, 'Notes must not exceed 5,000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast board queries scoped by user, status, and sort order
applicationSchema.index({ userId: 1, status: 1, position: 1 });

export const Application = mongoose.model<IApplication>(
  'Application',
  applicationSchema
);
