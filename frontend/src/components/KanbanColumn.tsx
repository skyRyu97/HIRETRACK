import React, { useState } from 'react';
import { IApplication, ColumnConfig, ApplicationStatus } from '../types/application';
import { JobCard } from './JobCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  config: ColumnConfig;
  jobs: IApplication[];
  onSelectJob: (job: IApplication) => void;
  onEditJob: (job: IApplication) => void;
  onDeleteJob: (id: string) => void;
  onAddJobToColumn: (status: ApplicationStatus) => void;
  onDropJob: (jobId: string, targetStatus: ApplicationStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  config,
  jobs,
  onSelectJob,
  onEditJob,
  onDeleteJob,
  onAddJobToColumn,
  onDropJob,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only toggle if leaving the actual column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId) {
      onDropJob(jobId, config.id);
    }
  };

  const handleCardDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-full bg-slate-900/40 rounded-2xl border transition-all duration-200 ${
        isDragOver
          ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
          : 'border-slate-800/80'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">{config.title}</span>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${config.badge}`}
          >
            {jobs.length}
          </span>
        </div>

        <button
          onClick={() => onAddJobToColumn(config.id)}
          className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title={`Add job to ${config.title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Scrollable Body */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[160px]">
        {jobs.map((job) => (
          <JobCard
            key={job._id}
            job={job}
            onSelect={onSelectJob}
            onEdit={onEditJob}
            onDelete={onDeleteJob}
            onDragStart={handleCardDragStart}
          />
        ))}

        {jobs.length === 0 && (
          <div
            onClick={() => onAddJobToColumn(config.id)}
            className="h-28 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-slate-700/80 hover:bg-slate-900/20 transition-colors"
          >
            <span className="text-xs text-slate-500">No applications</span>
            <span className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Card
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
