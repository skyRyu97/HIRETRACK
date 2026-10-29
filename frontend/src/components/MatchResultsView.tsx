import React, { useState } from 'react';
import { IMatchResult } from '../types/match';
import { ScoreGauge } from './ScoreGauge';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';

interface MatchResultsViewProps {
  match: IMatchResult;
}

export const MatchResultsView: React.FC<MatchResultsViewProps> = ({ match }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopySuggestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Score & Summary Banner */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
        <ScoreGauge score={match.score} />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-200">Executive Match Analysis</span>
            {match.modelUsed && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  match.modelUsed.includes('heuristic')
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {match.modelUsed.includes('heuristic') ? (
                  <span>⚡ Heuristic Fallback</span>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Gemini ({match.modelUsed})</span>
                  </>
                )}
              </span>
            )}
            {match.cached ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3" />
                Cached
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-3 h-3" />
                Fresh
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{match.summary}</p>
        </div>
      </div>

      {/* Matched vs Missing Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Matched Skills */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-950/40">
          <h4 className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Matched Technical Skills ({match.matchedSkills.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {match.matchedSkills.length > 0 ? (
              match.matchedSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No direct keyword overlap</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-950/40">
          <h4 className="text-xs font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Missing / Target Gaps ({match.missingSkills.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {match.missingSkills.length > 0 ? (
              match.missingSkills.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-900 border border-slate-800 text-slate-200"
                >
                  <span>{item.skill}</span>
                  <span
                    className={`text-[9px] px-1 rounded uppercase tracking-wider ${getImportanceBadge(
                      item.importance
                    )}`}
                  >
                    {item.importance}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-emerald-400 font-medium">
                All JD requirements covered!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Bullet Point Improvements */}
      {match.suggestions && match.suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Targeted Resume Bullet Optimizations
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">
              Copy & paste into your resume
            </span>
          </div>

          <div className="space-y-2.5">
            {match.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                {/* Original */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Original Bullet
                  </span>
                  <p className="text-xs text-slate-400 line-through decoration-slate-600">
                    "{suggestion.original}"
                  </p>
                </div>

                {/* Improved */}
                <div className="pt-2 border-t border-slate-800/60 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                      <ArrowRight className="w-3 h-3" />
                      AI Enhanced Version
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      "{suggestion.improved}"
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopySuggestion(suggestion.improved, idx)}
                    className="shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Copy improved bullet point"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
