import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  ListOrdered,
  CalendarClock,
  Boxes,
  Server,
  AlertOctagon,
  LineChart,
  FlaskConical,
  Brain,
  Settings,
  Plus,
  FileText,
  CheckCircle2,
  X,
  Cpu,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Queues', to: '/queues', icon: Layers },
  { label: 'Job Registry', to: '/jobs', icon: ListOrdered },
  { label: 'Recurring Schedules', to: '/schedules', icon: CalendarClock },
  { label: 'Batch Workflows', to: '/batches', icon: Boxes },
  { label: 'Worker Fleet', to: '/workers', icon: Server },
  { label: 'Dead Letter Queue', to: '/dlq', icon: AlertOctagon, danger: true },
  { label: 'Metrics & Latency', to: '/metrics', icon: LineChart },
  { label: 'Chaos Laboratory', to: '/chaos', icon: FlaskConical },
  { label: 'Failure Investigator', to: '/investigator', icon: Brain },
  { label: 'Settings & API Keys', to: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCreateJob: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  onOpenCreateJob,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full w-64 flex flex-col bg-white border-r border-slate-200 z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 tracking-tight font-sans">
                  SCHEDULER CONSOLE
                </div>
                <div className="text-[10px] text-slate-500 font-mono">v1.0 (PostgreSQL)</div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary CTA */}
          <button
            id="sidebar-new-job-btn"
            onClick={() => {
              onOpenCreateJob();
              if (onClose) onClose();
            }}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-xs transition-colors"
            aria-label="Enqueue a new job"
          >
            <Plus className="w-4 h-4" />
            <span>Enqueue Job</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-xs'
                      : `text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 ${
                          item.danger ? 'hover:text-rose-600' : ''
                        }`
                  }`
                }
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-200 flex flex-col gap-1 bg-slate-50/50">
          <a
            href="http://localhost:3000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            <span>API Documentation</span>
          </a>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Cluster <span className="text-emerald-700 font-bold font-mono text-[11px]">ONLINE</span>
            </span>
          </div>
        </div>
      </nav>
    </>
  );
};
