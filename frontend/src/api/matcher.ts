import { api } from './client';
import { IMatchResult } from '../types/match';

export const runMatch = async (
  applicationId: string,
  resumeId?: string,
  forceRefresh?: boolean
): Promise<IMatchResult> => {
  const { data } = await api.post(`/api/applications/${applicationId}/match`, {
    resumeId,
    forceRefresh,
  });
  return data;
};

export const fetchMatchesForApplication = async (
  applicationId: string
): Promise<IMatchResult[]> => {
  const { data } = await api.get(`/api/applications/${applicationId}/matches`);
  return data;
};
