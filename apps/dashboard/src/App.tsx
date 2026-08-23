import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CreateJobModal } from './components/modals/CreateJobModal';
import { JobDetailModal } from './components/modals/JobDetailModal';
import { OverviewPage } from './pages/OverviewPage';
import { QueuesPage } from './pages/QueuesPage';
import { JobsPage } from './pages/JobsPage';
import { WorkersPage } from './pages/WorkersPage';
import { DlqPage } from './pages/DlqPage';
import { ChaosLabPage } from './pages/ChaosLabPage';
import { InvestigatorPage } from './pages/InvestigatorPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { BatchesPage } from './pages/BatchesPage';
import { MetricsPage } from './pages/MetricsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { useWebSocket } from './hooks/useWebSocket';
import { Cpu, Layers } from 'lucide-react';

const AppShell: React.FC = () => {
  const { activeProject } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Wire real-time WebSocket events → React Query cache invalidation
  useWebSocket(activeProject?.id);

  // Global Escape key: close topmost open modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedJobId) {
          setSelectedJobId(null);
        } else if (isCreateJobOpen) {
          setIsCreateJobOpen(false);
        } else if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
        }
      }
    },
    [selectedJobId, isCreateJobOpen, isMobileSidebarOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans antialiased">
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenCreateJob={() => setIsCreateJobOpen(true)}
      />

      <div className="flex-1 flex flex-col md:ml-64 min-w-0 h-screen overflow-hidden bg-slate-50">
        <Navbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenCreateJob={() => setIsCreateJobOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
          <Routes>
            <Route path="/" element={<OverviewPage onSelectJob={setSelectedJobId} />} />
            <Route path="/queues" element={<QueuesPage />} />
            <Route
              path="/jobs"
              element={
                <JobsPage
                  onSelectJob={setSelectedJobId}
                  onOpenCreateJob={() => setIsCreateJobOpen(true)}
                />
              }
            />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/dlq" element={<DlqPage onSelectJob={setSelectedJobId} />} />
            <Route path="/chaos" element={<ChaosLabPage />} />
            <Route path="/investigator" element={<InvestigatorPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/batches" element={<BatchesPage onSelectJob={setSelectedJobId} />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <CreateJobModal isOpen={isCreateJobOpen} onClose={() => setIsCreateJobOpen(false)} />
      <JobDetailModal jobId={selectedJobId} onClose={() => setSelectedJobId(null)} />
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Initializing Scheduler Console...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};
