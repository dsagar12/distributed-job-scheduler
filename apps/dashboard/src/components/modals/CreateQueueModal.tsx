import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';

interface CreateQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateQueueModal: React.FC<CreateQueueModalProps> = ({ isOpen, onClose }) => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(50);
  const [concurrencyLimit, setConcurrencyLimit] = useState<number | ''>(10);
  const [rateLimitPerSecond, setRateLimitPerSecond] = useState<number | ''>('');
  const [defaultTimeoutMs, setDefaultTimeoutMs] = useState(30000);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.queues.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      onClose();
      setName('');
      setDescription('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create queue');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const projectId = activeProject?.id || '33333333-3333-3333-3333-333333333333';
    if (!name.trim()) {
      setError('Queue name is required.');
      return;
    }

    createMutation.mutate({
      projectId,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim() || undefined,
      priority,
      concurrencyLimit: concurrencyLimit === '' ? null : Number(concurrencyLimit),
      rateLimitPerSecond: rateLimitPerSecond === '' ? null : Number(rateLimitPerSecond),
      defaultTimeoutMs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">Create New Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configure concurrency bounds and priority weighting</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Queue Identifier *</label>
            <input
              type="text"
              required
              placeholder="e.g. high-priority-exports"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="infra-input w-full font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Description</label>
            <input
              type="text"
              placeholder="Optional summary of workload handled by this queue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="infra-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Concurrency Limit</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if blank"
                value={concurrencyLimit}
                onChange={(e) => setConcurrencyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Rate Limit (Jobs/sec)</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if blank"
                value={rateLimitPerSecond}
                onChange={(e) => setRateLimitPerSecond(e.target.value === '' ? '' : Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase font-semibold text-slate-600 mb-1">Priority ({priority})</label>
              <input
                type="range"
                min="1"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-slate-600 mb-1">Default Timeout (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={defaultTimeoutMs}
                onChange={(e) => setDefaultTimeoutMs(Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="infra-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="infra-btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
