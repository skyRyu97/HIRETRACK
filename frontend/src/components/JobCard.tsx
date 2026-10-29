import React from 'react';
import { IApplication } from '../types/application';
import {
  ExternalLink,
  MapPin,
  Banknote,
  Calendar,
  MoreVertical,
  Trash2,
  Edit2,
  FileText,
} from 'lucide-react';

interface JobCardProps {
  job: IApplication;
  onSelect: (job: IApplication) => void;
  onEdit: (job: IApplication) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job._id)}
      onClick={() => onSelect(job)}
      className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {job.company}
          </span>
          <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
            {job.role}
          </h4>
        </div>

        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl py-1 z-30">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSelect(job);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                View Details
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(job);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                Edit
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(job._id);
                }}
                className="w-full px-3 py-1.5 text-xs text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2 my-2.5">
        {job.location && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span className="truncate max-w-[110px]">{job.location}</span>
          </span>
        )}

        {job.salary && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Banknote className="w-3 h-3 text-emerald-400" />
            <span>{job.salary}</span>
          </span>
        )}

        {job.jobUrl && (
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20"
            title="Open job posting"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Link</span>
          </a>
        )}
      </div>

      {/* Notes preview if present */}
      {job.notes && (
        <p className="text-xs text-slate-400 line-clamp-2 my-2 font-normal italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
          "{job.notes}"
        </p>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 mt-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {job.appliedAt ? `Applied ${formatDate(job.appliedAt)}` : `Added ${formatDate(job.createdAt)}`}
        </span>

        {job.jdText && (
          <span className="text-[10px] font-medium text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            JD Attached
          </span>
        )}
      </div>
    </div>
  );
};
