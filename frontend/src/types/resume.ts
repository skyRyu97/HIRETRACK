export interface IResume {
  _id: string;
  userId: string;
  label: string;
  extractedText?: string;
  fileName?: string;
  fileSize?: number;
  wordCount: number;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawResumeInput {
  label: string;
  text: string;
}
