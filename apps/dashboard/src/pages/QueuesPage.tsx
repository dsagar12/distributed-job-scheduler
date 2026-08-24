import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { CreateQueueModal } from '../components/modals/CreateQueueModal';
import {
  Plus,
  Play,
  Pause,
  RefreshCw,
  Trash2,
} from 'lucide-react';

export const QueuesPage: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: queues = [], isLoading, refetch } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  const pauseMutation = useMutation({
    mutationFn: (queueId: string) => api.queues.pause(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (queueId: string) => api.queues.resume(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (queueId: string) => api.queues.delete(queueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queues'] }),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Queue Topology &amp; Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage queue priorities, rate limiting, and concurrency limits across worker fleets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => refetch()} className="infra-btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="infra-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Queue</span>
          </button>
        </div>
      </div>

      {/* Queues Table */}
      <div className="infra-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Registered Queues
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {queues.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Authoritative PostgreSQL Schema
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} columns={8} />
        ) : queues.length === 0 ? (
          <EmptyState
            title="No Queues Found"
            description="Create your first queue to start segregating background jobs."
            actionLabel="Create Queue"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="infra-table-header">
                <tr>
                  <th className="px-5 py-3">Queue Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Concurrency Limit</th>
                  <th className="px-5 py-3">Queued</th>
                  <th className="px-5 py-3">Running</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {queues.map((q: any) => {
                  const isPaused = q.status === 'PAUSED';
                  const queued = q.metrics?.queuedCount ?? q.metrics?.queued ?? 0;
                  const running = q.metrics?.runningCount ?? q.metrics?.running ?? 0;
                  const completed = q.metrics?.completedCount ?? q.metrics?.completed ?? 0;

                  return (
                    <tr key={q.id} className="infra-table-row">
                      <td className="infra-table-cell font-sans font-semibold text-slate-900">
                        {q.name}
                      </td>
                      <td className="infra-table-cell">
                        <StatusBadge status={q.status || 'ACTIVE'} />
                      </td>
                      <td className="infra-table-cell text-blue-600 font-bold">{q.priority}</td>
                      <td className="infra-table-cell text-slate-700 font-sans">{q.concurrencyLimit || 'Unlimited'}</td>
                      <td className="infra-table-cell text-amber-600 font-bold">{queued}</td>
                      <td className="infra-table-cell text-blue-600 font-bold">{running}</td>
                      <td className="infra-table-cell text-emerald-600 font-bold">{completed}</td>
                      <td className="infra-table-cell text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPaused ? (
                            <button
                              onClick={() => resumeMutation.mutate(q.id)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors"
                              title="Resume Queue"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => pauseMutation.mutate(q.id)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                              title="Pause Queue"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Delete Queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      <CreateQueueModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
