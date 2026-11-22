import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { fetchAnalyticsSummary } from '../api/analytics';
import { useAuth } from '../context/AuthContext';
import { IAnalyticsSummary } from '../types/analytics';
import {
  TrendingUp,
  Target,
  Award,
  Clock,
  Sparkles,
  Bookmark,
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

  const { accessToken } = useAuth();
  const token = accessToken || '';

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Analytics</h1>
            <p className="text-xs text-slate-400 mt-1">
              Pipeline metrics and stage conversion rates.
            </p>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Total Jobs</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              {loading ? '...' : data?.totalApplications || 0}
            </div>
          </div>

          {/* Card 2: Active Interviews */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-purple-400">Active Interviews</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-purple-300">
              {loading ? '...' : data?.activeInterviews || 0}
            </div>
          </div>

          {/* Card 3: Offers Received */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-emerald-400">Offers</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {loading ? '...' : data?.totalOffers || 0}
            </div>
          </div>

          {/* Card 4: Conversion Rate */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-400">Interview Rate</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-blue-300">
              {loading ? '...' : `${data?.interviewConversionRate || 0}%`}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data?.interviewConversionRate || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Charts & Stage Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Velocity Bar Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200">
              Weekly Applications (Last 8 Weeks)
            </h3>

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
            <h3 className="text-sm font-bold text-slate-200">Stage Breakdown</h3>

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
          </div>
        </div>

        {/* Stage Turnaround Times */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Average Days per Stage</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[
              { stage: 'wishlist', label: 'Wishlist → Applied' },
              { stage: 'applied', label: 'Applied → Assessment' },
              { stage: 'oa', label: 'OA → Interview' },
              { stage: 'interview', label: 'Interview → Offer' },
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Browser Extension Token */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Browser Job Clipper</h3>
              <p className="text-xs text-slate-400">
                Save job postings from LinkedIn, Indeed, and Naukri directly to your board.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyToken}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-600/25 transition-colors shrink-0"
          >
            {copiedToken ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Extension Token</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
