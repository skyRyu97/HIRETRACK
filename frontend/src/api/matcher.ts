import { api } from './client';
import { IMatchResult } from '../types/match';

export const runMatch = async (
  applicationId: string,
  resumeId?: string
): Promise<IMatchResult> => {
  const { data } = await api.post(`/api/applications/${applicationId}/match`, {
    resumeId,
  });
  return data;
};

export const fetchMatchesForApplication = async (
  applicationId: string
): Promise<IMatchResult[]> => {
  const { data } = await api.get(`/api/applications/${applicationId}/matches`);
  return data;
};
