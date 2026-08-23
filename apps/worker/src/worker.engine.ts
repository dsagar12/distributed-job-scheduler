import { Job, WorkerStatus } from '@prisma/client';
import {
  JobRepository,
  WorkerRepository,
  getPrismaClient,
} from '@scheduler/database';
import { calculateNextRetryDelay, createLogger } from '@scheduler/shared';
import { JobHandlerRegistry, JobExecutionContext } from './handlers/handler.registry';
import { registerBuiltInHandlers } from './handlers/built-in.handlers';
import * as os from 'os';
import Redis from 'ioredis';

export interface WorkerEngineConfig {
  workerId: string;
  concurrency?: number;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  leaseDurationMs?: number;
  shutdownTimeoutMs?: number;
  queueIds?: string[];
  redisUrl?: string;
}

interface ActiveJobTask {
  job: Job;
  executionId: string;
  leaseToken: string;
  startedAt: number;
  abortController: AbortController;
  timeoutTimer: NodeJS.Timeout;
}

export class WorkerEngine {
  private readonly logger;
  private readonly prisma = getPrismaClient();
  private readonly jobRepo: JobRepository;
  private readonly workerRepo: WorkerRepository;
  private readonly handlerRegistry: JobHandlerRegistry;

  private readonly workerId: string;
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly leaseDurationMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly targetQueueIds?: string[];

  private isRunning = false;
  private isDraining = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private activeJobs: Map<string, ActiveJobTask> = new Map();
  private redisPublisher: Redis | null = null;

  constructor(config: WorkerEngineConfig) {
    this.workerId = config.workerId || `worker-${process.pid}-${os.hostname()}`;
    this.concurrency = config.concurrency && config.concurrency > 0 ? config.concurrency : 5;
    this.pollIntervalMs = config.pollIntervalMs || 500;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 3000;
    this.leaseDurationMs = config.leaseDurationMs || 15000;
    this.shutdownTimeoutMs = config.shutdownTimeoutMs || 10000;
    this.targetQueueIds = config.queueIds;

    this.logger = createLogger(`WorkerNode:${this.workerId}`);
    this.jobRepo = new JobRepository(this.prisma);
    this.workerRepo = new WorkerRepository(this.prisma);

    this.handlerRegistry = new JobHandlerRegistry();
    registerBuiltInHandlers(this.handlerRegistry);

    // Optional Redis connection for heartbeat broadcasting
    const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisPublisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 2 ? null : 1000),
      });
      this.redisPublisher.on('error', (err) => {
        this.logger.debug(`Worker Redis notice: ${err.message}`);
      });
    } catch {
      this.redisPublisher = null;
    }
  }

  /**
   * Registers worker in PostgreSQL, starts heartbeat and polling loops.
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.isDraining = false;

    this.logger.info(`Starting Worker Engine [Concurrency: ${this.concurrency}]...`);

    // 1. Register worker node
    await this.workerRepo.registerWorker({
      id: this.workerId,
      hostname: os.hostname(),
      pid: process.pid,
      concurrency: this.concurrency,
      ipAddress: this.getIpAddress(),
      version: '1.0.0',
      queueIds: this.targetQueueIds,
      metadata: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      },
    });

    this.logger.info(`Worker node successfully registered in database.`);

    // 2. Start heartbeat telemetry timer
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch((err) => {
        this.logger.error('Error during worker heartbeat renewal', undefined, err);
      });
    }, this.heartbeatIntervalMs);

    // Initial heartbeat
    await this.sendHeartbeat();

    // 3. Start queue polling loop
    this.scheduleNextPoll(100);

    // 4. Setup graceful signal handlers
    this.setupSignalHandlers();
  }

  /**
   * Main polling cycle: claims runnable jobs from active queues atomically.
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || this.isDraining) {
      return;
    }

    const availableSlots = this.concurrency - this.activeJobs.size;
    if (availableSlots <= 0) {
      // Worker is fully saturated; poll again shortly
      this.scheduleNextPoll(this.pollIntervalMs);
      return;
    }

    try {
      // Find eligible queues
      let queueList = [];
      if (this.targetQueueIds && this.targetQueueIds.length > 0) {
        queueList = await this.prisma.queue.findMany({
          where: { id: { in: this.targetQueueIds }, isPaused: false },
        });
      } else {
        queueList = await this.prisma.queue.findMany({
          where: { isPaused: false },
          orderBy: { priority: 'desc' },
        });
      }

      let claimedCount = 0;
      let slotsRemaining = availableSlots;

      for (const queue of queueList) {
        if (slotsRemaining <= 0) break;

        const claimed = await this.jobRepo.claimRunnableJobs({
          queueId: queue.id,
          workerId: this.workerId,
          limit: slotsRemaining,
          leaseDurationMs: this.leaseDurationMs,
          concurrencyLimit: queue.concurrencyLimit,
        });

        if (claimed.length > 0) {
          claimedCount += claimed.length;
          slotsRemaining -= claimed.length;

          for (const job of claimed) {
            // Concurrently process job without blocking poll loop
            this.processJob(job).catch((err) => {
              this.logger.error(`Unhandled error processing job ${job.id}`, undefined, err);
            });
          }
        }
      }

      // If no jobs claimed, wait full poll interval; if jobs were found, poll again sooner
      const nextDelay = claimedCount > 0 ? 50 : this.pollIntervalMs;
      this.scheduleNextPoll(nextDelay);
    } catch (err: any) {
      this.logger.error(`Error during queue polling`, undefined, err);
      this.scheduleNextPoll(this.pollIntervalMs * 2);
    }
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.isRunning || this.isDraining) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => this.poll(), delayMs);
  }

  /**
   * Executes a claimed job within the lease-fenced sandbox with timeout protection.
   */
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();
    const abortController = new AbortController();

    if (!job.leaseToken) {
      this.logger.error(`Job ${job.id} claimed without a lease token. Aborting.`);
      return;
    }

    const leaseToken = job.leaseToken;

    // 1. Transition state from CLAIMED to RUNNING and create JobExecution row
    const startResult = await this.jobRepo.startJobExecution({
      jobId: job.id,
      workerId: this.workerId,
      leaseToken,
      attempt: job.attempt,
      metadata: { hostname: os.hostname(), pid: process.pid },
    });

    if (!startResult) {
      this.logger.warn(`Fencing violation or lost lease on startup for job ${job.id}. Aborting execution.`);
      return;
    }

    const { execution } = startResult;

    // 2. Setup timeout deadline timer
    const timeoutMs = job.timeoutMs || 30000;
    let hasTimedOut = false;

    const timeoutTimer = setTimeout(() => {
      hasTimedOut = true;
      abortController.abort();
      this.logger.warn(`Job ${job.id} exceeded timeout deadline of ${timeoutMs}ms. Aborting.`);
    }, timeoutMs);

    // Track active job
    const task: ActiveJobTask = {
      job,
      executionId: execution.id,
      leaseToken,
      startedAt: startTime,
      abortController,
      timeoutTimer,
    };
    this.activeJobs.set(job.id, task);

    // Context helper for logs
    const logHelper = async (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) => {
      try {
        await this.jobRepo.appendLog({
          jobId: job.id,
          executionId: execution.id,
          workerId: this.workerId,
          level: level as any,
          message,
          context,
        });
      } catch (err: any) {
        this.logger.debug(`Failed to persist log: ${err.message}`);
      }
    };

    const ctx: JobExecutionContext = {
      job,
      executionId: execution.id,
      workerId: this.workerId,
      attempt: job.attempt,
      log: logHelper,
      signal: abortController.signal,
    };

    try {
      await logHelper('INFO', `Worker [${this.workerId}] started execution attempt ${job.attempt}`);

      // Find appropriate handler
      const handlerName = (job.payload as any)?.handler || job.name.toLowerCase();
      let handler = this.handlerRegistry.getHandler(handlerName);

      if (!handler) {
        // Fallback: match by prefix (e.g. "Send Welcome Email" -> "send-email")
        if (job.name.toLowerCase().includes('email')) {
          handler = this.handlerRegistry.getHandler('send-email');
        } else if (job.name.toLowerCase().includes('webhook')) {
          handler = this.handlerRegistry.getHandler('send-webhook');
        } else if (job.name.toLowerCase().includes('ingest') || job.name.toLowerCase().includes('data')) {
          handler = this.handlerRegistry.getHandler('data-ingest');
        } else if (job.name.toLowerCase().includes('backup')) {
          handler = this.handlerRegistry.getHandler('backup-chunk');
        } else if (job.name.toLowerCase().includes('failure') || job.name.toLowerCase().includes('fail')) {
          handler = this.handlerRegistry.getHandler('simulate-failure');
        } else if (job.name.toLowerCase().includes('timeout')) {
          handler = this.handlerRegistry.getHandler('simulate-timeout');
        } else {
          handler = this.handlerRegistry.getHandler('default');
        }
      }

      if (!handler) {
        handler = this.handlerRegistry.getHandler('default')!;
      }

      const result = await handler(job.payload as Record<string, any>, ctx);
      const durationMs = Date.now() - startTime;

      clearTimeout(timeoutTimer);

      // Complete job with lease fencing validation
      const completedJob = await this.jobRepo.completeJob({
        jobId: job.id,
        executionId: execution.id,
        workerId: this.workerId,
        leaseToken,
        result: result ?? { success: true },
        durationMs,
      });

      if (!completedJob) {
        this.logger.warn(`Fencing violation: unable to complete job ${job.id}. Lease was reclaimed.`);
        await logHelper('WARN', 'Fencing token validation failed on completion. Lease was taken by another worker.');
      } else {
        await logHelper('INFO', `Job execution completed successfully in ${durationMs}ms`);
        this.publishEvent('job:completed', { jobId: job.id, queueId: job.queueId, durationMs });
      }
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      const durationMs = Date.now() - startTime;
      const errorMsg = hasTimedOut ? `Job execution timed out after ${timeoutMs}ms` : err.message || 'Execution error';
      const stackTrace = err.stack;

      this.logger.warn(`Job ${job.id} failed on attempt ${job.attempt}: ${errorMsg}`);
      await logHelper('ERROR', `Attempt ${job.attempt} failed: ${errorMsg}`, { stackTrace });

      // Calculate retry policy
      const isExhausted = job.attempt >= job.maxAttempts;
      let nextRunAt: Date | null = null;

      if (!isExhausted) {
        // Fetch retry policy if assigned
        let strategy: any = 'EXPONENTIAL';
        let initialDelayMs = 1000;
        let maxDelayMs = 60000;
        let backoffMultiplier = 2.0;
        let jitter = true;

        if (job.retryPolicyId) {
          const policy = await this.prisma.retryPolicy.findUnique({ where: { id: job.retryPolicyId } });
          if (policy) {
            strategy = policy.strategy;
            initialDelayMs = policy.initialDelayMs;
            maxDelayMs = policy.maxDelayMs;
            backoffMultiplier = policy.backoffMultiplier;
            jitter = policy.jitter;
          }
        }

        const delayMs = calculateNextRetryDelay({
          strategy,
          attempt: job.attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
          jitter,
        });

        nextRunAt = new Date(Date.now() + delayMs);
        await logHelper('INFO', `Rescheduled for retry attempt ${job.attempt + 1} at ${nextRunAt.toISOString()} (delay: ${delayMs}ms)`);
      } else {
        await logHelper('ERROR', `Maximum retry attempts (${job.maxAttempts}) exhausted. Moving to Dead Letter Queue.`);
      }

      await this.jobRepo.failJob({
        jobId: job.id,
        executionId: execution.id,
        workerId: this.workerId,
        leaseToken,
        error: errorMsg,
        stackTrace,
        nextRunAt,
        isDeadLetter: isExhausted,
        failedReason: errorMsg,
        durationMs,
      });

      if (isExhausted) {
        this.publishEvent('job:dead_letter', { jobId: job.id, queueId: job.queueId, error: errorMsg });
      } else {
        this.publishEvent('job:failed', { jobId: job.id, queueId: job.queueId, attempt: job.attempt, nextRunAt });
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Renews leases for all running tasks and sends telemetry sample to database.
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.isRunning) return;

    const activeJobIds = Array.from(this.activeJobs.keys());

    // 1. Extend lease for each active job
    for (const [jobId, task] of this.activeJobs.entries()) {
      try {
        const renewed = await this.jobRepo.renewLease(
          jobId,
          this.workerId,
          task.leaseToken,
          this.leaseDurationMs,
        );
        if (!renewed) {
          this.logger.warn(`Failed to renew lease for job ${jobId}. Fencing check failed.`);
        }
      } catch (err: any) {
        this.logger.debug(`Error renewing lease for ${jobId}: ${err.message}`);
      }
    }

    // 2. Record telemetry sample
    const memUsage = process.memoryUsage();
    const memoryUsageMb = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const cpuLoad = os.loadavg()[0] || 0;

    try {
      await this.workerRepo.recordHeartbeat({
        workerId: this.workerId,
        activeJobsCount: this.activeJobs.size,
        concurrency: this.concurrency,
        memoryUsageMb,
        cpuPercent: Math.min(100, Math.round(cpuLoad * 10)),
        activeJobIds,
      });
    } catch (err: any) {
      this.logger.debug(`Heartbeat write error: ${err.message}`);
    }

    // 3. Fast Redis cache update if available
    if (this.redisPublisher && this.redisPublisher.status === 'ready') {
      try {
        await this.redisPublisher.set(
          `scheduler:worker:heartbeat:${this.workerId}`,
          JSON.stringify({
            workerId: this.workerId,
            status: this.isDraining ? 'DRAINING' : 'ACTIVE',
            activeJobs: this.activeJobs.size,
            concurrency: this.concurrency,
            memoryUsageMb,
            timestamp: Date.now(),
          }),
          'EX',
          10,
        );
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Graceful shutdown: stops polling, sets status to DRAINING, drains active tasks, and stops cleanly.
   */
  async shutdown(): Promise<void> {
    if (this.isDraining || !this.isRunning) return;

    this.isDraining = true;
    this.logger.info(`Received shutdown signal. Transitioning status to DRAINING...`);

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    await this.workerRepo.updateStatus(this.workerId, WorkerStatus.DRAINING);

    const activeCount = this.activeJobs.size;
    if (activeCount > 0) {
      this.logger.info(`Waiting for ${activeCount} active job(s) to finish (Grace period: ${this.shutdownTimeoutMs}ms)...`);

      const shutdownDeadline = Date.now() + this.shutdownTimeoutMs;
      while (this.activeJobs.size > 0 && Date.now() < shutdownDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (this.activeJobs.size > 0) {
        this.logger.warn(`Grace period expired with ${this.activeJobs.size} job(s) still in-flight. Releasing leases to QUEUED...`);
        for (const [jobId, task] of this.activeJobs.entries()) {
          try {
            task.abortController.abort();
            clearTimeout(task.timeoutTimer);
            // Release lease back to QUEUED
            await this.prisma.job.updateMany({
              where: { id: jobId, assignedWorkerId: this.workerId, leaseToken: task.leaseToken },
              data: {
                status: 'QUEUED',
                assignedWorkerId: null,
                leaseToken: null,
                leaseUntil: null,
                claimedAt: null,
              },
            });
          } catch (err: any) {
            this.logger.error(`Error releasing job ${jobId}`, undefined, err);
          }
        }
      }
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await this.workerRepo.updateStatus(this.workerId, WorkerStatus.STOPPED);
    this.isRunning = false;

    if (this.redisPublisher) {
      await this.redisPublisher.quit().catch(() => {});
    }

    this.logger.info(`Worker node stopped cleanly.`);
  }

  private setupSignalHandlers(): void {
    const handleSignal = async (signal: string) => {
      this.logger.info(`Caught signal ${signal}`);
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

  private getIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const net = interfaces[name];
      if (net) {
        for (const item of net) {
          if (item.family === 'IPv4' && !item.internal) {
            return item.address;
          }
        }
      }
    }
    return '127.0.0.1';
  }

  getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  getWorkerId(): string {
    return this.workerId;
  }
}
