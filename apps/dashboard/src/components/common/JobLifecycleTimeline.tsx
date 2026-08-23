import React from 'react';
import { CheckCircle2, Clock, Play, AlertTriangle, Skull, RotateCw, Lock, ArrowRight } from 'lucide-react';
import { JobStatus } from '@scheduler/types';

interface JobLifecycleTimelineProps {
  job: any;
}

export const JobLifecycleTimeline: React.FC<JobLifecycleTimelineProps> = ({ job }) => {
  if (!job) return null;

  const isCompleted = job.status === JobStatus.COMPLETED;
  const isDeadLetter = job.status === JobStatus.DEAD_LETTER;
  const isCancelled = job.status === JobStatus.CANCELLED;
  const isFailed = job.status === JobStatus.FAILED;
  const isRetrying = job.status === 'RETRYING';
  const isRunning = job.status === JobStatus.RUNNING;
  const isClaimed = job.status === JobStatus.CLAIMED;
  const isQueued = job.status === JobStatus.QUEUED;
  const isScheduled = job.status === JobStatus.SCHEDULED;

  // Mask full leaseToken for safety: display fingerprint only
  const safeToken = job.leaseToken ? `fnc_${job.leaseToken.substring(0, 8)}...` : 'None (Released)';

  // Build sequential steps based on execution branch
  const steps: Array<{
    id: string;
    label: string;
    sublabel: string;
    icon: any;
    state: 'completed' | 'active' | 'pending' | 'failed';
  }> = [];

  // Step 1: Created
  steps.push({
    id: 'created',
    label: 'Created',
    sublabel: new Date(job.createdAt).toLocaleTimeString(),
    icon: Clock,
    state: 'completed',
  });

  // Step 2: Queued
  steps.push({
    id: 'queued',
    label: isScheduled ? 'Scheduled' : 'Queued',
    sublabel: `Priority ${job.priority}`,
    icon: Clock,
    state: isQueued || isScheduled ? 'active' : 'completed',
  });

  // Step 3: Claimed
  steps.push({
    id: 'claimed',
    label: 'Claimed',
    sublabel: job.assignedWorkerId ? `Worker ${job.assignedWorkerId.substring(0, 10)}` : 'Unassigned',
    icon: Lock,
    state: isClaimed ? 'active' : isRunning || isCompleted || isDeadLetter || isFailed || isRetrying ? 'completed' : 'pending',
  });

  // Step 4: Running (Attempt #)
  steps.push({
    id: 'running',
    label: `Running (Att. ${job.attempt || 1}/${job.maxAttempts || 3})`,
    sublabel: job.claimedAt ? new Date(job.claimedAt).toLocaleTimeString() : 'Pending',
    icon: Play,
    state: isRunning ? 'active' : isCompleted || isDeadLetter ? 'completed' : isFailed || isRetrying ? 'failed' : 'pending',
  });

  // Branching for failure vs success
  if (isRetrying || isFailed) {
    steps.push({
      id: 'retrying',
      label: 'Retrying Backoff',
      sublabel: `Next: Att. ${(job.attempt || 1) + 1}`,
      icon: RotateCw,
      state: 'active',
    });
  }

  // Step 5: Terminal
  steps.push({
    id: 'terminal',
    label: isCompleted ? 'Completed' : isDeadLetter ? 'Dead Letter' : isCancelled ? 'Cancelled' : 'Terminal',
    sublabel: isCompleted
      ? 'Execution finished'
      : isDeadLetter
      ? `Failed ${job.attempt} attempts`
      : isCancelled
      ? 'Cancelled by user'
      : 'Awaiting completion',
    icon: isCompleted ? CheckCircle2 : isDeadLetter ? Skull : isCancelled ? AlertTriangle : CheckCircle2,
    state: isCompleted ? 'completed' : isDeadLetter ? 'failed' : isCancelled ? 'completed' : 'pending',
  });

  const getStateStyle = (state: string) => {
    switch (state) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'active':
        return 'border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-400/30 animate-pulse';
      case 'failed':
        return 'border-rose-200 bg-rose-50 text-rose-700 font-bold';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-400';
    }
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Job Lifecycle Execution Graph
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Status: {job.status}</span>
        </div>
        <div className="text-[11px] font-mono text-slate-600">
          Lease Fingerprint: <span className="text-blue-600 font-bold">{safeToken}</span>
        </div>
      </div>

      {/* Sequential Breadcrumb Track */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center text-center min-w-[100px] shrink-0">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center mb-1.5 transition-all duration-150 ${getStateStyle(
                    step.state
                  )}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-[11px] font-bold leading-tight ${
                    step.state === 'active' || step.state === 'completed' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]">
                  {step.sublabel}
                </span>
              </div>

              {!isLast && (
                <div className="flex items-center justify-center text-slate-400 shrink-0 mx-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
