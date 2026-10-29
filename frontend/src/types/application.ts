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
  at: string;
}

export interface IApplication {
  _id: string;
  userId: string;
  company: string;
  role: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  jdText?: string;
  status: ApplicationStatus;
  position: number;
  appliedAt?: string;
  followUpAt?: string;
  statusHistory: IStatusHistoryItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInput {
  company: string;
  role: string;
  jobUrl?: string;
  location?: string;
  salary?: string;
  jdText?: string;
  status: ApplicationStatus;
  notes?: string;
  followUpAt?: string | null;
  appliedAt?: string | null;
}

export interface ColumnConfig {
  id: ApplicationStatus;
  title: string;
  accent: string;
  badge: string;
  border: string;
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: 'wishlist',
    title: 'Wishlist',
    accent: 'from-slate-500/10 to-slate-500/5',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    border: 'border-slate-800',
  },
  {
    id: 'applied',
    title: 'Applied',
    accent: 'from-blue-500/10 to-blue-500/5',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    border: 'border-blue-900/40',
  },
  {
    id: 'oa',
    title: 'OA / Test',
    accent: 'from-amber-500/10 to-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    border: 'border-amber-900/40',
  },
  {
    id: 'interview',
    title: 'Interview',
    accent: 'from-purple-500/10 to-purple-500/5',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    border: 'border-purple-900/40',
  },
  {
    id: 'offer',
    title: 'Offer',
    accent: 'from-emerald-500/10 to-emerald-500/5',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-900/40',
  },
  {
    id: 'rejected',
    title: 'Rejected',
    accent: 'from-rose-500/10 to-rose-500/5',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    border: 'border-rose-900/40',
  },
];
