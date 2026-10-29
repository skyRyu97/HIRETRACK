export interface IMissingSkill {
  skill: string;
  importance: 'high' | 'medium' | 'low';
}

export interface IBulletSuggestion {
  original: string;
  improved: string;
}

export interface IMatchResult {
  _id: string;
  applicationId: string;
  resumeId: string;
  score: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: IMissingSkill[];
  suggestions: IBulletSuggestion[];
  modelUsed?: string;
  cached?: boolean;
  createdAt: string;
}
