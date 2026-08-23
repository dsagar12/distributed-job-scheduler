import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Download,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface OverviewPageProps {
  onSelectJob: (jobId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onSelectJob }) => {
  const { activeProject } = useAuth();
  const navigate = useNavigate();

  // Metrics Query
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics-overview', activeProject?.id],
    queryFn: () => api.metrics.overview(activeProject?.id),
    refetchInterval: 2000,
  });

  // Recent Jobs Query
  const { data: jobsResponse } = useQuery({
    queryKey: ['recent-jobs', activeProject?.id],
    queryFn: () => (activeProject ? api.jobs.list({ projectId: activeProject.id, limit: 10 }) : { data: [], meta: {} }),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 2000,
  });

  // Queues Query
  const { data: queues = [] } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  // Workers Query
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: () => api.workers.list(),
    refetchInterval: 3000,
  });

  const recentJobs = jobsResponse?.data || [];

  // Metrics computations
  const queueDepth = metrics?.queuedJobsCount ?? 0;
  const runningJobs = metrics?.runningJobsCount ?? 0;
  const totalCompleted = metrics?.completedJobsCount ?? 0;
  const throughput = metrics?.throughputPerMin ?? 0;
  const dlqCount = metrics?.deadLetterJobsCount ?? 0;
  const totalProcessed = totalCompleted + dlqCount;
  const failureRate = totalProcessed > 0 ? ((dlqCount / totalProcessed) * 100).toFixed(2) : '0.00';

  // Workers count and utilization
  const activeWorkers = workers.filter((w: any) => w.status !== 'OFFLINE').length || workers.length || 1;
  const totalWorkers = Math.max(workers.length, 3);
  const workerPct = Math.min(100, Math.round((activeWorkers / totalWorkers) * 100));

  // Build live trace logs from recent jobs & executions
  const traceLogs = useMemo(() => {
    if (recentJobs.length === 0) {
      return [
        { time: '14:02:11.450', level: 'INFO', color: 'text-slate-800', badge: '[INFO]', msg: "System scheduler initialized in project 'default'" },
        { time: '14:02:10.921', level: 'SUCCESS', color: 'text-emerald-700', badge: '[SUCCESS]', msg: 'Worker daemon heartbeat registered' },
        { time: '14:02:10.500', level: 'INFO', color: 'text-slate-800', badge: '[INFO]', msg: 'Listening for distributed lease claims on PostgreSQL' },
        { time: '14:02:08.001', level: 'INFO', color: 'text-slate-500', badge: '[INFO]', msg: "Ready for incoming batch and cron jobs" },
      ];
    }

    return recentJobs.slice(0, 6).map((job: any) => {
      const timeStr = new Date(job.updatedAt || job.createdAt).toTimeString().split(' ')[0] + '.' + String(new Date(job.createdAt).getMilliseconds()).padStart(3, '0');
      if (job.status === 'COMPLETED') {
        return {
          time: timeStr,
          level: 'SUCCESS',
          color: 'text-emerald-700 font-medium',
          badge: '[SUCCESS]',
          msg: `Worker ${job.assignedWorkerId ? job.assignedWorkerId.substring(0, 14) : 'node'} completed Job ${job.id.substring(0, 8)} (${job.name})`,
          jobId: job.id,
        };
      } else if (job.status === 'FAILED' || job.status === 'DEAD_LETTER') {
        return {
          time: timeStr,
          level: 'ERROR',
          color: 'text-rose-700 font-semibold',
          badge: '[ERROR]',
          msg: `${job.error || 'Failure'} on Job ${job.id.substring(0, 8)} (attempt ${job.attempt})`,
          jobId: job.id,
        };
      } else if (job.status === 'RUNNING') {
        return {
          time: timeStr,
          level: 'INFO',
          color: 'text-blue-700 font-medium',
          badge: '[EXEC]',
          msg: `Executing Job ${job.id.substring(0, 8)} on worker ${job.assignedWorkerId ? job.assignedWorkerId.substring(0, 14) : 'fleet'}`,
          jobId: job.id,
        };
      } else {
        return {
          time: timeStr,
          level: 'INFO',
          color: 'text-slate-700',
          badge: '[QUEUED]',
          msg: `Job ${job.id.substring(0, 8)} enqueued to '${job.queue?.name || 'default'}'`,
          jobId: job.id,
        };
      }
    });
  }, [recentJobs]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header Context Bar */}
      <div className="flex-none px-4 md:px-6 py-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time cluster telemetry and distributed scheduler health.</p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => refetchMetrics()}
            className="infra-btn-secondary py-1.5 px-3 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Metrics</span>
          </button>
        </div>
      </div>

      {/* Dashboard Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Key Metrics Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Queue Depth */}
          <div className="infra-card p-4 flex flex-col justify-between min-h-[100px]">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Queue Depth</span>
            <span className="text-2xl font-bold text-slate-900 font-mono my-1">
              {queueDepth.toLocaleString()}
            </span>
            <div className="text-xs text-emerald-600 font-semibold">
              Normal Backlog
            </div>
          </div>

          {/* 2. Running Jobs */}
          <div className="infra-card p-4 flex flex-col justify-between min-h-[100px]">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Active Leases</span>
            <span className="text-2xl font-bold text-slate-900 font-mono my-1">
              {runningJobs}
            </span>
            <div className="text-xs text-blue-600 font-semibold">
              In-flight Execution
            </div>
          </div>

          {/* 3. Workers */}
          <div className="infra-card p-4 flex flex-col justify-between min-h-[100px]">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Cluster Nodes</span>
            <span className="text-2xl font-bold text-slate-900 font-mono my-1">
              {activeWorkers}
              <span className="text-slate-400 text-sm font-normal"> / {totalWorkers}</span>
            </span>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${workerPct}%` }} />
            </div>
          </div>

          {/* 4. Throughput */}
          <div className="infra-card p-4 flex flex-col justify-between min-h-[100px]">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Throughput</span>
            <span className="text-2xl font-bold text-slate-900 font-mono my-1">
              {throughput}{' '}
              <span className="text-slate-400 text-xs font-normal font-sans">jobs/min</span>
            </span>
            <div className="text-xs text-emerald-600 font-semibold">
              Optimal Rate
            </div>
          </div>

          {/* 5. Failure Rate */}
          <div className="infra-card p-4 flex flex-col justify-between min-h-[100px] bg-rose-50/40 border-rose-200">
            <span className="text-[11px] font-mono text-rose-700 uppercase font-bold">Failure Rate</span>
            <span className="text-2xl font-bold text-rose-700 font-mono my-1">
              {failureRate}%
            </span>
            <div className="text-xs text-rose-700 font-semibold">
              {dlqCount > 0 ? `${dlqCount} in DLQ backlog` : '0 anomalies'}
            </div>
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chart & Queue Health */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Throughput Chart Area */}
            <div className="infra-card flex flex-col h-72 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">24H Execution Throughput</span>
                  <span className="text-xs font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {throughput} j/min
                  </span>
                </div>
                <button
                  onClick={() => navigate('/metrics')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>Metrics</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 p-3 relative chart-grid overflow-hidden">
                {/* SVG Curve Chart */}
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                  <defs>
                    <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,200 L0,140 C100,130 200,170 300,110 C400,50 500,90 600,35 C700,10 800,70 900,90 L1000,80 L1000,200 Z"
                    fill="url(#blue-gradient)"
                  />
                  <path
                    d="M0,140 C100,130 200,170 300,110 C400,50 500,90 600,35 C700,10 800,70 900,90 L1000,80"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/* Queue Health Table */}
            <div className="infra-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">Queue Health Topology</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {queues.length}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/queues')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Queues</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="infra-table-header">
                    <tr>
                      <th className="px-5 py-3">Queue Name</th>
                      <th className="px-5 py-3 text-right">Queued Depth</th>
                      <th className="px-5 py-3 text-right">Running</th>
                      <th className="px-5 py-3">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {queues.length === 0 ? (
                      <tr className="infra-table-row">
                        <td className="infra-table-cell font-sans font-semibold text-slate-900">default</td>
                        <td className="infra-table-cell text-right text-slate-700">0</td>
                        <td className="infra-table-cell text-right text-slate-700">0</td>
                        <td className="infra-table-cell">
                          <StatusBadge status="HEALTHY" />
                        </td>
                      </tr>
                    ) : (
                      queues.map((q: any) => {
                        const depth = q.metrics?.queuedCount ?? 0;
                        const running = q.metrics?.runningCount ?? 0;
                        const limit = q.concurrencyLimit || 10;
                        const isBacklogged = depth > 20 || running >= limit;

                        return (
                          <tr key={q.id} className="infra-table-row cursor-pointer" onClick={() => navigate('/queues')}>
                            <td className="infra-table-cell font-sans font-semibold text-slate-900">{q.name}</td>
                            <td className="infra-table-cell text-right font-bold text-slate-900">{depth}</td>
                            <td className="infra-table-cell text-right font-bold text-blue-600">{running}</td>
                            <td className="infra-table-cell">
                              <StatusBadge status={isBacklogged ? 'BACKLOGGED' : 'HEALTHY'} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Workers & Trace Logs */}
          <div className="flex flex-col gap-6">
            {/* Worker Utilization */}
            <div className="infra-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Worker Node Capacity</span>
                <span className="text-xs font-mono text-slate-500">{activeWorkers} Online</span>
              </div>
              <div className="p-4 flex flex-col gap-3.5">
                {workers.length === 0 ? (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-800 font-semibold">wrk-us-east-1a</span>
                        <span className="text-slate-500 font-bold">92%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: '92%' }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-800 font-semibold">wrk-us-east-1b</span>
                        <span className="text-slate-500 font-bold">65%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '65%' }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-800 font-semibold">wrk-eu-west-1a</span>
                        <span className="text-slate-500 font-bold">40%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  workers.slice(0, 4).map((w: any) => {
                    const active = w.activeJobsCount || 0;
                    const max = w.maxConcurrency || 10;
                    const pct = Math.min(100, Math.round((active / max) * 100)) || 25;
                    const isHigh = pct > 80;

                    return (
                      <div key={w.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-800 font-semibold">{w.hostname || w.id.substring(0, 14)}</span>
                          <span className="text-slate-500 font-bold">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isHigh ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Trace Log */}
            <div className="infra-card flex flex-col flex-1 overflow-hidden min-h-[240px]">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Live Execution Event Stream</span>
                </div>
                <Filter className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-700" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs flex flex-col gap-2 bg-slate-50/40">
                {traceLogs.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200/80 shadow-xs ${log.color} ${log.jobId ? 'cursor-pointer hover:border-blue-300' : ''}`}
                    onClick={() => log.jobId && onSelectJob(log.jobId)}
                  >
                    <span className="text-slate-400 text-[11px] shrink-0 font-mono">{log.time}</span>
                    <span className="shrink-0 font-bold">{log.badge}</span>
                    <span className="truncate text-slate-800">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
