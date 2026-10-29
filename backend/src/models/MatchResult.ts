import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMissingSkill {
  skill: string;
  importance: 'high' | 'medium' | 'low';
}

export interface IBulletSuggestion {
  original: string;
  improved: string;
}

export interface IMatchResult extends Document {
  userId: Types.ObjectId;
  applicationId: Types.ObjectId;
  resumeId: Types.ObjectId;
  inputHash: string;
  score: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: IMissingSkill[];
  suggestions: IBulletSuggestion[];
  modelUsed: string;
  createdAt: Date;
  updatedAt: Date;
}

const missingSkillSchema = new Schema<IMissingSkill>(
  {
    skill: { type: String, required: true },
    importance: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  },
  { _id: false }
);

const suggestionSchema = new Schema<IBulletSuggestion>(
  {
    original: { type: String, required: true },
    improved: { type: String, required: true },
  },
  { _id: false }
);

const matchResultSchema = new Schema<IMatchResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    inputHash: {
      type: String,
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    summary: {
      type: String,
      required: true,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [missingSkillSchema],
      default: [],
    },
    suggestions: {
      type: [suggestionSchema],
      default: [],
    },
    modelUsed: {
      type: String,
      default: 'gemini-2.5-flash',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding cached match or listing job match history
matchResultSchema.index({ userId: 1, applicationId: 1, createdAt: -1 });
matchResultSchema.index({ userId: 1, inputHash: 1 });

export const MatchResult = mongoose.model<IMatchResult>('MatchResult', matchResultSchema);
