import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Key,
  Check,
  Copy,
  RotateCw,
  Server,
  Database,
  ExternalLink,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { activeProject } = useAuth();
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: projectDetails, isLoading } = useQuery({
    queryKey: ['project-settings', activeProject?.id],
    queryFn: () => (activeProject ? api.projects.get(activeProject.id) : null),
    enabled: Boolean(activeProject?.id),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => api.projects.regenerateKey(activeProject!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-settings'] });
    },
  });

  const apiKey = projectDetails?.apiKey || 'sk_proj_9827341908239018239120938';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Project Settings &amp; API Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage project authentication tokens, webhook endpoints, and PostgreSQL cluster settings.
        </p>
      </div>

      {/* 1. API Keys & Authentication */}
      <div className="infra-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Key className="w-4 h-4 text-blue-600" />
            Project API Credentials
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
            Active
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-sans">
          Use this secret key in your client applications to enqueue jobs via the HTTP REST API Gateway. Pass it via the <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">x-api-key</code> or <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-mono">Authorization: Bearer &lt;key&gt;</code> header.
        </p>

        <div className="space-y-2">
          <label className="block text-[11px] uppercase font-semibold text-slate-500 font-sans">API Secret Key</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 flex items-center justify-between">
              <span>{isLoading ? 'Fetching credentials...' : apiKey}</span>
            </div>
            <button
              onClick={handleCopyKey}
              className="infra-btn-secondary py-2"
              title="Copy API Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="infra-btn-secondary py-2 text-amber-700 hover:text-amber-800"
              title="Rotate API Key"
            >
              <RotateCw className={`w-3.5 h-3.5 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              <span>Rotate</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. System Infrastructure & Database */}
      <div className="infra-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Database className="w-4 h-4 text-blue-600" />
            Infrastructure Topologies
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Self-Hosted</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-slate-500 uppercase text-[10px] font-sans font-semibold">Primary Store</div>
            <div className="text-slate-900 font-bold">PostgreSQL 16 (Authoritative)</div>
            <div className="text-[11px] text-emerald-700 font-sans font-semibold">ACID + FOR UPDATE SKIP LOCKED</div>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-slate-500 uppercase text-[10px] font-sans font-semibold">Event Mesh</div>
            <div className="text-slate-900 font-bold">Redis 7 (Ephemeral Pub/Sub)</div>
            <div className="text-[11px] text-blue-700 font-sans font-semibold">WebSocket Dispatch Pipeline</div>
          </div>
        </div>
      </div>

      {/* 3. API Documentation Quick Links */}
      <div className="infra-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Server className="w-4 h-4 text-emerald-600" />
            REST &amp; OpenAPI Endpoints
          </div>
          <a
            href="http://localhost:3000/docs"
            target="_blank"
            rel="noreferrer"
            className="infra-btn-secondary text-xs px-3 py-1 text-blue-600"
          >
            <span>Open Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-1.5 text-xs font-mono text-slate-700">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-emerald-700 font-bold">POST</span>
            <span className="text-slate-900 font-semibold flex-1 px-3">/api/v1/jobs</span>
            <span className="text-slate-500 font-sans">Enqueue discrete task</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-blue-700 font-bold">GET</span>
            <span className="text-slate-900 font-semibold flex-1 px-3">/api/v1/jobs/:id</span>
            <span className="text-slate-500 font-sans">Inspect execution telemetry</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-amber-700 font-bold">POST</span>
            <span className="text-slate-900 font-semibold flex-1 px-3">/api/v1/chaos/expire-lease</span>
            <span className="text-slate-500 font-sans">Fault injection trigger</span>
          </div>
        </div>
      </div>
    </div>
  );
};
