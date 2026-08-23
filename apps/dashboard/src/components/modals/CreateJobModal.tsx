import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultQueueId?: string;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, defaultQueueId }) => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [queueId, setQueueId] = useState(defaultQueueId || '');
  const [priority, setPriority] = useState(50);
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  "recipient": "user@example.com",\n  "template": "welcome_v1"\n}');
  const [error, setError] = useState<string | null>(null);

  const fallbackQueues = [
    { id: '44444444-4444-4444-4444-444444444444', name: 'default', priority: 50 },
    { id: '55555555-5555-5555-5555-555555555555', name: 'critical-alerts', priority: 90 },
    { id: '66666666-6666-6666-6666-666666666666', name: 'email-notifications', priority: 40 },
    { id: '77777777-7777-7777-7777-777777777777', name: 'data-sync', priority: 30 },
  ];

  // Fetch queues for current project
  const { data: fetchedQueues = [] } = useQuery({
    queryKey: ['queues', activeProject?.id],
    queryFn: () => (activeProject ? api.queues.list(activeProject.id) : []),
    enabled: Boolean(activeProject?.id) && isOpen,
  });

  const queues = fetchedQueues && fetchedQueues.length > 0 ? fetchedQueues : fallbackQueues;

  // Set default queue if available and not selected
  React.useEffect(() => {
    if (queues.length > 0 && (!queueId || !queues.some((q) => q.id === queueId))) {
      setQueueId(defaultQueueId || queues[0].id);
    }
  }, [queues, defaultQueueId, queueId]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.jobs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      onClose();
      // Reset form
      setName('');
      setIdempotencyKey('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create job');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetProjectId = activeProject?.id || '33333333-3333-3333-3333-333333333333';
    const targetQueueId = queueId || (queues.length > 0 ? queues[0].id : '44444444-4444-4444-4444-444444444444');

    if (!name.trim()) {
      setError('Job name is required.');
      return;
    }
    if (!targetQueueId) {
      setError('Target queue is required.');
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
      projectId: targetProjectId,
      queueId: targetQueueId,
      name: name.trim(),
      payload: parsedPayload,
      priority,
      timeoutMs,
      maxAttempts,
      delaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
      idempotencyKey: idempotencyKey.trim() || undefined,
    });
  };

  const loadPreset = (type: 'email' | 'data' | 'failure') => {
    if (type === 'email') {
      setName('Send Transactional Email');
      setPriority(80);
      setTimeoutMs(15000);
      setPayloadJson('{\n  "recipient": "customer@acme.com",\n  "template": "invoice_paid",\n  "amount": 299.99\n}');
    } else if (type === 'data') {
      setName('ETL Data Ingestion Pipeline');
      setPriority(30);
      setTimeoutMs(120000);
      setPayloadJson('{\n  "source": "s3://warehouse/daily-logs-2026.parquet",\n  "destination": "snowflake_warehouse",\n  "batchSize": 50000\n}');
    } else if (type === 'failure') {
      setName('Simulated Fragile API Call');
      setPriority(60);
      setMaxAttempts(3);
      setPayloadJson('{\n  "service": "payment-gateway-mock",\n  "simulateFailure": true,\n  "failureType": "HTTP_504_GATEWAY_TIMEOUT"\n}');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Enqueue new job"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">Enqueue New Job</h2>
            <p className="text-xs text-slate-500 mt-0.5">Submit a background task for atomic leased worker execution</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => loadPreset('email')}
            className="text-[11px] font-sans bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md transition-colors font-medium shadow-xs"
          >
            Email Notification
          </button>
          <button
            type="button"
            onClick={() => loadPreset('data')}
            className="text-[11px] font-sans bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md transition-colors font-medium shadow-xs"
          >
            ETL Ingestion
          </button>
          <button
            type="button"
            onClick={() => loadPreset('failure')}
            className="text-[11px] font-sans bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md transition-colors font-medium shadow-xs"
          >
            Retry / DLQ Simulation
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Job Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Send Welcome Email"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="infra-input w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">Target Queue *</label>
              <select
                required
                value={queueId || queues[0]?.id}
                onChange={(e) => setQueueId(e.target.value)}
                className="infra-input w-full font-medium"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} (Priority: {q.priority})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
              <label className="block text-[11px] uppercase font-semibold text-slate-600 mb-1">Timeout (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-slate-600 mb-1">Max Retries</label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-slate-600 mb-1">Delay (sec)</label>
              <input
                type="number"
                min="0"
                placeholder="0 for immediate"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="infra-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">
              Idempotency Key <span className="text-slate-400 font-normal font-sans">(Optional deduplication key)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. order-invoice-98273"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="infra-input w-full font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-600 mb-1">JSON Payload *</label>
            <textarea
              rows={4}
              required
              value={payloadJson}
              onChange={(e) => setPayloadJson(e.target.value)}
              className="infra-input w-full font-mono text-slate-900 bg-slate-50"
            />
          </div>

          {/* Footer Actions */}
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
              {createMutation.isPending ? 'Enqueuing...' : 'Enqueue Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
