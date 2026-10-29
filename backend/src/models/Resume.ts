import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IResume extends Document {
  userId: Types.ObjectId;
  label: string;
  extractedText: string;
  fileName?: string;
  fileSize?: number;
  wordCount: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: [true, 'Resume label is required'],
      trim: true,
    },
    extractedText: {
      type: String,
      required: [true, 'Extracted resume text is required'],
      minlength: [50, 'Resume text must contain at least 50 characters of readable text'],
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

resumeSchema.index({ userId: 1, createdAt: -1 });

export const Resume = mongoose.model<IResume>('Resume', resumeSchema);
