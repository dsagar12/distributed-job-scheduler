export interface IQueueDefinition {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  isPaused: boolean;
  priority: number; // Queue default priority multiplier
  concurrencyLimit?: number | null; // Max concurrent jobs across fleet for this queue
  rateLimitPerSecond?: number | null;
  defaultTimeoutMs: number;
  retryPolicyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQueueMetrics {
  queueId: string;
  queueName: string;
  isPaused: boolean;
  scheduledCount: number;
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  deadLetterCount: number;
  delayedCount: number;
  throughputPerMinute: number;
  avgDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
}
