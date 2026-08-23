import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full space-y-2 p-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-800/40">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 bg-slate-800/60 rounded animate-pulse"
              style={{ width: `${Math.max(12, 100 / columns + (c % 2 === 0 ? 5 : -5))}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const KpiSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="p-3.5 bg-dark-900 border border-slate-800 rounded-xl space-y-2 animate-pulse">
          <div className="h-3 w-16 bg-slate-800 rounded" />
          <div className="h-6 w-12 bg-slate-700 rounded" />
          <div className="h-2 w-20 bg-slate-800/80 rounded" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 220 }) => {
  return (
    <div
      className="w-full bg-dark-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between animate-pulse"
      style={{ height: `${height}px` }}
    >
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-800/60 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-slate-800/40 rounded w-full" />
        <div className="h-2 bg-slate-800/60 rounded w-5/6" />
        <div className="h-2 bg-slate-800/40 rounded w-4/6" />
      </div>
      <div className="flex justify-between">
        <div className="h-3 w-8 bg-slate-800/60 rounded" />
        <div className="h-3 w-8 bg-slate-800/60 rounded" />
        <div className="h-3 w-8 bg-slate-800/60 rounded" />
        <div className="h-3 w-8 bg-slate-800/60 rounded" />
      </div>
    </div>
  );
};
