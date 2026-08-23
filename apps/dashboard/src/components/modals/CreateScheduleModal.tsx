import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Calendar } from 'lucide-react';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({ isOpen, onClose }) => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [queueId, setQueueId] = useState('');
  const [cronExpression, setCronExpression] = useState('0 * * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [maxRuns, setMaxRuns] = useState<number | ''>('');
  const [payloadJson, setPayloadJson] = useState('{\n  "reportType": "hourly_summary"\n}');
  const [error, setError] = useState<string | null>(null);

  const { data: queues = [] } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id) && isOpen,
  });

  React.useEffect(() => {
    if (queues.length > 0 && !queueId) {
      setQueueId(queues[0].id);
    }
  }, [queues, queueId]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.schedules.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
      setName('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create schedule');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const projectId = activeProject?.id || '33333333-3333-3333-3333-333333333333';
    const targetQueueId = queueId || (queues.length > 0 ? queues[0].id : '44444444-4444-4444-4444-444444444444');

    if (!name.trim()) {
      setError('Schedule name is required.');
      return;
    }

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch {
      setError('Payload must be valid JSON.');
      return;
    }

    createMutation.mutate({
      projectId,
      queueId: targetQueueId,
      name: name.trim(),
      cronExpression: cronExpression.trim(),
      timezone,
      payload: parsedPayload,
      maxRuns: maxRuns === '' ? undefined : Number(maxRuns),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Create Recurring Schedule</h2>
              <p className="text-xs text-slate-500">Define recurring cron expressions for autonomous job evaluation</p>
            </div>
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
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Schedule Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hourly Sales Digest"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="infra-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Target Queue *</label>
              <select
                required
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="infra-input w-full"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="infra-input w-full font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Cron Expression *</label>
            <input
              type="text"
              required
              placeholder="*/15 * * * *"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="infra-input w-full font-mono text-blue-600 font-semibold"
            />
            <div className="mt-1 flex gap-2 text-[11px] text-slate-500 font-sans">
              <span>Presets:</span>
              <button type="button" onClick={() => setCronExpression('*/5 * * * *')} className="text-blue-600 hover:underline">Every 5m</button>
              <button type="button" onClick={() => setCronExpression('0 * * * *')} className="text-blue-600 hover:underline">Hourly</button>
              <button type="button" onClick={() => setCronExpression('0 0 * * *')} className="text-blue-600 hover:underline">Daily Midnight</button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Max Runs Limit</label>
            <input
              type="number"
              min="1"
              placeholder="Unlimited if blank"
              value={maxRuns}
              onChange={(e) => setMaxRuns(e.target.value === '' ? '' : Number(e.target.value))}
              className="infra-input w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">JSON Payload *</label>
            <textarea
              rows={3}
              required
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="infra-input w-full font-mono text-slate-900 bg-slate-50"
            />
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
              {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
