import { JobStatus } from './enums';
import { IJobResult } from './job.types';

export enum EventTopic {
  JOB_CREATED = 'job:created',
  JOB_CLAIMED = 'job:claimed',
  JOB_STARTED = 'job:started',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  JOB_RETRIED = 'job:retried',
  JOB_DEAD_LETTER = 'job:dead_letter',
  JOB_CANCELLED = 'job:cancelled',
  QUEUE_PAUSED = 'queue:paused',
  QUEUE_RESUMED = 'queue:resumed',
  WORKER_HEARTBEAT = 'worker:heartbeat',
  WORKER_STATE_CHANGED = 'worker:state_changed',
}

export interface IJobLifecycleEvent {
  topic: EventTopic;
  jobId: string;
  queueId: string;
  projectId: string;
  status: JobStatus;
  workerId?: string;
  attempt?: number;
  error?: string;
  result?: IJobResult;
  timestamp: string;
}
