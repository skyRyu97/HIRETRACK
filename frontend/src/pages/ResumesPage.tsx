import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { IResume } from '../types/resume';
import { fetchResumes, fetchResumeById, deleteResume } from '../api/resumes';
import { ResumeCard } from '../components/ResumeCard';
import { ResumeUploadModal } from '../components/ResumeUploadModal';
import { ResumePreviewModal } from '../components/ResumePreviewModal';
import { Plus, FileText, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

export const ResumesPage: React.FC = () => {
  const [resumes, setResumes] = useState<IResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<IResume | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const data = await fetchResumes();
      setResumes(data);
    } catch {
      setErrorToast('Failed to load resumes. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handlePreview = async (resume: IResume) => {
    try {
      // Fetch full object with extractedText
      const full = await fetchResumeById(resume._id);
      setPreviewResume(full);
    } catch {
      setErrorToast('Could not load full resume text.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume profile?')) return;
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      if (previewResume?._id === id) {
        setPreviewResume(null);
      }
    } catch {
      setErrorToast('Failed to delete resume.');
    }
  };

  const handleUploadSuccess = (newResume: IResume) => {
    setResumes((prev) => [newResume, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
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

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 3 Active
              </span>
              <span className="text-xs text-slate-500">Multi-Resume Management</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Resume Vault</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload PDF resumes to extract clean text. In Phase 4, the Gemini AI matcher compares these against job descriptions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadResumes}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Refresh resumes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resume</span>
            </button>
          </div>
        </div>

        {/* Resumes Grid */}
        {loading && resumes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-slate-500 text-xs">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Loading resume profiles...</span>
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-900/40 border border-slate-800 border-dashed text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">No Resumes in Vault</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
              Upload your primary resume as a PDF or paste text manually to prepare for intelligent AI matching in Phase 4.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Upload First Resume</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume._id}
                resume={resume}
                onPreview={handlePreview}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Phase 4 AI Teaser Banner */}
        <div className="mt-12 p-5 rounded-2xl bg-gradient-to-r from-blue-950/30 via-indigo-950/30 to-purple-950/30 border border-indigo-800/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-200">
                Ready for Phase 4: Gemini AI Resume-to-JD Matcher
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Every resume parsed in Phase 3 is indexed and ready to be matched against any job card on your Kanban board.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        <ResumeUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={handleUploadSuccess}
        />

        {/* Inspect Text Modal */}
        <ResumePreviewModal
          resume={previewResume}
          onClose={() => setPreviewResume(null)}
        />
      </main>
    </div>
  );
};
