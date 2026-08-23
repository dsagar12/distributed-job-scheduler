import { JobStatus, JobPriority, RetryStrategy, ExecutionStatus, BatchStatus } from './enums';

export interface IJobPayload {
  [key: string]: any;
}

export interface IJobResult {
  [key: string]: any;
}

export interface IRetryPolicyConfig {
  id?: string;
  name: string;
  strategy: RetryStrategy;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

export interface IJobDefinition {
  id: string;
  queueId: string;
  name: string;
  status: JobStatus;
  priority: JobPriority | number;
  payload: IJobPayload;
  result?: IJobResult | null;
  error?: string | null;
  timeoutMs: number;
  runAt: Date;
  attempt: number;
  maxAttempts: number;
  retryPolicyId?: string | null;
  assignedWorkerId?: string | null;
  leaseToken?: string | null;
  claimedAt?: Date | null;
  leaseUntil?: Date | null;
  idempotencyKey?: string | null;
  batchId?: string | null;
  scheduledJobId?: string | null;
  parentJobId?: string | null;
  reprocessCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface IJobExecutionRecord {
  id: string;
  jobId: string;
  workerId: string;
  leaseToken: string;
  attempt: number;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  durationMs?: number | null;
  error?: string | null;
  stackTrace?: string | null;
  result?: IJobResult | null;
  heartbeatAt?: Date | null;
  metadata?: Record<string, any> | null;
}

export interface IJobLogEntry {
  id: string;
  jobId: string;
  executionId?: string | null;
  workerId?: string | null;
  level: string;
  message: string;
  context?: Record<string, any> | null;
  timestamp: Date;
}

export interface IDeadLetterJobRecord {
  id: string;
  jobId: string;
  queueId: string;
  originalPayload: IJobPayload;
  failedReason: string;
  lastError?: string | null;
  lastStackTrace?: string | null;
  totalAttempts: number;
  archivedAt: Date;
  reprocessedAt?: Date | null;
  reprocessedJobId?: string | null;
}

export interface IBatchDefinition {
  id: string;
  projectId: string;
  name: string;
  status: BatchStatus;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}
