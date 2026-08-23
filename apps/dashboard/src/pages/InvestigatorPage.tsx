import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Brain,
  Search,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Check,
  Copy,
} from 'lucide-react';
import { RootCauseAnalysisResult } from '@scheduler/types';

export const InvestigatorPage: React.FC = () => {
  const { activeProject } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analysisResult, setAnalysisResult] = useState<RootCauseAnalysisResult | null>(null);
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  // Fetch failed & DLQ jobs
  const { data: dlqResponse, isLoading: loadingDlq } = useQuery({
    queryKey: ['dlq-candidates-investigator', activeProject?.id],
    queryFn: () => (activeProject ? api.dlq.list({ projectId: activeProject.id, limit: 20 }) : { data: [], meta: {} }),
    enabled: Boolean(activeProject?.id),
  });

  const { data: failedJobsResponse } = useQuery({
    queryKey: ['failed-jobs-candidates-investigator', activeProject?.id],
    queryFn: () => (activeProject ? api.jobs.list({ projectId: activeProject.id, status: 'FAILED', limit: 20 }) : { data: [], meta: {} }),
    enabled: Boolean(activeProject?.id),
  });

  const candidateJobs = [
    ...(dlqResponse?.data || []),
    ...(failedJobsResponse?.data || []),
  ];

  // Analysis Mutation
  const analyzeMutation = useMutation({
    mutationFn: (jobId: string) => api.investigator.analyze(jobId),
    onSuccess: (data: RootCauseAnalysisResult) => {
      setAnalysisResult(data);
    },
  });

  const handleSelectAndAnalyze = (jobId: string) => {
    setSelectedJobId(jobId);
    analyzeMutation.mutate(jobId);
  };

  const handleCopySnippet = (snippet: string, idx: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetIndex(idx);
    setTimeout(() => setCopiedSnippetIndex(null), 1500);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-brand-500/10 text-brand-300 border-brand-500/30';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Failure Investigator &amp; Diagnostics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyze execution failures and identify probable root causes with automated heuristics.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Read-Only Diagnostic Mode</span>
        </div>
      </div>

      {/* Main Grid: Incident Selector (Left) & Technical Analysis Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Incident Picker */}
        <div className="infra-card p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Failed Incidents ({candidateJobs.length})
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">PostgreSQL</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {loadingDlq ? (
              <div className="text-xs text-slate-400 text-center py-8 font-mono animate-pulse">
                Querying failure records...
              </div>
            ) : candidateJobs.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8 font-sans">
                No failed jobs detected. Cluster is operating nominal.
              </div>
            ) : (
              candidateJobs.map((job: any) => {
                const isSelected = selectedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => handleSelectAndAnalyze(job.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 text-slate-900 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate font-sans text-slate-900">{job.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                        {job.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1 font-mono">
                      {job.error || 'Execution failed'}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans mt-2 pt-1 border-t border-slate-100">
                      <span>Attempt: {job.attempt}/{job.maxAttempts}</span>
                      <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Technical Diagnostic Report */}
        <div className="lg:col-span-2 space-y-4">
          {analyzeMutation.isPending ? (
            <div className="infra-card p-12 text-center space-y-3">
              <Sparkles className="w-6 h-6 text-blue-600 mx-auto animate-spin" />
              <h3 className="text-sm font-bold text-slate-900">
                Analyzing Execution Traces...
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Classifying failure patterns and estimating cascade blast radius...
              </p>
            </div>
          ) : analyzeMutation.isError ? (
            <div className="infra-card p-10 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
              <h3 className="text-sm font-bold text-amber-800">
                Analysis Unavailable
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                The AI failure investigator could not complete analysis. The backend heuristic engine
                may be unavailable or the job has insufficient execution data.
              </p>
              <button
                onClick={() => selectedJobId && analyzeMutation.mutate(selectedJobId)}
                className="infra-btn-secondary mx-auto"
              >
                Retry Analysis
              </button>
            </div>
          ) : !analysisResult ? (
            <div className="infra-card p-12 text-center space-y-2">
              <Brain className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">
                No Incident Selected
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-sans">
                Select an execution incident from the left panel to generate an engineering root-cause report.
              </p>
            </div>
          ) : (
            <div className="infra-card p-5 space-y-5 animate-in fade-in duration-150">
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 font-sans">{analysisResult.jobName}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${getSeverityBadge(analysisResult.severity)}`}>
                      {analysisResult.severity} CONFIDENCE
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 mt-1">
                    Classification: <span className="text-blue-600 font-bold">{analysisResult.category}</span>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 text-left sm:text-right font-sans">
                  <div>Engine: <span className="font-semibold text-slate-700">{analysisResult.model}</span></div>
                  <div>Analyzed: {new Date(analysisResult.analyzedAt).toLocaleTimeString()}</div>
                </div>
              </div>

              {/* Technical Evidence & Root Cause */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> ROOT CAUSE
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-mono">
                    {analysisResult.rootCause}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> BLAST RADIUS & RISK
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-mono">
                    {analysisResult.blastRadius}
                  </p>
                </div>
              </div>

              {/* Recurring Pattern Warning */}
              {analysisResult.recurringPatternDetected && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 font-sans font-medium">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Pattern Note:</strong> Recurred across {analysisResult.patternCount} retry attempts. Systematic issue rather than transient blip.
                  </span>
                </div>
              )}

              {/* Recommendations */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Recommended Remediations ({analysisResult.recommendations.length})
                </div>

                <div className="space-y-3">
                  {analysisResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-sans">{rec.title}</span>
                        <span className="text-[11px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Impact: {rec.impact}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{rec.action}</p>
                      {rec.configSnippet && (
                        <div className="relative group mt-2">
                          <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
                            {rec.configSnippet}
                          </pre>
                          <button
                            onClick={() => handleCopySnippet(rec.configSnippet!, idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                            title="Copy config snippet"
                          >
                            {copiedSnippetIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
