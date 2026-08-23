import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LiveStreamIndicator } from '../common/LiveStreamIndicator';
import {
  FolderKanban,
  Database,
  Plus,
  LogOut,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileSidebar?: () => void;
  onOpenCreateJob: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  onOpenCreateJob,
}) => {
  const { user, activeOrg, activeProject, setActiveProject, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const wsState = useWebSocket(activeProject?.id);

  const projects = activeOrg?.projects || [];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between select-none shrink-0">
      {/* Left: Mobile hamburger & Project Selector */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Project Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 shadow-xs">
          <FolderKanban className="w-4 h-4 text-blue-600 shrink-0" />
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const found = projects.find((p: any) => p.id === e.target.value);
              if (found) setActiveProject(found);
            }}
            className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
            aria-label="Active project"
          >
            {projects.length === 0 ? (
              <option value="">Default Project</option>
            ) : (
              projects.map((proj: any) => (
                <option key={proj.id} value={proj.id} className="bg-white text-slate-900">
                  {proj.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600 font-semibold">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>POSTGRESQL 16</span>
        </div>
      </div>

      {/* Right: Live indicator, New Job CTA, User Profile */}
      <div className="flex items-center gap-3">
        {/* Animated SVG Live Stream Status Indicator */}
        <LiveStreamIndicator
          status={wsState === 'connected' ? 'connected' : 'syncing'}
          label={wsState === 'connected' ? 'LIVE' : 'SYNCING'}
        />

        <button
          onClick={onOpenCreateJob}
          className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Job</span>
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shadow-xs">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
          </button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="font-bold text-slate-900 truncate font-sans">
                    {user?.fullName || 'Cluster Administrator'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-mono">
                    {user?.email || 'admin@scheduler.io'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
