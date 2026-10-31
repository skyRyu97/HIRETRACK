import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { fetchAnalyticsSummary } from '../api/analytics';
import { IAnalyticsSummary } from '../types/analytics';
import {
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Bookmark,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<IAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchAnalyticsSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const token = localStorage.getItem('accessToken') || '';
  const apiUrl = window.location.origin;

  // 1-Click Zero-Install Bookmarklet Code
  const bookmarkletCode = `javascript:(function(){
    var url=window.location.href;
    var title=document.title;
    var company='';
    var role='';
    var jd='';
    var loc='';

    if(url.includes('linkedin.com')){
      var tEl=document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1');
      if(tEl) role=tEl.innerText.trim();
      var cEl=document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
      if(cEl) company=cEl.innerText.trim();
      var lEl=document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
      if(lEl) loc=lEl.innerText.trim();
      var jEl=document.querySelector('#job-details, .jobs-description__content');
      if(jEl) jd=jEl.innerText.trim();
    } else if(url.includes('naukri.com')){
      var tEl=document.querySelector('h1.styles_jd-header-title__rZwM1, h1');
      if(tEl) role=tEl.innerText.trim();
      var cEl=document.querySelector('.styles_jd-header-comp-name__MvqAI, a.comp-name');
      if(cEl) company=cEl.innerText.trim();
      var lEl=document.querySelector('.styles_jdn-header-loc__zG8lU, .loc');
      if(lEl) loc=lEl.innerText.trim();
      var jEl=document.querySelector('.styles_job-desc-container__txpYf, .dang-inner-html');
      if(jEl) jd=jEl.innerText.trim();
    }

    if(!role) role=prompt('Job Role / Title:', title) || 'Job Posting';
    if(!company) company=prompt('Company Name:', 'Company') || 'Company';

    var token='${token}';
    if(!token){
      alert('Please log in to HireTrack AI before clipping jobs.');
      return;
    }

    fetch('${apiUrl}/api/applications',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+token
      },
      body:JSON.stringify({
        company:company,
        role:role,
        jobUrl:url,
        location:loc||'Remote / Unspecified',
        jdText:jd||'',
        status:'wishlist',
        notes:'Clipped via HireTrack 1-Click Bookmarklet on '+new Date().toLocaleDateString()
      })
    }).then(function(r){
      if(r.ok){
        alert('🎯 Saved to HireTrack AI Wishlist: '+company+' - '+role);
      } else {
        alert('⚠️ Failed to save job to HireTrack. Please check your session.');
      }
    }).catch(function(e){
      alert('Error connecting to HireTrack: '+e.message);
    });
  })();`.replace(/\s+/g, ' ');

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const statusColors: Record<string, string> = {
    wishlist: '#94a3b8',
    applied: '#3b82f6',
    oa: '#f59e0b',
    interview: '#a855f7',
    offer: '#10b981',
    rejected: '#f43f5e',
  };

  const statusLabels: Record<string, string> = {
    wishlist: 'Wishlist',
    applied: 'Applied',
    oa: 'Online Assessment',
    interview: 'Interview Rounds',
    offer: 'Offer Letter',
    rejected: 'Archived / Rejected',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <span>Application Intelligence & Velocity</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 5 Active
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time pipeline metrics, stage conversion rates, and automated reminder status.
            </p>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Applications */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Total Tracked Jobs</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              {loading ? '...' : data?.totalApplications || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Across all 6 Kanban pipeline stages</span>
            </p>
          </div>

          {/* Card 2: Active Interviews */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-purple-400">Active Interviews</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-purple-300">
              {loading ? '...' : data?.activeInterviews || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>High priority in-flight opportunities</span>
            </p>
          </div>

          {/* Card 3: Offers Received */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-emerald-400">Offers Secured</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {loading ? '...' : data?.totalOffers || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Final stage success stories</span>
            </p>
          </div>

          {/* Card 4: Conversion Rate */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-400">Interview Rate</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-blue-300">
              {loading ? '...' : `${data?.interviewConversionRate || 0}%`}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data?.interviewConversionRate || 0)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Moved from Applied to Interview / Offer
            </p>
          </div>
        </div>

        {/* Charts & Stage Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Velocity Bar Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Application Velocity (Last 8 Weeks)
                </h3>
                <p className="text-xs text-slate-400">
                  Weekly submissions pace to maintain pipeline momentum.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                Rolling 8-Wk Window
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              {data && data.weeklyVelocity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklyVelocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                      dataKey="weekLabel"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      allowDecimals={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Bar
                      dataKey="count"
                      name="Applications Added"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  {loading ? 'Crunching velocity data...' : 'No applications tracked in the last 8 weeks.'}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Stage Distribution (1 col) */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Pipeline Breakdown</h3>
              <p className="text-xs text-slate-400">Current candidate distribution by stage.</p>
            </div>

            <div className="space-y-3 py-2 flex-1 flex flex-col justify-center">
              {data &&
                Object.entries(data.statusCounts).map(([status, count]) => {
                  const total = data.totalApplications || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = statusColors[status] || '#3b82f6';
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {statusLabels[status] || status}
                        </span>
                        <span className="font-mono text-slate-400">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pipeline health: 15-20 active applications recommended for maximum yield.</span>
            </div>
          </div>
        </div>

        {/* Stage Turnaround Times */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Average Stage Turnaround Times (Days in Stage)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Calculated from application status history to reveal where hiring bottlenecks occur.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { stage: 'wishlist', label: 'Wishlist → Applied', target: '2-4 days' },
              { stage: 'applied', label: 'Applied → Assessment', target: '7-14 days' },
              { stage: 'oa', label: 'OA → Tech Interview', target: '5-7 days' },
              { stage: 'interview', label: 'Interview → Offer', target: '10-21 days' },
            ].map((st) => {
              const days = data?.averageDaysPerStage[st.stage] ?? 0;
              return (
                <div
                  key={st.stage}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
                >
                  <span className="text-xs text-slate-400 font-medium mb-1">{st.label}</span>
                  <div className="text-2xl font-extrabold text-slate-100 font-mono">
                    {loading ? '...' : `${days} d`}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">Typical: {st.target}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1-Click Chrome Extension & Zero-Install Bookmarklet Suite */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-800/40 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  1-Click Job Clipper (LinkedIn & Naukri)
                </h3>
                <p className="text-xs text-slate-400">
                  Clip job postings, salary, and full JD directly into your HireTrack board.
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
              Zero-Install Bookmarklet
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Draggable Bookmarklet */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block mb-1">
                  Option 1: Drag to Bookmarks Bar (Easiest)
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Drag the blue button below into your browser&apos;s Bookmarks Bar. When browsing any job on LinkedIn or Naukri, click it to auto-extract and save!
                </p>
              </div>

              <div className="py-2 flex items-center gap-3">
                <a
                  href={bookmarkletCode}
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/20 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                  title="Drag me to your Bookmarks Bar!"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Save to HireTrack</span>
                </a>
                <span className="text-[11px] text-slate-500 italic">← Drag this to bookmarks bar</span>
              </div>

              <button
                onClick={handleCopyBookmarklet}
                className="self-start inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {copiedBookmarklet ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Bookmarklet Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Raw Bookmarklet Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Chrome / Edge Manifest V3 Extension */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block mb-1">
                  Option 2: Browser Extension (Edge & Chrome)
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The extension source is ready in your project at{' '}
                  <code className="text-[11px] text-blue-300 font-mono">extension/</code>. Edge and Chrome use the exact same Manifest V3 engine.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div>1. In Edge, navigate to <code className="text-blue-400 font-mono">edge://extensions</code>.</div>
                <div>2. Turn on <strong>Developer mode</strong> (left sidebar switch in Edge).</div>
                <div>3. Click <strong>&quot;Load unpacked&quot;</strong> and select the <code className="text-blue-400 font-mono">extension</code> folder.</div>
                <div>4. Click the extension icon — it will <strong>auto-detect your login</strong>! Or use your token below:</div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleCopyToken}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/25 transition-colors"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Token Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy My Extension Token</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ready for LinkedIn & Naukri</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
