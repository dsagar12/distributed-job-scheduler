import {
  SchedulerRepository,
  JobRepository,
  WorkerRepository,
  getPrismaClient,
} from '@scheduler/database';
import { getNextCronOccurrence, createLogger } from '@scheduler/shared';
import Redis from 'ioredis';

export interface SchedulerEngineConfig {
  pollIntervalMs?: number;
  recoveryIntervalMs?: number;
  deadWorkerThresholdMs?: number;
  retentionDays?: number;
  redisUrl?: string;
}

export class SchedulerEngine {
  private readonly logger = createLogger('SchedulerDaemon');
  private readonly prisma = getPrismaClient();
  private readonly schedulerRepo: SchedulerRepository;
  private readonly jobRepo: JobRepository;
  private readonly workerRepo: WorkerRepository;

  private readonly pollIntervalMs: number;
  private readonly recoveryIntervalMs: number;
  private readonly deadWorkerThresholdMs: number;
  private readonly retentionDays: number;

  private isRunning = false;
  private delayedTimer: NodeJS.Timeout | null = null;
  private cronTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private deadWorkerTimer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;
  private redisPublisher: Redis | null = null;

  constructor(config: SchedulerEngineConfig = {}) {
    this.pollIntervalMs = config.pollIntervalMs || 1000;
    this.recoveryIntervalMs = config.recoveryIntervalMs || 5000;
    this.deadWorkerThresholdMs = config.deadWorkerThresholdMs || 30000;
    this.retentionDays = config.retentionDays || 7;

    this.schedulerRepo = new SchedulerRepository(this.prisma);
    this.jobRepo = new JobRepository(this.prisma);
    this.workerRepo = new WorkerRepository(this.prisma);

    const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 2 ? null : 1000),
      });
      this.redisPublisher.on('error', (err) => {
        this.logger.debug(`Scheduler Redis notice: ${err.message}`);
      });
    } catch {
      this.redisPublisher = null;
    }
  }

  /**
   * Starts all scheduler loops (delayed progression, cron evaluation, crash recovery, dead worker detection).
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info(`Starting Scheduler Daemon (Poll: ${this.pollIntervalMs}ms, Recovery: ${this.recoveryIntervalMs}ms)...`);

    // 1. Delayed Job Progression Loop
    this.scheduleDelayedLoop();

    // 2. Recurring Cron Schedule Loop
    this.scheduleCronLoop();

    // 3. Expired Lease Crash Recovery Sweeper Loop
    this.scheduleRecoveryLoop();

    // 4. Dead Worker Detection Loop
    this.scheduleDeadWorkerLoop();

    // 5. Telemetry Retention Pruning Loop (Hourly)
    this.scheduleRetentionLoop();

    // Setup graceful signals
    this.setupSignalHandlers();
    this.logger.info('Scheduler Daemon active and orchestrating schedule queues.');
  }

  /**
   * Promotes delayed jobs (runAt <= NOW()) from SCHEDULED to QUEUED.
   */
  private async processDelayedJobs(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const advanced = await this.schedulerRepo.advanceScheduledJobs(100);
      if (advanced.length > 0) {
        this.logger.info(`Promoted ${advanced.length} delayed job(s) from SCHEDULED to QUEUED.`);
        for (const job of advanced) {
          this.publishEvent('job:queued', { jobId: job.id, queueId: job.queueId, name: job.name });
        }
      }
    } catch (err: any) {
      this.logger.error('Error promoting delayed jobs', undefined, err);
    }
  }

  private scheduleDelayedLoop(): void {
    if (!this.isRunning) return;
    this.delayedTimer = setTimeout(async () => {
      await this.processDelayedJobs();
      this.scheduleDelayedLoop();
    }, this.pollIntervalMs);
  }

  /**
   * Evaluates active recurring cron definitions and generates discrete Job instances.
   */
  private async processRecurringSchedules(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const dueSchedules = await this.schedulerRepo.claimDueSchedules(20);
      for (const schedule of dueSchedules) {
        try {
          let nextRunAt: Date | null = null;
          if (schedule.cronExpression) {
            nextRunAt = getNextCronOccurrence({
              cronExpression: schedule.cronExpression,
              tz: schedule.timezone || 'UTC',
            });
          }

          const isCompleted = Boolean(schedule.maxRuns && schedule.totalRuns + 1 >= schedule.maxRuns);

          const { job } = await this.schedulerRepo.triggerSchedule(schedule.id, nextRunAt, isCompleted);
          this.logger.info(`Triggered recurring schedule "${schedule.name}" -> created Job [${job.id}]. Next run: ${nextRunAt?.toISOString()}`);
          this.publishEvent('schedule:triggered', { scheduleId: schedule.id, jobId: job.id, nextRunAt });
        } catch (err: any) {
          this.logger.error(`Failed to trigger schedule ${schedule.id}`, undefined, err);
        }
      }
    } catch (err: any) {
      this.logger.error('Error evaluating recurring schedules', undefined, err);
    }
  }

  private scheduleCronLoop(): void {
    if (!this.isRunning) return;
    this.cronTimer = setTimeout(async () => {
      await this.processRecurringSchedules();
      this.scheduleCronLoop();
    }, this.pollIntervalMs);
  }

  /**
   * Sweeps expired leases for dead workers or zombie executions.
   */
  private async sweepExpiredLeases(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const recovered = await this.jobRepo.recoverExpiredLeases(50);
      if (recovered.length > 0) {
        this.logger.warn(`Recovered ${recovered.length} job(s) from expired worker leases.`);
        for (const job of recovered) {
          this.publishEvent('job:recovered', { jobId: job.id, status: job.status, queueId: job.queueId });
        }
      }
    } catch (err: any) {
      this.logger.error('Error recovering expired leases', undefined, err);
    }
  }

  private scheduleRecoveryLoop(): void {
    if (!this.isRunning) return;
    this.recoveryTimer = setTimeout(async () => {
      await this.sweepExpiredLeases();
      this.scheduleRecoveryLoop();
    }, this.recoveryIntervalMs);
  }

  /**
   * Detects worker nodes whose heartbeats have ceased beyond the threshold.
   */
  private async sweepDeadWorkers(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const dead = await this.workerRepo.detectDeadWorkers(this.deadWorkerThresholdMs);
      if (dead.length > 0) {
        this.logger.warn(`Detected ${dead.length} dead worker node(s): ${dead.map((w) => w.id).join(', ')}`);
        for (const w of dead) {
          this.publishEvent('worker:dead', { workerId: w.id, hostname: w.hostname });
        }
      }
    } catch (err: any) {
      this.logger.error('Error checking dead workers', undefined, err);
    }
  }

  private scheduleDeadWorkerLoop(): void {
    if (!this.isRunning) return;
    this.deadWorkerTimer = setTimeout(async () => {
      await this.sweepDeadWorkers();
      this.scheduleDeadWorkerLoop();
    }, this.deadWorkerThresholdMs / 2);
  }

  /**
   * Periodically purges historical heartbeat time-series records older than retention policy.
   */
  private async pruneOldHeartbeats(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const pruned = await this.workerRepo.pruneHistoricalHeartbeats(this.retentionDays);
      if (pruned > 0) {
        this.logger.info(`Pruned ${pruned} historical worker heartbeat record(s) older than ${this.retentionDays} days.`);
      }
    } catch (err: any) {
      this.logger.error('Error pruning historical heartbeats', undefined, err);
    }
  }

  private scheduleRetentionLoop(): void {
    if (!this.isRunning) return;
    this.retentionTimer = setTimeout(async () => {
      await this.pruneOldHeartbeats();
      this.scheduleRetentionLoop();
    }, 3600000); // 1 hour
  }

  /**
   * Graceful shutdown of scheduler daemon.
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Shutting down Scheduler Daemon...');
    this.isRunning = false;

    if (this.delayedTimer) clearTimeout(this.delayedTimer);
    if (this.cronTimer) clearTimeout(this.cronTimer);
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    if (this.deadWorkerTimer) clearTimeout(this.deadWorkerTimer);
    if (this.retentionTimer) clearTimeout(this.retentionTimer);

    if (this.redisPublisher) {
      await this.redisPublisher.quit().catch(() => {});
    }

    this.logger.info('Scheduler Daemon stopped cleanly.');
  }

  private setupSignalHandlers(): void {
    const handleSignal = async (sig: string) => {
      this.logger.info(`Scheduler caught ${sig}`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => handleSignal('SIGINT'));
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
  }

  private publishEvent(channel: string, payload: any): void {
    if (this.redisPublisher && this.redisPublisher.status === 'ready') {
      this.redisPublisher.publish(`scheduler:events:${channel}`, JSON.stringify(payload)).catch(() => {});
    }
  }
}
