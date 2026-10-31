import { api } from './client';
import { IAnalyticsSummary } from '../types/analytics';

export const fetchAnalyticsSummary = async (): Promise<IAnalyticsSummary> => {
  const { data } = await api.get('/api/analytics/summary');
  return data;
};
