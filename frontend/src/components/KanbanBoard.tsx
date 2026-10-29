import React, { useState, useEffect } from 'react';
import {
  IApplication,
  COLUMNS,
  ApplicationStatus,
  ApplicationInput,
} from '../types/application';
import {
  fetchApplications,
  createApplication,
  updateApplication,
  moveApplication,
  deleteApplication,
} from '../api/applications';
import { KanbanColumn } from './KanbanColumn';
import { JobModal } from './JobModal';
import { JobDrawer } from './JobDrawer';
import {
  Plus,
  Search,
  Filter,
  Briefcase,
  TrendingUp,
  Award,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const [applications, setApplications] = useState<IApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [defaultColumnForAdd, setDefaultColumnForAdd] =
    useState<ApplicationStatus>('wishlist');
  const [editingJob, setEditingJob] = useState<IApplication | null>(null);
  const [selectedJobForDrawer, setSelectedJobForDrawer] =
    useState<IApplication | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await fetchApplications();
      setApplications(data);
    } catch (err: any) {
      setErrorToast('Failed to load applications. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Quick summary numbers
  const totalCount = applications.length;
  const activeInterviews = applications.filter(
    (a) => a.status === 'interview' || a.status === 'oa'
  ).length;
  const offersCount = applications.filter((a) => a.status === 'offer').length;

  // Filtered applications
  const filteredApplications = applications.filter((job) => {
    const q = searchQuery.toLowerCase();
    return (
      job.company.toLowerCase().includes(q) ||
      job.role.toLowerCase().includes(q) ||
      (job.location && job.location.toLowerCase().includes(q))
    );
  });

  // Handle Drag & Drop with Optimistic UI Update
  const handleDropJob = async (jobId: string, targetStatus: ApplicationStatus) => {
    const currentJob = applications.find((a) => a._id === jobId);
    if (!currentJob || currentJob.status === targetStatus) return;

    // Snapshot current state for rollback
    const previousState = [...applications];

    // Compute target position: bottom of target column
    const targetColJobs = applications.filter((a) => a.status === targetStatus);
    const newPosition =
      targetColJobs.length > 0
        ? Math.max(...targetColJobs.map((j) => j.position)) + 1000
        : 1000;

    // Optimistically update local state immediately
    setApplications((prev) =>
      prev.map((job) => {
        if (job._id === jobId) {
          return {
            ...job,
            status: targetStatus,
            position: newPosition,
            statusHistory: [
              ...job.statusHistory,
              { status: targetStatus, at: new Date().toISOString() },
            ],
          };
        }
        return job;
      })
    );

    // Sync to backend in background
    try {
      await moveApplication(jobId, targetStatus, newPosition);
    } catch (err: any) {
      // Rollback on failure
      setApplications(previousState);
      setErrorToast('Network error: Could not move card. Reverting change.');
    }
  };

  const handleCreateJob = async (input: ApplicationInput) => {
    const newJob = await createApplication(input);
    setApplications((prev) => [newJob, ...prev]);
  };

  const handleUpdateJob = async (input: ApplicationInput) => {
    if (!editingJob) return;
    const updated = await updateApplication(editingJob._id, input);
    setApplications((prev) =>
      prev.map((job) => (job._id === updated._id ? updated : job))
    );
    if (selectedJobForDrawer?._id === updated._id) {
      setSelectedJobForDrawer(updated);
    }
    setEditingJob(null);
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job application?')) return;
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((j) => j._id !== id));
      if (selectedJobForDrawer?._id === id) {
        setSelectedJobForDrawer(null);
      }
    } catch {
      setErrorToast('Failed to delete job application.');
    }
  };

  const handleOpenAdd = (status: ApplicationStatus = 'wishlist') => {
    setDefaultColumnForAdd(status);
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Toast Alert */}
      {errorToast && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-300 text-xs shadow-2xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            className="ml-2 font-bold hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Action & Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Metrics readout */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Total Tracked:</span>
            <span className="font-bold text-slate-100">{totalCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">In Active Pipeline:</span>
            <span className="font-bold text-purple-300">{activeInterviews}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Offers:</span>
            <span className="font-bold text-emerald-400">{offersCount}</span>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-56 sm:w-64"
            />
          </div>

          <button
            onClick={() => loadJobs()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenAdd('wishlist')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Horizontal Columns View */}
      {loading && applications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] text-slate-500 text-xs">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span>Loading your job pipeline...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1750px]">
            {COLUMNS.map((col) => {
              const colJobs = filteredApplications
                .filter((job) => job.status === col.id)
                .sort((a, b) => a.position - b.position);

              return (
                <KanbanColumn
                  key={col.id}
                  config={col}
                  jobs={colJobs}
                  onSelectJob={(job) => setSelectedJobForDrawer(job)}
                  onEditJob={(job) => setEditingJob(job)}
                  onDeleteJob={handleDeleteJob}
                  onAddJobToColumn={handleOpenAdd}
                  onDropJob={handleDropJob}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      <JobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateJob}
        defaultStatus={defaultColumnForAdd}
      />

      {/* Edit Job Modal */}
      <JobModal
        isOpen={Boolean(editingJob)}
        onClose={() => setEditingJob(null)}
        onSubmit={handleUpdateJob}
        initialData={editingJob}
      />

      {/* Slide-over Job Details Drawer */}
      <JobDrawer
        job={selectedJobForDrawer}
        onClose={() => setSelectedJobForDrawer(null)}
        onEdit={(job) => setEditingJob(job)}
      />
    </div>
  );
};
