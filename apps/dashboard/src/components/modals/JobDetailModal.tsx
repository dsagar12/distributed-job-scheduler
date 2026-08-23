import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import { JobLifecycleTimeline } from '../common/JobLifecycleTimeline';
import {
  X,
  RotateCcw,
  Ban,
  Clock,
  AlertCircle,
  FileCode,
  Terminal,
  Activity,
  Layers,
  Check,
  Copy,
} from 'lucide-react';

interface JobDetailModalProps {
  jobId: string | null;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ jobId, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'executions' | 'logs' | 'payload'>('overview');
  const [copiedId, setCopiedId] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => (jobId ? api.jobs.get(jobId) : null),
    enabled: Boolean(jobId),
    refetchInterval: 2000,
  });

  const reprocessMutation = useMutation({
    mutationFn: () => api.jobs.reprocess(jobId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.jobs.cancel(jobId!, 'Cancelled via Developer Console inspector'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleCopyId = () => {
    if (jobId) {
      navigator.clipboard.writeText(jobId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    }
  };

  if (!jobId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Job details"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">{job?.name || 'Job Details'}</h2>
                {job && <StatusBadge status={job.status} />}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                <button
                  onClick={handleCopyId}
                  className="hover:text-slate-900 flex items-center gap-1 group font-sans"
                  title="Copy Job UUID"
                >
                  <span className="font-mono text-xs text-slate-600">ID: {jobId.substring(0, 16)}...</span>
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />}
                </button>
                {job?.idempotencyKey && (
                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px] font-sans font-medium">
                    Idempotency: {job.idempotencyKey}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {job && job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="infra-btn-danger"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

            {job && (
              <button
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
                className="infra-btn-secondary"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Reprocess</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg ml-1 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-6 select-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Lifecycle Graph
          </button>
          <button
            onClick={() => setActiveTab('executions')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'executions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Executions ({(job?.executions || []).length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Runtime Logs ({(job?.logs || []).length})
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'payload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Raw Payload
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono animate-pulse">
              Querying job telemetry from PostgreSQL...
            </div>
          ) : !job ? (
            <div className="text-center py-12 text-rose-600 text-xs font-sans font-medium">Job record not found</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Grid Metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Queue</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{job.queue?.name || 'default'}</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Priority</div>
                      <div className="text-sm font-bold text-blue-600 mt-0.5 font-mono">{job.priority} / 100</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Attempts / Max</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                        {job.attempt} / {job.maxAttempts}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Reprocess Count</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">{job.reprocessCount || 0}</div>
                    </div>
                  </div>

                  {/* Lease & Fencing Info */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 font-mono text-xs">
                    <div className="text-slate-900 font-bold uppercase tracking-wider text-xs font-sans">
                      Distributed Lease Fencing &amp; Worker
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-700">
                      <div>
                        <span className="text-slate-500 font-sans">Assigned Worker:</span>{' '}
                        {job.assignedWorkerId ? (
                          <span className="text-emerald-700 font-bold font-mono">{job.assignedWorkerId}</span>
                        ) : (
                          <span className="text-slate-400 font-sans">Unassigned</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Lease Fingerprint:</span>{' '}
                        {job.leaseToken ? (
                          <span className="text-blue-700 font-mono">fnc_{job.leaseToken.substring(0, 10)}...</span>
                        ) : (
                          <span className="text-slate-400 font-sans">Released</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Claimed At:</span>{' '}
                        {job.claimedAt ? new Date(job.claimedAt).toLocaleString() : 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Lease Until:</span>{' '}
                        {job.leaseUntil ? (
                          <span className="text-amber-700 font-mono">{new Date(job.leaseUntil).toLocaleString()}</span>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Failure Warning */}
                  {job.error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-mono space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-700 font-sans">
                        <AlertCircle className="w-4 h-4" /> Execution Failure Reason
                      </div>
                      <div className="leading-relaxed">{job.error}</div>
                    </div>
                  )}

                  {/* Lifecycle Timestamps */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 font-mono">
                    <div className="text-slate-900 font-bold uppercase tracking-wider text-xs font-sans">
                      Lifecycle Timestamps
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-slate-600 font-sans">
                      <div>
                        <span className="text-slate-400 font-medium">Created:</span> {new Date(job.createdAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Run At:</span> {new Date(job.runAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Completed:</span>{' '}
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'In-flight'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <JobLifecycleTimeline job={job} />
                </div>
              )}

              {/* TAB 3: EXECUTIONS */}
              {activeTab === 'executions' && (
                <div className="space-y-3">
                  {(job.executions || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-sans">
                      No execution attempts recorded yet.
                    </div>
                  ) : (
                    (job.executions || []).map((exec: any) => (
                      <div key={exec.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
                              Attempt #{exec.attempt}
                            </span>
                            <StatusBadge status={exec.status} />
                            <span className="text-xs text-slate-600 font-mono">Worker: {exec.workerId}</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {exec.durationMs ? `${exec.durationMs}ms` : 'In-flight'}
                          </div>
                        </div>

                        {exec.error && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-mono text-xs space-y-1">
                            <div className="font-bold text-rose-700">{exec.error}</div>
                            {exec.stackTrace && (
                              <pre className="text-[11px] text-rose-600 overflow-x-auto whitespace-pre-wrap">
                                {exec.stackTrace}
                              </pre>
                            )}
                          </div>
                        )}

                        {exec.result && (
                          <div className="p-3 bg-white border border-slate-200 rounded-lg">
                            <div className="text-[11px] text-slate-500 uppercase font-semibold mb-1 font-sans">Result</div>
                            <pre className="text-xs font-mono text-emerald-700 overflow-x-auto">
                              {JSON.stringify(exec.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: LOGS */}
              {activeTab === 'logs' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-80 overflow-y-auto">
                  {(job.logs || []).length === 0 ? (
                    <div className="text-center py-6 text-slate-500">No runtime logs emitted for this job.</div>
                  ) : (
                    (job.logs || []).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2.5 border-b border-slate-800 pb-1.5">
                        <span className="text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                            log.level === 'ERROR'
                              ? 'text-rose-400 bg-rose-950/60'
                              : log.level === 'WARN'
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-slate-300 bg-slate-800'
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-slate-200 flex-1">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 5: PAYLOAD */}
              {activeTab === 'payload' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 font-sans">Input Payload</div>
                    <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-blue-700 overflow-x-auto">
                      {JSON.stringify(job.payload, null, 2)}
                    </pre>
                  </div>

                  {job.result && (
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 font-sans">Execution Output</div>
                      <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-emerald-700 overflow-x-auto">
                        {JSON.stringify(job.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
