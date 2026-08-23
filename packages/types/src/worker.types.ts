import { WorkerStatus } from './enums';

export interface IWorkerNode {
  id: string; // Unique worker identifier (e.g., hostname-uuid)
  hostname: string;
  pid: number;
  status: WorkerStatus;
  concurrency: number;
  activeJobsCount: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  ipAddress?: string | null;
  version?: string | null;
  startedAt: Date;
  lastHeartbeatAt: Date;
  stoppedAt?: Date | null;
  metadata?: Record<string, any> | null;
}

export interface IWorkerQueueAssignment {
  id: string;
  workerId: string;
  queueId: string;
  weight: number;
  createdAt: Date;
}

export interface IWorkerHeartbeatPayload {
  workerId: string;
  activeJobsCount: number;
  concurrency: number;
  memoryUsageMb: number;
  cpuPercent?: number;
  activeJobIds: string[];
  timestamp: Date;
}

export interface IWorkerLeaseRenewal {
  workerId: string;
  jobId: string;
  newLeaseUntil: Date;
}
