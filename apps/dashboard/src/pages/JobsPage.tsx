import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { TableSkeleton } from '../components/common/SkeletonLoader';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface JobsPageProps {
  onSelectJob: (jobId: string) => void;
  onOpenCreateJob: () => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onSelectJob, onOpenCreateJob }) => {
  const { activeProject } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { data: jobsResponse, isLoading, refetch } = useQuery({
    queryKey: ['jobs', activeProject?.id, statusFilter, searchFilter, page],
    queryFn: () =>
      activeProject
        ? api.jobs.list({
            projectId: activeProject.id,
            status: statusFilter || undefined,
            search: searchFilter || undefined,
            page,
            limit: 12,
          })
        : { data: [], meta: { total: 0, page: 1, limit: 12 } },
    enabled: Boolean(activeProject?.id),
    refetchInterval: 3000,
  });

  const jobs = jobsResponse?.data || [];
  const meta = jobsResponse?.meta || { total: 0, page: 1, limit: 12 };
  const totalPages = Math.ceil((meta.total || 0) / meta.limit) || 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Background Jobs Stream
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Query and inspect jobs, execution attempts, lease tokens, and error traces.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => refetch()} className="infra-btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button onClick={onOpenCreateJob} className="infra-btn-primary">
            <Plus className="w-3.5 h-3.5" />
            <span>Enqueue Job</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job name, UUID, or idempotency key..."
            className="infra-input pl-9 w-full"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="infra-input sm:w-48 w-full"
        >
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="DEAD_LETTER">Dead Letter</option>
          <option value="SCHEDULED">Scheduled</option>
        </select>
      </div>

      {/* Jobs Data Table */}
      <div className="infra-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Job Records
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
              {meta.total || jobs.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Page {page} of {totalPages}
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={8} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No Jobs Found"
            description="No jobs match your filter criteria. Enqueue a job or clear filters."
            actionLabel="Enqueue Job"
            onAction={onOpenCreateJob}
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
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-5 py-3">Attempt</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {jobs.map((job: any) => (
                  <tr
                    key={job.id}
                    onClick={() => onSelectJob(job.id)}
                    className="infra-table-row cursor-pointer"
                  >
                    <td className="infra-table-cell font-semibold text-blue-600">
                      {job.id.substring(0, 8)}...
                    </td>
                    <td className="infra-table-cell font-sans font-semibold text-slate-900">
                      {job.name}
                    </td>
                    <td className="infra-table-cell font-sans text-slate-600">
                      {job.queue?.name || 'default'}
                    </td>
                    <td className="infra-table-cell">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="infra-table-cell text-blue-600 font-bold">{job.priority}</td>
                    <td className="infra-table-cell text-slate-600">
                      {job.assignedWorkerId ? job.assignedWorkerId.substring(0, 10) : '-'}
                    </td>
                    <td className="infra-table-cell text-slate-700 font-sans font-medium">
                      {job.attempt}/{job.maxAttempts}
                    </td>
                    <td className="infra-table-cell text-slate-500 font-sans">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="infra-table-cell text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectJob(job.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                        title="View Job Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-mono">
              Showing {(page - 1) * meta.limit + 1} - {Math.min(page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="infra-btn-secondary px-2.5 py-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="infra-btn-secondary px-2.5 py-1 text-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
