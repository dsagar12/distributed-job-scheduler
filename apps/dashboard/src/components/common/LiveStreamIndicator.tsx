import React from 'react';

interface LiveStreamIndicatorProps {
  status?: 'connected' | 'syncing' | 'disconnected';
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LiveStreamIndicator: React.FC<LiveStreamIndicatorProps> = ({
  status = 'connected',
  label,
  className = '',
  size = 'md',
}) => {
  const isConnected = status === 'connected';
  const displayLabel = label || (isConnected ? 'LIVE' : 'SYNCING');

  const sizeClasses =
    size === 'sm'
      ? 'h-7 px-3 text-[11px] gap-1.5 rounded-md'
      : size === 'lg'
      ? 'h-9 px-4 text-xs gap-2 rounded-lg'
      : 'h-8 px-3.5 text-xs gap-1.5 rounded-lg';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none font-bold text-white shadow-xs transition-all duration-200 ${
        isConnected
          ? 'bg-[#FF1E27] hover:bg-[#E0151E]'
          : 'bg-amber-600 hover:bg-amber-500'
      } ${sizeClasses} ${className}`}
      title={isConnected ? 'Real-time Live Stream Active' : 'Connecting to Live Stream...'}
      style={{
        boxShadow: isConnected
          ? '0 2px 6px rgba(255, 30, 39, 0.35)'
          : '0 2px 6px rgba(217, 119, 6, 0.35)',
      }}
    >
      {/* Exact Broadcast Signal Waves SVG matching w-4 h-4 */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-none stroke-white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Center Solid Circle Dot */}
          <circle cx="12" cy="12" r="2.5" fill="white" className="stroke-none" />

          {/* Inner Left Arc */}
          <path
            d="M8 8a6 6 0 0 0 0 8"
            className={isConnected ? 'animate-pulse' : 'opacity-60'}
            style={{ animationDuration: '1.2s' }}
          />

          {/* Outer Left Arc */}
          <path
            d="M4 4a11.5 11.5 0 0 0 0 16"
            className={isConnected ? 'animate-pulse' : 'opacity-40'}
            style={{ animationDuration: '1.8s', animationDelay: '0.2s' }}
          />

          {/* Inner Right Arc */}
          <path
            d="M16 8a6 6 0 0 1 0 8"
            className={isConnected ? 'animate-pulse' : 'opacity-60'}
            style={{ animationDuration: '1.2s' }}
          />

          {/* Outer Right Arc */}
          <path
            d="M20 4a11.5 11.5 0 0 1 0 16"
            className={isConnected ? 'animate-pulse' : 'opacity-40'}
            style={{ animationDuration: '1.8s', animationDelay: '0.2s' }}
          />
        </svg>

        {/* Pulsing Dot Halo */}
        {isConnected && (
          <span className="absolute w-2 h-2 rounded-full bg-white opacity-40 animate-ping" />
        )}
      </div>

      {/* Bold LIVE Text matching text-xs font-bold */}
      <span className="font-extrabold tracking-wider font-sans uppercase text-white leading-none text-xs">
        {displayLabel}
      </span>
    </div>
  );
};


