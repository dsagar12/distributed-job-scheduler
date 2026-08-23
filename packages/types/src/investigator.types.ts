export type FailureCategory =
  | 'TIMEOUT_DEADLINE'
  | 'NETWORK_FAILURE'
  | 'RESOURCE_EXHAUSTION'
  | 'UPSTREAM_5XX'
  | 'RATE_LIMIT_429'
  | 'DATABASE_LOCK_TIMEOUT'
  | 'SERIALIZATION_ERROR'
  | 'UNHANDLED_EXCEPTION';

export interface RootCauseAnalysisResult {
  jobId: string;
  jobName: string;
  category: FailureCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  rootCause: string;
  blastRadius: string;
  recurringPatternDetected: boolean;
  patternCount?: number;
  recommendations: Array<{
    title: string;
    action: string;
    impact: string;
    configSnippet?: string;
  }>;
  analyzedAt: string;
  model: string;
}
