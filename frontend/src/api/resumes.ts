import { api } from './client';
import { IResume, RawResumeInput } from '../types/resume';

export const fetchResumes = async (): Promise<IResume[]> => {
  const { data } = await api.get('/api/resumes');
  return data;
};

export const fetchResumeById = async (id: string): Promise<IResume> => {
  const { data } = await api.get(`/api/resumes/${id}`);
  return data;
};

export const uploadResumePdf = async (file: File, label?: string): Promise<IResume> => {
  const formData = new FormData();
  formData.append('file', file);
  if (label) {
    formData.append('label', label);
  }

  const { data } = await api.post('/api/resumes/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const createRawResume = async (input: RawResumeInput): Promise<IResume> => {
  const { data } = await api.post('/api/resumes/raw', input);
  return data;
};

export const deleteResume = async (id: string): Promise<void> => {
  await api.delete(`/api/resumes/${id}`);
};
