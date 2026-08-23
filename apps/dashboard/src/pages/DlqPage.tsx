import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import {
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Eye,
  Brain,
} from 'lucide-react';

interface DlqPageProps {
  onSelectJob: (jobId: string) => void;
}

export const DlqPage: React.FC<DlqPageProps> = ({ onSelectJob }) => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: dlqResponse, isLoading, refetch } = useQuery({
    queryKey: ['dlq', activeProject?.id],
    queryFn: () => (activeProject ? api.dlq.list({ projectId: activeProject.id }) : { data: [], meta: {} }),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  const reprocessMutation = useMutation({
    mutationFn: (dlqId: string) => api.dlq.reprocess(dlqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (dlqId: string) => api.dlq.resolve(dlqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
    },
  });

  const dlqItems = dlqResponse?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dead Letter Queue (DLQ)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Poison-pill executions and permanent job failures awaiting triage or re-enqueue.
          </p>
        </div>

        <button onClick={() => refetch()} className="infra-btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* DLQ Incident Table */}
      <div className="infra-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Dead Letter Records
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
              {dlqItems.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Exhausted Max Retry Quota
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} columns={7} />
        ) : dlqItems.length === 0 ? (
          <EmptyState
            title="Dead Letter Queue is Empty"
            description="No poison-pill jobs detected. Worker fleets are completing executions successfully."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="infra-table-header">
                <tr>
                  <th className="px-5 py-3">Job ID</th>
                  <th className="px-5 py-3">Job Name</th>
                  <th className="px-5 py-3">Queue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Error</th>
                  <th className="px-5 py-3">Failed At</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {dlqItems.map((item: any) => {
                  const job = item.job || item;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectJob(job.id)}
                      className="infra-table-row cursor-pointer"
                    >
                      <td className="infra-table-cell font-semibold text-rose-600">
                        {job.id ? job.id.substring(0, 8) : item.id.substring(0, 8)}...
                      </td>
                      <td className="infra-table-cell font-sans font-semibold text-slate-900">
                        {job.name || 'Failed Task'}
                      </td>
                      <td className="infra-table-cell font-sans text-slate-600">
                        {job.queue?.name || 'default'}
                      </td>
                      <td className="infra-table-cell">
                        <StatusBadge status="DEAD_LETTER" />
                      </td>
                      <td className="infra-table-cell text-rose-700 max-w-xs truncate font-mono">
                        {job.error || item.error || 'Max retry limit reached'}
                      </td>
                      <td className="infra-table-cell text-slate-500 font-sans">
                        {new Date(job.updatedAt || item.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="infra-table-cell text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate('/investigator')}
                            className="infra-btn-secondary text-[11px] px-2 py-1 text-blue-600"
                            title="Investigate with AI"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>Diagnose</span>
                          </button>
                          <button
                            onClick={() => reprocessMutation.mutate(item.id)}
                            disabled={reprocessMutation.isPending}
                            className="infra-btn-primary text-[11px] px-2.5 py-1"
                            title="Re-enqueue Job"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reprocess</span>
                          </button>
                          <button
                            onClick={() => resolveMutation.mutate(item.id)}
                            disabled={resolveMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                            title="Archive / Resolve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectJob(job.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
