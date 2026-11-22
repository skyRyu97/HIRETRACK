import React from 'react';
import { Navbar } from '../components/Navbar';
import { KanbanBoard } from '../components/KanbanBoard';

export const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        <div className="mb-4 pb-3 border-b border-slate-800/80">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Applications</h1>
        </div>

        <KanbanBoard />
      </main>
    </div>
  );
};
