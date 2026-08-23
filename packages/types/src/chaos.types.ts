export type ChaosEventType =
  | 'LEASE_EXPIRED_SIMULATED'
  | 'WORKER_KILLED_SIMULATED'
  | 'JOB_FAILED_SIMULATED'
  | 'SWEEPER_TRIGGERED'
  | 'JOB_RECOVERED';

export interface ChaosEventRecord {
  id: string;
  type: ChaosEventType;
  description: string;
  targetId: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ExpireLeaseParams {
  jobId: string;
}

export interface KillWorkerParams {
  workerId: string;
}

export interface ForceFailJobParams {
  jobId: string;
  reason?: string;
}
