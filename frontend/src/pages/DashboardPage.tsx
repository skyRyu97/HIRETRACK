import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { KanbanBoard } from '../components/KanbanBoard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Header greeting */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Application Pipeline
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag cards to update their status. Changes and timeline transitions are saved in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Phase 2 Active: Kanban Core
            </span>
          </div>
        </div>

        {/* Live Kanban Board */}
        <KanbanBoard />
      </main>
    </div>
  );
};
