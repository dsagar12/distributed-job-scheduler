import { JobPriority, JobStatus } from './enums';
import { IJobPayload } from './job.types';

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ICreateJobDto {
  queueId: string;
  name: string;
  payload: IJobPayload;
  priority?: JobPriority | number;
  delayMs?: number;
  runAt?: Date | string;
  timeoutMs?: number;
  maxAttempts?: number;
  retryPolicyId?: string;
  idempotencyKey?: string;
  parentJobId?: string;
}

export interface ICreateBatchDto {
  name: string;
  jobs: ICreateJobDto[];
}

export interface ICreateScheduledJobDto {
  queueId: string;
  name: string;
  cronExpression?: string;
  timezone?: string;
  payload: IJobPayload;
  startDate?: Date | string;
  endDate?: Date | string;
  maxRuns?: number;
}

export interface IJobFilterQuery {
  queueId?: string;
  status?: JobStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
