import React from 'react';
import { JobStatus, ExecutionStatus, WorkerStatus } from '@scheduler/types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Ban,
  Pause,
  Layers,
  Activity,
  AlertOctagon,
} from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus | ExecutionStatus | WorkerStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const norm = String(status).toUpperCase();

  let IconComponent = Activity;
  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotStyle = 'bg-slate-400';
  let pulse = false;

  switch (norm) {
    case 'COMPLETED':
    case 'SUCCESS':
    case 'ONLINE':
    case 'HEALTHY':
    case 'ACTIVE':
      IconComponent = CheckCircle2;
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotStyle = 'bg-emerald-500';
      break;

    case 'RUNNING':
    case 'BUSY':
      IconComponent = Play;
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      dotStyle = 'bg-blue-600';
      pulse = true;
      break;

    case 'CLAIMED':
      IconComponent = Activity;
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200';
      dotStyle = 'bg-sky-500';
      pulse = true;
      break;

    case 'QUEUED':
      IconComponent = Layers;
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dotStyle = 'bg-indigo-500';
      break;

    case 'SCHEDULED':
      IconComponent = Clock;
      badgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      dotStyle = 'bg-cyan-600';
      break;

    case 'RETRYING':
    case 'DEGRADED':
    case 'DRAINING':
    case 'BACKLOGGED':
      IconComponent = RotateCcw;
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      dotStyle = 'bg-amber-500';
      pulse = true;
      break;

    case 'PAUSED':
      IconComponent = Pause;
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      dotStyle = 'bg-amber-500';
      break;

    case 'FAILED':
      IconComponent = AlertTriangle;
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      dotStyle = 'bg-rose-600';
      break;

    case 'DEAD_LETTER':
    case 'DEAD':
    case 'OFFLINE':
    case 'CRITICAL':
      IconComponent = AlertOctagon;
      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      dotStyle = 'bg-rose-700';
      break;

    case 'CANCELLED':
      IconComponent = Ban;
      badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
      dotStyle = 'bg-slate-400';
      break;

    default:
      IconComponent = Activity;
      badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      dotStyle = 'bg-slate-400';
      break;
  }

  const label = norm.replace(/_/g, ' ');
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
      ? 'px-3.5 py-1 text-xs'
      : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full border shadow-xs select-none transition-all ${sizeClasses} ${badgeStyle}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotStyle}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotStyle}`} />
      </span>
      <IconComponent className="w-3 h-3 shrink-0 opacity-80" />
      <span>{label}</span>
    </span>
  );
};
