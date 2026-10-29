import { api } from './client';
import { IApplication, ApplicationInput, ApplicationStatus } from '../types/application';

export const fetchApplications = async (): Promise<IApplication[]> => {
  const { data } = await api.get('/api/applications');
  return data;
};

export const createApplication = async (
  input: ApplicationInput
): Promise<IApplication> => {
  const { data } = await api.post('/api/applications', input);
  return data;
};

export const updateApplication = async (
  id: string,
  input: ApplicationInput
): Promise<IApplication> => {
  const { data } = await api.put(`/api/applications/${id}`, input);
  return data;
};

export const moveApplication = async (
  id: string,
  status: ApplicationStatus,
  position: number
): Promise<IApplication> => {
  const { data } = await api.patch(`/api/applications/${id}/move`, {
    status,
    position,
  });
  return data;
};

export const deleteApplication = async (id: string): Promise<void> => {
  await api.delete(`/api/applications/${id}`);
};
