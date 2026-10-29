import React, { useState, useEffect } from 'react';
import { IApplication } from '../types/application';
import { IResume } from '../types/resume';
import { IMatchResult } from '../types/match';
import { fetchResumes } from '../api/resumes';
import { runMatch, fetchMatchesForApplication } from '../api/matcher';
import { MatchResultsView } from './MatchResultsView';
import {
  X,
  Building2,
  ExternalLink,
  MapPin,
  Banknote,
  History,
  Sparkles,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface JobDrawerProps {
  job: IApplication | null;
  onClose: () => void;
  onEdit: (job: IApplication) => void;
}

export const JobDrawer: React.FC<JobDrawerProps> = ({ job, onClose, onEdit }) => {
  const [resumes, setResumes] = useState<IResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [matchResult, setMatchResult] = useState<IMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    if (!job) return;

    // Reset drawer state on job switch
    setMatchResult(null);
    setMatchError(null);

    // 1. Fetch resumes
    fetchResumes()
      .then((data) => {
        setResumes(data);
        if (data.length > 0) {
          setSelectedResumeId(data[0]._id);
        }
      })
      .catch(() => {});

    // 2. Fetch past match history for this job
    fetchMatchesForApplication(job._id)
      .then((history) => {
        if (history.length > 0) {
          setMatchResult(history[0]);
        }
      })
      .catch(() => {});
  }, [job?._id]);

  if (!job) return null;

  const handleRunMatch = async (force: boolean = false) => {
    if (!job.jdText || job.jdText.trim().length < 10) {
      setMatchError('Job description must be at least 10 characters before analyzing.');
      return;
    }

    if (resumes.length === 0) {
      setMatchError('No resume found. Please add a resume in the Resume Vault first.');
      return;
    }

    setIsMatching(true);
    setMatchError(null);

    try {
      const shouldForce = force || !!matchResult;
      const result = await runMatch(job._id, selectedResumeId || undefined, shouldForce);
      setMatchResult(result);
    } catch (err: any) {
      setMatchError(err.response?.data?.error || 'Failed to complete AI match');
    } finally {
      setIsMatching(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusDisplay: Record<string, { label: string; badge: string }> = {
    wishlist: { label: 'Wishlist', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    applied: { label: 'Applied', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    oa: { label: 'OA / Test', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    interview: { label: 'Interview', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    offer: { label: 'Offer', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    rejected: { label: 'Rejected', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  };

  const jdLength = job.jdText ? job.jdText.trim().length : 0;
  const hasJd = jdLength >= 10;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                    statusDisplay[job.status]?.badge || ''
                  }`}
                >
                  {statusDisplay[job.status]?.label || job.status}
                </span>
                {job.jobUrl && (
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    <span>Posting</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-100">{job.role}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-300">{job.company}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta attributes */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Location</span>
                <span className="font-medium text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {job.location || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Target Compensation</span>
                <span className="font-medium text-emerald-400 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  {job.salary || 'Not specified'}
                </span>
              </div>
            </div>

            {/* AI Matcher Section */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-800/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-indigo-200">Gemini AI Resume Matcher</h3>
                    <span className="text-[10px] text-slate-400">Structured JD vs. Resume Engine</span>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 4 Active
                </span>
              </div>

              {/* Controls bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-2">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    disabled={isMatching || resumes.length === 0}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    {resumes.length > 0 ? (
                      resumes.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.label} ({r.wordCount} words)
                        </option>
                      ))
                    ) : (
                      <option value="">No resumes found — add in Vault</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={() => handleRunMatch(!!matchResult)}
                  disabled={isMatching || !hasJd || resumes.length === 0}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isMatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scoring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{matchResult ? 'Re-Analyze' : 'Analyze Match'}</span>
                    </>
                  )}
                </button>
              </div>

              {jdLength === 0 ? (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Job description is missing. Edit this job to paste one.</span>
                </p>
              ) : jdLength < 10 ? (
                <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Job description is too short ({jdLength} chars). Minimum 10 characters required for AI scoring.</span>
                </p>
              ) : jdLength < 40 ? (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>💡 Tip: Pasting full job requirements and tech stack yields the most accurate score.</span>
                </p>
              ) : null}

              {matchError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{matchError}</span>
                </div>
              )}

              {/* Match Results Display */}
              {matchResult && <MatchResultsView match={matchResult} />}
            </div>

            {/* Notes */}
            {job.notes && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Internal Notes & Contacts
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap">
                  {job.notes}
                </div>
              </div>
            )}

            {/* Job Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Full Job Description
                </h4>
                {job.jdText && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {job.jdText.length} characters
                  </span>
                )}
              </div>
              {job.jdText ? (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-text">
                  {job.jdText}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 italic text-center">
                  No job description text provided yet. Edit this job to paste one.
                </div>
              )}
            </div>

            {/* Status Transition History */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Pipeline Timeline
              </h4>
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-800">
                {job.statusHistory.map((item, idx) => (
                  <div key={idx} className="relative flex items-center gap-3 pl-6">
                    <span className="absolute left-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                    <div className="flex-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 capitalize">
                        {statusDisplay[item.status]?.label || item.status}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Created {formatDate(job.createdAt)}
            </span>
            <button
              onClick={() => {
                onClose();
                onEdit(job);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
