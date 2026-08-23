import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { CreateScheduleModal } from '../components/modals/CreateScheduleModal';
import {
  Plus,
  Play,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const SchedulesPage: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: schedules = [], isLoading, refetch } = useQuery({
    queryKey: ['schedules', activeProject?.id],
    queryFn: () => (activeProject ? api.schedules.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.schedules.trigger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.schedules.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Recurring Schedules &amp; Cron Orchestration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Idempotent recurring job triggers evaluated autonomously by the Scheduler Daemon.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => refetch()} className="infra-btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="infra-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Schedule</span>
          </button>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="infra-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Active Schedule Definitions
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {schedules.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Autonomous Evaluation Loop
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} columns={7} />
        ) : schedules.length === 0 ? (
          <EmptyState
            title="No Recurring Schedules Found"
            description="Create a recurring cron schedule or delayed task definition."
            actionLabel="Create Schedule"
            onAction={() => setIsCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="infra-table-header">
                <tr>
                  <th className="px-5 py-3">Schedule Name</th>
                  <th className="px-5 py-3">Cron Expression</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Queue</th>
                  <th className="px-5 py-3">Total Runs</th>
                  <th className="px-5 py-3">Next Run At</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {schedules.map((s: any) => (
                  <tr key={s.id} className="infra-table-row">
                    <td className="infra-table-cell font-sans font-semibold text-slate-900">
                      {s.name}
                    </td>
                    <td className="infra-table-cell text-blue-600 font-bold">
                      {s.cronExpression || 'Delayed Once'}
                    </td>
                    <td className="infra-table-cell">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="infra-table-cell font-sans text-slate-600">
                      {s.queue?.name || 'default'}
                    </td>
                    <td className="infra-table-cell text-slate-700 font-sans">{s.totalRuns || 0} runs</td>
                    <td className="infra-table-cell text-amber-600 font-medium">
                      {new Date(s.nextRunAt).toLocaleString()}
                    </td>
                    <td className="infra-table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => triggerMutation.mutate(s.id)}
                          disabled={triggerMutation.isPending}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                          title="Trigger Now (Ad-hoc)"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                          title="Delete Schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateScheduleModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
