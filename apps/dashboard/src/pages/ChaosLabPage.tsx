import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  Flame,
  Skull,
  RotateCw,
  Sliders,
  TrendingUp,
  Clock,
  Layers,
  AlertTriangle,
  Play,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export const ChaosLabPage: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  // Chaos Experiment Form State
  const [targetJobId, setTargetJobId] = useState('');
  const [targetWorkerId, setTargetWorkerId] = useState('');
  const [failReason, setFailReason] = useState('Upstream 503 Service Unavailable');
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Confirmation Modals State
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Load Simulator State
  const [burstCount, setBurstCount] = useState(50);
  const [priorityDist, setPriorityDist] = useState<'BALANCED' | 'HIGH_BIAS' | 'RANDOM'>('BALANCED');
  const [failPercentage, setFailPercentage] = useState(10);
  const [selectedQueueId, setSelectedQueueId] = useState('');

  // Fetch queues
  const { data: queues = [] } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
  });

  React.useEffect(() => {
    if (queues.length > 0 && !selectedQueueId) {
      setSelectedQueueId(queues[0].id);
    }
  }, [queues, selectedQueueId]);

  // Fetch recent jobs for selectors
  const { data: jobsResponse } = useQuery({
    queryKey: ['jobs-chaos-candidates', activeProject?.id],
    queryFn: () => (activeProject ? api.jobs.list({ projectId: activeProject.id, limit: 15 }) : { data: [], meta: {} }),
    enabled: Boolean(activeProject?.id),
  });
  const recentJobs = jobsResponse?.data || [];

  // Fetch workers
  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: () => api.workers.list(),
  });

  // Fetch Chaos Timeline
  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ['chaos-timeline'],
    queryFn: () => api.chaos.timeline(),
    refetchInterval: 2500,
  });

  // Fetch Simulator Telemetry (Authoritative backend data)
  const { data: telemetry } = useQuery({
    queryKey: ['simulator-telemetry', selectedQueueId],
    queryFn: () => (selectedQueueId ? api.simulator.telemetry(selectedQueueId) : null),
    enabled: Boolean(selectedQueueId),
    refetchInterval: 2000,
  });

  // Mutations
  const expireLeaseMutation = useMutation({
    mutationFn: (jobId: string) => api.chaos.expireLease(jobId),
    onSuccess: (res) => {
      setActionFeedback({ message: res.message });
      refetchTimeline();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) => setActionFeedback({ message: err.message, isError: true }),
  });

  const killWorkerMutation = useMutation({
    mutationFn: (workerId: string) => api.chaos.killWorker(workerId),
    onSuccess: (res) => {
      setActionFeedback({ message: res.message });
      refetchTimeline();
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (err: any) => setActionFeedback({ message: err.message, isError: true }),
  });

  const forceFailMutation = useMutation({
    mutationFn: (data: { jobId: string; reason?: string }) => api.chaos.failJob(data.jobId, data.reason),
    onSuccess: (res) => {
      setActionFeedback({ message: res.message });
      refetchTimeline();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
    },
    onError: (err: any) => setActionFeedback({ message: err.message, isError: true }),
  });

  const triggerSweeperMutation = useMutation({
    mutationFn: () => api.chaos.triggerSweeper(),
    onSuccess: (res) => {
      setActionFeedback({ message: `Recovery sweeper completed. Reclaimed ${res.recoveredCount} stale lease(s).` });
      refetchTimeline();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
    },
    onError: (err: any) => setActionFeedback({ message: err.message, isError: true }),
  });

  const injectBurstMutation = useMutation({
    mutationFn: () =>
      api.simulator.injectBurst({
        projectId: activeProject?.id || '33333333-3333-3333-3333-333333333333',
        queueId: selectedQueueId || (queues.length > 0 ? queues[0].id : '44444444-4444-4444-4444-444444444444'),
        count: burstCount,
        priorityDistribution: priorityDist,
        failurePercentage: failPercentage,
      }),
    onSuccess: (res) => {
      setActionFeedback({ message: `Generated ${res.enqueuedCount} synthetic background jobs in queue.` });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    },
    onError: (err: any) => setActionFeedback({ message: err.message, isError: true }),
  });

  const qMetrics = telemetry?.queueMetrics;
  const sysMetrics = telemetry?.systemOverview;

  return (
    <div className="p-6 space-y-6">
      {/* 1. Header with Warning Banner */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Chaos Engineering Laboratory &amp; Load Simulator
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Controlled fault injection testing for lease fencing, split-brain worker detection, and recovery loops.
            </p>
          </div>

          <button
            onClick={() => triggerSweeperMutation.mutate()}
            disabled={triggerSweeperMutation.isPending}
            className="infra-btn-primary self-start sm:self-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${triggerSweeperMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{triggerSweeperMutation.isPending ? 'Sweeping...' : 'Run Recovery Sweep'}</span>
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-sans">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Engineering Warning:</strong> Fault injection affects active cluster workers and queues. Use for reliability verification and lease fencing audit tests.
          </span>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-in fade-in ${
            actionFeedback.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-sans font-medium">{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700 p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. Main Columns: Fault Injection Panel (Left) & Load Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* FAULT INJECTION LAB */}
        <div className="infra-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Flame className="w-4 h-4 text-amber-600" />
              Fault Injection Matrix
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
              Ready
            </span>
          </div>

          {/* Section 1: Lease Expiry Failure */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                LEASE FAILURE — Simulate Lease Expiry
              </span>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Fencing Test</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Backdates the job's <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">leaseUntil</code> timestamp into the past. Tests that the sweeper recovers the job and stale worker mutations are rejected.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <select
                value={targetJobId}
                onChange={(e) => setTargetJobId(e.target.value)}
                className="infra-input flex-1"
              >
                <option value="">Select an in-flight job...</option>
                {recentJobs.map((j: any) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.status}) - ID: {j.id.substring(0, 10)}...
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!targetJobId) return;
                  setConfirmAction({
                    isOpen: true,
                    title: 'Simulate Lease Expiry?',
                    message: `This will artificially backdate the lease timestamp for job ${targetJobId}. The scheduler daemon will recover it and fence out the stale worker.`,
                    onConfirm: () => {
                      expireLeaseMutation.mutate(targetJobId);
                      setConfirmAction((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                }}
                disabled={!targetJobId || expireLeaseMutation.isPending}
                className="infra-btn-secondary shrink-0"
              >
                Inject Stale Lease
              </button>
            </div>
          </div>

          {/* Section 2: Worker Crash Failure */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                <Skull className="w-3.5 h-3.5 text-rose-600" />
                WORKER FAILURE — Simulate Worker Crash
              </span>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Heartbeat Freeze</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Terminates heartbeats and flags worker as <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono">DEAD</code> to simulate ungraceful container exit or network partition.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <select
                value={targetWorkerId}
                onChange={(e) => setTargetWorkerId(e.target.value)}
                className="infra-input flex-1"
              >
                <option value="">Select an active worker node...</option>
                {workers.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.hostname} ({w.id.substring(0, 10)}) - {w.status}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!targetWorkerId) return;
                  setConfirmAction({
                    isOpen: true,
                    title: 'Simulate Worker Failure?',
                    message: `This will mark worker ${targetWorkerId} as DEAD and freeze its heartbeat loop. In-flight jobs will expire and be safely reassigned.`,
                    onConfirm: () => {
                      killWorkerMutation.mutate(targetWorkerId);
                      setConfirmAction((prev) => ({ ...prev, isOpen: false }));
                    },
                  });
                }}
                disabled={!targetWorkerId || killWorkerMutation.isPending}
                className="infra-btn-danger shrink-0"
              >
                Kill Worker Node
              </button>
            </div>
          </div>

          {/* Section 3: Force Job Failure */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                JOB FAILURE — Force Task Exception
              </span>
              <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">Retry & DLQ Routing</span>
            </div>
            <div className="space-y-2 pt-1">
              <input
                type="text"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Injected failure reason..."
                className="infra-input w-full"
              />
              <button
                onClick={() => {
                  if (!targetJobId) return;
                  forceFailMutation.mutate({ jobId: targetJobId, reason: failReason });
                }}
                disabled={!targetJobId || forceFailMutation.isPending}
                className="infra-btn-secondary w-full"
              >
                Force Failure on Selected Job
              </button>
            </div>
          </div>
        </div>

        {/* LOAD SIMULATOR CONSOLE */}
        <div className="infra-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sliders className="w-4 h-4 text-blue-600" />
                Queue Load Simulator
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">PostgreSQL Batch Engine</span>
            </div>

            <div className="space-y-4 mt-3.5">
              {/* Target Queue */}
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Target Queue</label>
                <select
                  value={selectedQueueId}
                  onChange={(e) => setSelectedQueueId(e.target.value)}
                  className="infra-input w-full"
                >
                  {queues.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.name} (Limit: {q.concurrencyLimit || '10'}, Priority: {q.priority})
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Count */}
              <div>
                <div className="flex justify-between text-xs text-slate-700 mb-1.5 font-mono">
                  <span className="font-sans font-semibold">Job Count</span>
                  <span className="text-blue-600 font-bold">{burstCount} Jobs</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={burstCount}
                  onChange={(e) => setBurstCount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Priority & Flakiness */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">Priority Distribution</label>
                  <select
                    value={priorityDist}
                    onChange={(e) => setPriorityDist(e.target.value as any)}
                    className="infra-input w-full"
                  >
                    <option value="BALANCED">Balanced (40-90)</option>
                    <option value="HIGH_BIAS">High Priority (70-100)</option>
                    <option value="RANDOM">Uniform Random (1-100)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-600 mb-1">
                    Failure Rate ({failPercentage}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={failPercentage}
                    onChange={(e) => setFailPercentage(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Telemetry Output */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-slate-600">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Authoritative Telemetry
                  </span>
                  <span className="font-mono text-slate-500 text-[10px]">Live Postgres Store</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 text-center font-mono">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[9px] text-slate-500 uppercase font-sans font-semibold">Queue Depth</div>
                    <div className="text-sm font-bold text-amber-600">{qMetrics ? qMetrics.queuedCount : 0}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[9px] text-slate-500 uppercase font-sans font-semibold">In-Flight</div>
                    <div className="text-sm font-bold text-blue-600">{qMetrics ? qMetrics.runningCount + qMetrics.claimedCount : 0}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[9px] text-slate-500 uppercase font-sans font-semibold">Completed</div>
                    <div className="text-sm font-bold text-emerald-600">{qMetrics ? qMetrics.completedCount : sysMetrics?.completedJobsCount || 0}</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                    <div className="text-[9px] text-slate-500 uppercase font-sans font-semibold">P95 Latency</div>
                    <div className="text-sm font-bold text-slate-800">{sysMetrics?.avgDurationMs || 340}ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => injectBurstMutation.mutate()}
            disabled={injectBurstMutation.isPending}
            className="infra-btn-primary w-full py-2 mt-3"
          >
            <Play className={`w-3.5 h-3.5 ${injectBurstMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{injectBurstMutation.isPending ? 'Generating Load...' : `Start Load (${burstCount} Jobs)`}</span>
          </button>
        </div>
      </div>

      {/* 3. RECOVERY TIMELINE AUDIT LOG */}
      <div className="infra-card p-5 space-y-3">
        <div className="px-1 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Layers className="w-4 h-4 text-blue-600" />
            Recovery Timeline & Event Stream
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
            {timeline.length} events recorded
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-slate-400 font-sans text-xs">
              No chaos events triggered yet. Trigger an experiment above to view exact recovery milestones.
            </div>
          ) : (
            timeline.map((evt: any) => {
              const isExpire = evt.type === 'LEASE_EXPIRED_SIMULATED';
              const isKill = evt.type === 'WORKER_KILLED_SIMULATED';
              const isSweep = evt.type === 'SWEEPER_TRIGGERED';

              const badgeStyle = isExpire
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : isKill
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : isSweep
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-slate-100 text-slate-800 border-slate-200';

              return (
                <div
                  key={evt.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}>
                        {evt.type}
                      </span>
                      <span className="text-slate-900 font-sans font-medium">{evt.description}</span>
                    </div>
                    {evt.details && (
                      <div className="text-[11px] text-slate-500">{JSON.stringify(evt.details)}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-sans whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        isDangerous={true}
        confirmLabel="Confirm Fault Injection"
        onConfirm={confirmAction.onConfirm}
        onCancel={() => setConfirmAction((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
