import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import { CreateBatchModal } from '../components/modals/CreateBatchModal';
import {
  RefreshCw,
  Plus,
  Eye,
} from 'lucide-react';

interface BatchesPageProps {
  onSelectJob: (jobId: string) => void;
}

export const BatchesPage: React.FC<BatchesPageProps> = ({ onSelectJob }) => {
  const { activeProject } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const { data: batches = [], isLoading, refetch } = useQuery({
    queryKey: ['batches', activeProject?.id],
    queryFn: () => (activeProject ? api.batches.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  const selectedBatch = batches.find((b: any) => b.id === selectedBatchId) || batches[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Batch Jobs &amp; Parent-Child Trees
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atomic batch orchestration, completion callbacks, and child job progress tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => refetch()} className="infra-btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="infra-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Batch</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Batches Table & Selected Batch Child Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Batches Table */}
        <div className="lg:col-span-2 infra-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Batch Workflows
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {batches.length}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Atomic Rollup
            </span>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : batches.length === 0 ? (
            <EmptyState
              title="No Batches Found"
              description="Group multiple discrete background tasks into an atomic batch workflow."
              actionLabel="Create Batch"
              onAction={() => setIsCreateOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="infra-table-header">
                  <tr>
                    <th className="px-5 py-3">Batch Name</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3">Completed / Total</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {batches.map((b: any) => {
                    const isSelected = selectedBatch?.id === b.id;
                    const total = b.totalJobs || 0;
                    const completed = b.completedJobs || 0;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedBatchId(b.id)}
                        className={`infra-table-row cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <td className="infra-table-cell font-sans font-semibold text-slate-900">
                          {b.name}
                        </td>
                        <td className="infra-table-cell">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="infra-table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="infra-table-cell text-slate-700 font-sans">
                          <span className="font-semibold text-blue-600">{completed}</span> / {total} jobs
                        </td>
                        <td className="infra-table-cell text-slate-500 font-sans">
                          {new Date(b.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Batch Inspector */}
        <div className="infra-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Batch Hierarchy Inspector
            </h3>
            {selectedBatch && <StatusBadge status={selectedBatch.status} />}
          </div>

          {!selectedBatch ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono">Select a batch to inspect</div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Batch Name</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedBatch.name}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Batch UUID</div>
                <div className="text-xs text-blue-600 font-semibold truncate mt-0.5 bg-blue-50 px-2 py-1 rounded border border-blue-100">{selectedBatch.id}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 font-sans">Total</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedBatch.totalJobs}</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 font-sans">Success</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">{selectedBatch.completedJobs}</div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 font-sans">Failed</div>
                  <div className="text-sm font-bold text-rose-600 mt-0.5">{selectedBatch.failedJobs || 0}</div>
                </div>
              </div>

              {/* Child Jobs List */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] uppercase font-semibold text-slate-700 font-sans flex items-center justify-between">
                  <span>Child Job Instances</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {(selectedBatch.jobs || []).length}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {(selectedBatch.jobs || []).map((childJob: any) => (
                    <div
                      key={childJob.id}
                      onClick={() => onSelectJob(childJob.id)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="truncate">
                        <span className="text-xs text-slate-900 font-sans font-medium">{childJob.name}</span>
                        <div className="text-[10px] text-slate-500 font-mono">{childJob.id.substring(0, 12)}...</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={childJob.status} />
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateBatchModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
