/**
 * Standard Job Lifecycle States in PostgreSQL State Machine
 */
export enum JobStatus {
  SCHEDULED = 'SCHEDULED',     // Waiting for designated run_at timestamp
  QUEUED = 'QUEUED',           // Available for workers to claim
  CLAIMED = 'CLAIMED',         // Atomically claimed via FOR UPDATE SKIP LOCKED
  RUNNING = 'RUNNING',         // Currently executing under an active worker lease
  COMPLETED = 'COMPLETED',     // Successfully finished execution
  FAILED = 'FAILED',           // Execution failed, pending retry
  DEAD_LETTER = 'DEAD_LETTER', // Retries exhausted or unrecoverable failure
  CANCELLED = 'CANCELLED',     // Manually cancelled by user/API
  TIMED_OUT = 'TIMED_OUT',     // Exceeded execution deadline
}

/**
 * Job Priority for SKIP LOCKED queue retrieval ordering
 */
export enum JobPriority {
  LOW = 10,
  NORMAL = 50,
  HIGH = 100,
  CRITICAL = 200,
}

/**
 * Retry Backoff Strategy
 */
export enum RetryStrategy {
  FIXED = 'FIXED',             // Fixed delay interval
  LINEAR = 'LINEAR',           // Delay increases linearly (attempt * base)
  EXPONENTIAL = 'EXPONENTIAL', // Delay increases exponentially (base * 2^attempt)
}

/**
 * Worker Node Lifecycle States
 */
export enum WorkerStatus {
  STARTING = 'STARTING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAINING = 'DRAINING',
  STOPPED = 'STOPPED',
  DEAD = 'DEAD',
}

/**
 * Scheduled/Recurring Job Schedule Status
 */
export enum ScheduledJobStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  DISABLED = 'DISABLED',
}

/**
 * Individual Attempt Execution Status
 */
export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  CANCELLED = 'CANCELLED',
}

/**
 * Organization Role-Based Access Control
 */
export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Structured Log Severity Levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

/**
 * Batch Job State
 */
export enum BatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
  CANCELLED = 'CANCELLED',
}
