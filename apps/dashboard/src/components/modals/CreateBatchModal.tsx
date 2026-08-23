import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Boxes, Plus, Trash2 } from 'lucide-react';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BatchJobRow {
  name: string;
  queueId: string;
  payloadStr: string;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({ isOpen, onClose }) => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [jobs, setJobs] = useState<BatchJobRow[]>([
    { name: 'Batch Task 1', queueId: '', payloadStr: '{"part": 1}' },
    { name: 'Batch Task 2', queueId: '', payloadStr: '{"part": 2}' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const { data: queues = [] } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id) && isOpen,
  });

  React.useEffect(() => {
    if (queues.length > 0) {
      setJobs((prev) =>
        prev.map((j) => ({ ...j, queueId: j.queueId || queues[0].id }))
      );
    }
  }, [queues]);

  const addJobRow = () => {
    setJobs((prev) => [
      ...prev,
      {
        name: `Batch Task ${prev.length + 1}`,
        queueId: queues[0]?.id || '',
        payloadStr: `{"part": ${prev.length + 1}}`,
      },
    ]);
  };

  const removeJobRow = (index: number) => {
    setJobs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateJobRow = (index: number, field: keyof BatchJobRow, value: string) => {
    setJobs((prev) =>
      prev.map((j, i) => (i === index ? { ...j, [field]: value } : j))
    );
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.batches.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
      setName('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create batch');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const projectId = activeProject?.id || '33333333-3333-3333-3333-333333333333';
    if (!name.trim()) {
      setError('Batch name is required.');
      return;
    }
    if (jobs.length === 0) {
      setError('At least one job is required.');
      return;
    }

    const parsedJobs = [];
    for (let i = 0; i < jobs.length; i++) {
      const item = jobs[i];
      if (!item.name.trim()) {
        setError(`Job #${i + 1} name is required.`);
        return;
      }
      if (!item.queueId) {
        setError(`Job #${i + 1} queue is required.`);
        return;
      }
      try {
        const payload = JSON.parse(item.payloadStr);
        parsedJobs.push({
          name: item.name.trim(),
          queueId: item.queueId,
          payload,
          priority: 50,
        });
      } catch {
        setError(`Job #${i + 1} payload has invalid JSON.`);
        return;
      }
    }

    createMutation.mutate({
      projectId,
      name: name.trim(),
      jobs: parsedJobs,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Create Multi-Job Batch</h2>
              <p className="text-xs text-slate-500">Atomic bulk submission with parent-child tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 font-sans text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Batch Workflow Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Nightly User Data Export"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="infra-input w-full"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase text-slate-600">Child Tasks ({jobs.length})</label>
              <button
                type="button"
                onClick={addJobRow}
                className="infra-btn-secondary text-xs px-2.5 py-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {jobs.map((j, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-600 font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      required
                      placeholder="Task Name"
                      value={j.name}
                      onChange={(e) => updateJobRow(idx, 'name', e.target.value)}
                      className="infra-input flex-1 py-1"
                    />
                    <select
                      value={j.queueId}
                      onChange={(e) => updateJobRow(idx, 'queueId', e.target.value)}
                      className="infra-input py-1 w-36"
                    >
                      {queues.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))}
                    </select>
                    {jobs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeJobRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder='JSON Payload, e.g. {"key": "val"}'
                    value={j.payloadStr}
                    onChange={(e) => updateJobRow(idx, 'payloadStr', e.target.value)}
                    className="infra-input w-full py-1 font-mono text-slate-900 bg-white"
                  />
                </div>
              ))}
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
              {createMutation.isPending ? 'Submitting...' : 'Submit Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
