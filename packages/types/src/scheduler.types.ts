import { ScheduledJobStatus } from './enums';
import { IJobPayload } from './job.types';

export interface IScheduledJobDefinition {
  id: string;
  projectId: string;
  queueId: string;
  name: string;
  cronExpression?: string | null; // e.g. "*/5 * * * *"
  timezone: string; // e.g. "UTC", "America/New_York"
  payload: IJobPayload;
  status: ScheduledJobStatus;
  nextRunAt: Date;
  lastRunAt?: Date | null;
  totalRuns: number;
  maxRuns?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
