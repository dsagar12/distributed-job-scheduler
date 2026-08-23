import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  description = 'An error occurred while fetching from the API.',
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
        <span className="font-semibold">{title}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto text-xs font-bold text-rose-700 hover:underline px-2 py-0.5"
            aria-label="Retry"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3">
      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 font-sans">{title}</p>
        <p className="text-xs text-slate-600 mt-1 max-w-sm font-normal">{description}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          aria-label="Retry request"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
