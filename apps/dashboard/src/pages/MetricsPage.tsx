import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChartSkeleton } from '../components/common/SkeletonLoader';
import { ErrorState } from '../components/common/ErrorState';
import {
  RefreshCw,
  TrendingUp,
  Clock,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E2E8F0',
  color: '#0f172a',
  borderRadius: '8px',
  fontSize: '12px',
  fontFamily: 'Inter, sans-serif',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
};

const GRID_STROKE = '#E2E8F0';

const HOURS_MAP = { '1h': 1, '6h': 6, '24h': 24, '48h': 48 } as const;
type TimeRange = keyof typeof HOURS_MAP;

export const MetricsPage: React.FC = () => {
  const { activeProject } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('6h');

  const hours = HOURS_MAP[timeRange];

  const {
    data: metrics,
    isLoading: loadingMetrics,
    isError: errorMetrics,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['metrics-overview', activeProject?.id],
    queryFn: () => api.metrics.overview(activeProject?.id),
    refetchInterval: 8000,
  });

  const {
    data: timeline = [],
    isLoading: loadingTimeline,
    isError: errorTimeline,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ['metrics-timeline', hours],
    queryFn: () => api.metrics.timeline(hours),
    refetchInterval: 10000,
    select: (data) =>
      (data || []).map((pt: any) => ({
        time: new Date(pt.bucket || pt.time || pt.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        completed: pt.completedCount ?? pt.completed ?? 0,
        failed: pt.failedCount ?? pt.failed ?? 0,
        retries: pt.retriesCount ?? pt.retries ?? 0,
        avgDurationMs: pt.avgDurationMs ?? pt.avgDuration ?? 0,
        queueDepth: pt.queueDepth ?? pt.queued ?? 0,
      })),
  });

  const {
    data: queueMetrics = [],
    isLoading: loadingQueues,
    refetch: refetchQueues,
  } = useQuery({
    queryKey: ['metrics-queues', activeProject?.id],
    queryFn: () => (activeProject ? api.metrics.queues(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 8000,
  });

  // Chart data — fall back to a single-point array with live snapshot if timeline is empty
  const chartData = useMemo(() => {
    if (timeline.length > 0) return timeline;
    if (!metrics) return [];
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return [
      { time: t, completed: metrics.completedJobsCount, failed: metrics.failedJobsCount || 0, retries: 0, avgDurationMs: metrics.avgDurationMs || 0, queueDepth: metrics.queuedJobsCount },
    ];
  }, [timeline, metrics]);

  const refetchAll = () => {
    refetchMetrics();
    refetchTimeline();
    refetchQueues();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cluster Metrics &amp; Observability
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Throughput, latency, queue backlog, and retry rates from the PostgreSQL scheduler.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 font-mono text-xs">
            {(Object.keys(HOURS_MAP) as TimeRange[]).map((range) => (
              <button
                key={range}
                id={`metrics-range-${range}`}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  timeRange === range
                    ? 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={timeRange === range}
                aria-label={`Last ${range}`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            id="metrics-refresh-btn"
            onClick={refetchAll}
            className="infra-btn-secondary"
            aria-label="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      {loadingMetrics ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="infra-card p-4">
              <div className="skeleton h-3 w-16 mb-2 rounded" />
              <div className="skeleton h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      ) : errorMetrics ? (
        <ErrorState title="Metrics unavailable" onRetry={refetchMetrics} compact />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="infra-card p-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Completed
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {metrics?.completedJobsCount?.toLocaleString() ?? 0}
            </div>
            <div className="text-xs text-emerald-600 font-semibold font-sans mt-0.5">
              {metrics?.throughputPerMin ?? 0} jobs/min
            </div>
          </div>

          <div className="infra-card p-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase font-semibold mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
              Failed / DLQ
            </div>
            <div className="text-2xl font-bold text-rose-600 font-mono">
              {metrics?.deadLetterJobsCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5">Dead letters isolated</div>
          </div>

          <div className="infra-card p-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase font-semibold mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Avg Duration
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {metrics?.avgDurationMs ?? 0}
              <span className="text-sm text-slate-400 font-normal">ms</span>
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5">Mean execution latency</div>
          </div>

          <div className="infra-card p-4">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] uppercase font-semibold mb-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              Queue Depth
            </div>
            <div className="text-2xl font-bold text-amber-600 font-mono">
              {metrics?.queuedJobsCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 font-sans mt-0.5">Pending queue claims</div>
          </div>
        </div>
      )}

      {/* Observability Graphs Grid */}
      {errorTimeline ? (
        <ErrorState title="Timeline data unavailable" onRetry={refetchTimeline} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Throughput */}
          <div className="infra-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Execution Throughput
                </h3>
                <p className="text-xs text-slate-500 font-sans">Completed jobs per time bucket</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 font-semibold">
                {metrics?.throughputPerMin ?? 0}/min
              </span>
            </div>

            {loadingTimeline ? (
              <ChartSkeleton height={192} />
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="completed" stroke="#2563eb" strokeWidth={2} fill="url(#gradCompleted)" name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Average Latency */}
          <div className="infra-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Execution Latency
                </h3>
                <p className="text-xs text-slate-500 font-sans">Average handler duration (ms)</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md text-blue-700 font-semibold">
                Avg: {metrics?.avgDurationMs ?? 0}ms
              </span>
            </div>

            {loadingTimeline ? (
              <ChartSkeleton height={192} />
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: '#cbd5e1' }} />
                    <Line type="monotone" dataKey="avgDurationMs" stroke="#059669" strokeWidth={2} dot={false} name="Avg Duration (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 3: Queue Backlog */}
          <div className="infra-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Queue Backlog Depth
                </h3>
                <p className="text-xs text-slate-500 font-sans">Jobs waiting in QUEUED state</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-amber-700 font-semibold">
                {metrics?.queuedJobsCount ?? 0} pending
              </span>
            </div>

            {loadingTimeline ? (
              <ChartSkeleton height={192} />
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(241,245,249,0.7)' }} />
                    <Bar dataKey="queueDepth" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Queue Depth" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 4: Retry / Failure Rate */}
          <div className="infra-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Retry &amp; Failure Events
                </h3>
                <p className="text-xs text-slate-500 font-sans">Transient failure retries + hard failures</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-md text-rose-700 font-semibold">
                DLQ: {metrics?.deadLetterJobsCount ?? 0}
              </span>
            </div>

            {loadingTimeline ? (
              <ChartSkeleton height={192} />
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="gradRetries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="failed" stroke="#e11d48" strokeWidth={2} fill="url(#gradFailed)" name="Failed" />
                    <Area type="monotone" dataKey="retries" stroke="#f59e0b" strokeWidth={2} fill="url(#gradRetries)" name="Retries" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-Queue Metrics Table */}
      {activeProject && (
        <div className="infra-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Per-Queue Breakdown
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {queueMetrics.length}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Live Queue Performance
            </span>
          </div>

          {loadingQueues ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-8 rounded" />
              ))}
            </div>
          ) : queueMetrics.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-sans">
              No per-queue metrics available yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="infra-table-header">
                  <tr>
                    <th className="px-5 py-3">Queue</th>
                    <th className="px-5 py-3">Completed</th>
                    <th className="px-5 py-3">Failed</th>
                    <th className="px-5 py-3">Queued</th>
                    <th className="px-5 py-3">Running</th>
                    <th className="px-5 py-3">Avg Duration</th>
                    <th className="px-5 py-3">Throughput</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {queueMetrics.map((q: any) => (
                    <tr key={q.queueId || q.id} className="infra-table-row">
                      <td className="infra-table-cell font-sans font-semibold text-slate-900">
                        {q.queueName || q.name || '-'}
                      </td>
                      <td className="infra-table-cell text-emerald-600 font-bold">
                        {(q.completedCount ?? q.completed ?? 0).toLocaleString()}
                      </td>
                      <td className="infra-table-cell text-rose-600 font-bold">
                        {q.failedCount ?? q.failed ?? 0}
                      </td>
                      <td className="infra-table-cell text-amber-600 font-bold">
                        {q.queuedCount ?? q.queued ?? 0}
                      </td>
                      <td className="infra-table-cell text-blue-600 font-bold">
                        {q.runningCount ?? q.running ?? 0}
                      </td>
                      <td className="infra-table-cell text-slate-700 font-sans">
                        {q.avgDurationMs != null ? `${q.avgDurationMs}ms` : 'N/A'}
                      </td>
                      <td className="infra-table-cell text-slate-700 font-sans">
                        {q.throughputPerMin != null ? `${q.throughputPerMin}/min` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
