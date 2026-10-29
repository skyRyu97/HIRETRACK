import React, { useState } from 'react';
import { uploadResumePdf, createRawResume } from '../api/resumes';
import { IResume } from '../types/resume';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newResume: IResume) => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'raw'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    if (!label.trim()) {
      setLabel(selectedFile.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let createdResume: IResume;
      if (activeTab === 'upload') {
        if (!file) {
          setError('Please select a PDF file');
          setIsSubmitting(false);
          return;
        }
        createdResume = await uploadResumePdf(file, label.trim() || undefined);
      } else {
        if (!label.trim()) {
          setError('Please provide a label for this resume profile');
          setIsSubmitting(false);
          return;
        }
        if (rawText.trim().length < 50) {
          setError('Resume text must contain at least 50 characters');
          setIsSubmitting(false);
          return;
        }
        createdResume = await createRawResume({
          label: label.trim(),
          text: rawText.trim(),
        });
      }

      onSuccess(createdResume);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process resume');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <h3 className="text-base font-bold text-slate-100">Add Resume Profile</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-6 pt-3 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-xs font-semibold border-b-2 mr-6 flex items-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload PDF
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Paste Plain Text
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {activeTab === 'upload' && (
              <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Can't parse PDF text layer?</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('raw');
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-[11px] transition-colors"
                >
                  Paste Plain Text Instead →
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Resume Profile Label *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fullstack MERN Profile, Java Backend Profile"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {activeTab === 'upload' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Resume PDF File (Max 5MB)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-500/5'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
                onClick={() => document.getElementById('resume-file-input')?.click()}
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">{file.name}</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Click to choose another
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">
                      Drag and drop your PDF here, or click to browse
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Standard text-based PDF resumes only (max 5MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Resume Plain Text
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {rawText.length} characters
                </span>
              </div>
              <textarea
                rows={8}
                required
                placeholder="Paste the full plain text of your resume here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Parsing & Saving...' : 'Save Resume'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
