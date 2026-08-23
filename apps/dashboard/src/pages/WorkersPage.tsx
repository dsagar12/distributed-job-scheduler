import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const WorkersPage: React.FC = () => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ['workers'],
    queryFn: () => api.workers.list(),
    refetchInterval: 3000,
  });

  const selectedWorker = workers.find((w: any) => w.id === selectedWorkerId) || workers[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Worker Fleet Control Plane
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Distributed execution nodes, heartbeats, and queue concurrency capacities.
          </p>
        </div>

        <button onClick={() => refetch()} className="infra-btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Main Grid: Worker Table & Selected Worker Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Worker Nodes Table */}
        <div className="lg:col-span-2 infra-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Active Worker Nodes
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                {workers.length}
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Heartbeat OK
            </span>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : workers.length === 0 ? (
            <EmptyState title="No Worker Nodes Detected" description="Start a worker daemon process to begin claiming queue tasks." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="infra-table-header">
                  <tr>
                    <th className="px-5 py-3">Worker ID</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Active / Capacity</th>
                    <th className="px-5 py-3">Utilization</th>
                    <th className="px-5 py-3">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {workers.map((w: any) => {
                    const isSelected = selectedWorker?.id === w.id;
                    const active = w.activeJobsCount || 0;
                    const max = w.maxConcurrency || 10;
                    const pct = Math.min(100, Math.round((active / max) * 100));

                    return (
                      <tr
                        key={w.id}
                        onClick={() => setSelectedWorkerId(w.id)}
                        className={`infra-table-row cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <td className="infra-table-cell font-semibold text-slate-900">
                          {w.hostname} <span className="text-slate-400 font-normal">({w.id.substring(0, 8)}...)</span>
                        </td>
                        <td className="infra-table-cell">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="infra-table-cell text-slate-700 font-sans">
                          <span className="font-semibold text-blue-600">{active}</span> / {max} slots
                        </td>
                        <td className="infra-table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct > 80 ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="infra-table-cell text-slate-500 font-sans">
                          {w.lastHeartbeatAt ? new Date(w.lastHeartbeatAt).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Worker Detail Card */}
        <div className="infra-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Worker Telemetry
            </h3>
            {selectedWorker && <StatusBadge status={selectedWorker.status} />}
          </div>

          {!selectedWorker ? (
            <div className="text-center py-8 text-slate-400 text-xs font-mono">Select a worker node</div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Hostname</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedWorker.hostname}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-slate-500 font-sans">Node UUID</div>
                <div className="text-xs text-blue-600 font-semibold truncate mt-0.5 bg-blue-50 px-2 py-1 rounded border border-blue-100">{selectedWorker.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 font-sans">Active Leases</div>
                  <div className="text-lg font-bold text-blue-600 mt-0.5">{selectedWorker.activeJobsCount || 0}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 font-sans">Max Concurrency</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{selectedWorker.maxConcurrency || 10}</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-700 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">CPU Usage:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedWorker.cpuUsage != null ? `${selectedWorker.cpuUsage.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Heap Memory:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedWorker.memoryMb != null ? `${selectedWorker.memoryMb} MB` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Queue Bindings:</span>
                  <span className="text-blue-700 font-medium">
                    {selectedWorker.queues?.length > 0
                      ? selectedWorker.queues.map((q: any) => q.name || q).join(', ')
                      : 'All Queues'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Total Completed:</span>
                  <span className="text-emerald-700 font-bold">
                    {selectedWorker.totalJobsCompleted ?? '0'}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 space-y-1.5 font-sans">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registered: {new Date(selectedWorker.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Heartbeat check: Every 2000ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
