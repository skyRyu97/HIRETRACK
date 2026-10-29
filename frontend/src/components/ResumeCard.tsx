import React from 'react';
import { IResume } from '../types/resume';
import { FileText, Calendar, Trash2, Eye, ShieldCheck } from 'lucide-react';

interface ResumeCardProps {
  resume: IResume;
  onPreview: (resume: IResume) => void;
  onDelete: (id: string) => void;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({ resume, onPreview, onDelete }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{resume.label}</h3>
              <span className="text-[11px] text-slate-500 font-mono block">
                {resume.fileName || 'Direct Text Input'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onDelete(resume._id)}
            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
            title="Delete this resume"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">WORD COUNT</span>
            <span className="font-semibold text-slate-200 font-mono">{resume.wordCount} words</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">FILE SIZE</span>
            <span className="font-semibold text-slate-200 font-mono">
              {resume.fileSize ? `${(resume.fileSize / 1024).toFixed(1)} KB` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Uploaded {formatDate(resume.uploadedAt || resume.createdAt)}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          Ready for AI Matching
        </span>

        <button
          onClick={() => onPreview(resume)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>Inspect Text</span>
        </button>
      </div>
    </div>
  );
};
