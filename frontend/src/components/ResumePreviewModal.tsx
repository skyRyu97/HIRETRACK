import React, { useState } from 'react';
import { IResume } from '../types/resume';
import { X, Copy, Check, FileText } from 'lucide-react';

interface ResumePreviewModalProps {
  resume: IResume | null;
  onClose: () => void;
}

export const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({ resume, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!resume) return null;

  const handleCopy = () => {
    if (resume.extractedText) {
      navigator.clipboard.writeText(resume.extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{resume.label}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {resume.wordCount} words • {resume.extractedText?.length || 0} characters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/60 select-text">
          {resume.extractedText || 'Loading parsed text...'}
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500">
          <span>Source File: {resume.fileName || 'Manual entry'}</span>
          <span>Verified for Gemini AI matching</span>
        </div>
      </div>
    </div>
  );
};
