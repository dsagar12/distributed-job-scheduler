import { PrismaClient, Job, JobExecution, JobLog, JobStatus, ExecutionStatus, LogLevel } from '@prisma/client';
import { getPrismaClient } from '../client';

export interface ClaimJobsParams {
  queueId: string;
  workerId: string;
  limit: number;
  leaseDurationMs: number;
  concurrencyLimit?: number | null;
}

export interface CreateJobParams {
  projectId: string;
  queueId: string;
  name: string;
  payload: Record<string, any>;
  priority?: number;
  runAt?: Date;
  timeoutMs?: number;
  maxAttempts?: number;
  retryPolicyId?: string | null;
  idempotencyKey?: string | null;
  batchId?: string | null;
  scheduledJobId?: string | null;
  parentJobId?: string | null;
}

export interface StartExecutionParams {
  jobId: string;
  workerId: string;
  leaseToken: string;
  attempt: number;
  metadata?: Record<string, any>;
}

export interface CompleteJobParams {
  jobId: string;
  executionId: string;
  workerId: string;
  leaseToken: string;
  result?: Record<string, any> | null;
  durationMs?: number;
}

export interface FailJobParams {
  jobId: string;
  executionId: string;
  workerId: string;
  leaseToken: string;
  error: string;
  stackTrace?: string;
  nextRunAt?: Date | null;
  isDeadLetter: boolean;
  failedReason?: string;
  durationMs?: number;
}

export interface TimeoutJobParams {
  jobId: string;
  executionId: string;
  workerId: string;
  leaseToken: string;
  error: string;
  nextRunAt?: Date | null;
  isDeadLetter: boolean;
  durationMs?: number;
}

// In-memory offline fallback storage
const memoryJobs: Map<string, Job> = new Map();
const memoryExecutions: Map<string, JobExecution> = new Map();
const memoryLogs: JobLog[] = [];
const memoryDlq: Map<string, any> = new Map();

// Seed initial demo jobs in memory
const DEMO_PROJ_ID = '33333333-3333-3333-3333-333333333333';
const DEMO_QUEUE_ID = '44444444-4444-4444-4444-444444444444';

const initialJobs: Job[] = [
  {
    id: 'job-seed-1',
    projectId: DEMO_PROJ_ID,
    queueId: DEMO_QUEUE_ID,
    name: 'Send Welcome Email',
    payload: { recipient: 'john@example.com', template: 'welcome_v1' },
    result: { sent: true, messageId: 'msg_98723984' },
    status: JobStatus.COMPLETED,
    priority: 80,
    attempt: 1,
    maxAttempts: 3,
    timeoutMs: 30000,
    reprocessCount: 0,
    idempotencyKey: 'email-welcome-john',
    assignedWorkerId: 'worker-node-1',
    leaseToken: null,
    leaseUntil: null,
    runAt: new Date(Date.now() - 3600000),
    claimedAt: new Date(Date.now() - 3590000),
    completedAt: new Date(Date.now() - 3588000),
    error: null,
    batchId: null,
    scheduledJobId: null,
    parentJobId: null,
    retryPolicyId: null,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3588000),
  },
  {
    id: 'job-seed-2',
    projectId: DEMO_PROJ_ID,
    queueId: DEMO_QUEUE_ID,
    name: 'Ingest Analytics Stream',
    payload: { rows: 25000, partition: '2026-08-23' },
    result: null,
    status: JobStatus.QUEUED,
    priority: 50,
    attempt: 0,
    maxAttempts: 3,
    timeoutMs: 30000,
    reprocessCount: 0,
    idempotencyKey: null,
    assignedWorkerId: null,
    leaseToken: null,
    leaseUntil: null,
    runAt: new Date(),
    claimedAt: null,
    completedAt: null,
    error: null,
    batchId: null,
    scheduledJobId: null,
    parentJobId: null,
    retryPolicyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'job-seed-3',
    projectId: DEMO_PROJ_ID,
    queueId: DEMO_QUEUE_ID,
    name: 'Backup Database Chunk',
    payload: { table: 'audit_logs', chunk: 4 },
    result: null,
    status: JobStatus.DEAD_LETTER,
    priority: 30,
    attempt: 3,
    maxAttempts: 3,
    timeoutMs: 30000,
    reprocessCount: 0,
    idempotencyKey: null,
    assignedWorkerId: null,
    leaseToken: null,
    leaseUntil: null,
    runAt: new Date(Date.now() - 7200000),
    claimedAt: null,
    completedAt: null,
    error: 'Exceeded maximum retry attempts (3/3): S3 Gateway Timeout',
    batchId: null,
    scheduledJobId: null,
    parentJobId: null,
    retryPolicyId: null,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7100000),
  },
];

for (const j of initialJobs) {
  memoryJobs.set(j.id, j);
}

// Seed DLQ for job-seed-3
memoryDlq.set('dlq-seed-3', {
  id: 'dlq-seed-3',
  jobId: 'job-seed-3',
  queueId: DEMO_QUEUE_ID,
  projectId: DEMO_PROJ_ID,
  failedReason: 'Exceeded maximum retry attempts (3/3): S3 Gateway Timeout',
  lastError: 'S3 Gateway Timeout 504',
  lastStackTrace: 'Error: S3 Gateway Timeout 504\n    at S3Client.upload (s3.ts:42)\n    at WorkerEngine.execute (worker.ts:188)',
  totalAttempts: 3,
  archivedAt: new Date(Date.now() - 7100000),
  reprocessedAt: null,
  job: memoryJobs.get('job-seed-3'),
});

export class JobRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Atomically claims runnable jobs using SELECT ... FOR UPDATE SKIP LOCKED
   * respecting queue-level concurrency limits.
   */
  async claimRunnableJobs(params: ClaimJobsParams): Promise<Job[]> {
    const { queueId, workerId, limit, leaseDurationMs, concurrencyLimit } = params;
    const maxConcurrency = concurrencyLimit && concurrencyLimit > 0 ? concurrencyLimit : 0;

    try {
      const claimedJobs = await this.prisma.$queryRaw<Job[]>`
        WITH active_count AS (
          SELECT COUNT(*)::int AS active
          FROM jobs
          WHERE queue_id = ${queueId}::uuid
            AND status IN ('CLAIMED', 'RUNNING')
        ),
        slots_available AS (
          SELECT GREATEST(0, ${maxConcurrency}::int - active) AS available
          FROM active_count
        ),
        eligible_jobs AS (
          SELECT j.id
          FROM jobs j, slots_available sa
          WHERE (${maxConcurrency}::int <= 0 OR sa.available > 0)
            AND j.queue_id = ${queueId}::uuid
            AND j.status = 'QUEUED'
            AND j.run_at <= NOW()
          ORDER BY j.priority DESC, j.run_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT CASE
            WHEN ${maxConcurrency}::int <= 0 THEN ${limit}::int
            ELSE LEAST(${limit}::int, (SELECT available FROM slots_available))
          END
        )
        UPDATE jobs j
        SET status = 'CLAIMED',
            assigned_worker_id = ${workerId},
            claimed_at = NOW(),
            lease_until = NOW() + (${leaseDurationMs} || ' milliseconds')::interval,
            lease_token = gen_random_uuid()::text,
            attempt = j.attempt + 1,
            updated_at = NOW()
        FROM eligible_jobs
        WHERE j.id = eligible_jobs.id
        RETURNING j.*;
      `;

      return claimedJobs;
    } catch {
      // In-memory atomic claim fallback
      const claimed: Job[] = [];
      for (const j of memoryJobs.values()) {
        if (j.queueId === queueId && j.status === JobStatus.QUEUED && j.runAt <= new Date()) {
          j.status = JobStatus.CLAIMED;
          j.assignedWorkerId = workerId;
          j.claimedAt = new Date();
          j.leaseUntil = new Date(Date.now() + leaseDurationMs);
          j.leaseToken = `lease-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          j.attempt += 1;
          j.updatedAt = new Date();
          claimed.push(j);
          if (claimed.length >= limit) break;
        }
      }
      return claimed;
    }
  }

  /**
   * Creates a new job with optional idempotency key.
   */
  async createJob(params: CreateJobParams): Promise<{ job: Job; created: boolean }> {
    try {
      if (params.idempotencyKey) {
        const existing = await this.prisma.job.findFirst({
          where: {
            projectId: params.projectId,
            idempotencyKey: params.idempotencyKey,
          },
        });

        if (existing) {
          return { job: existing, created: false };
        }
      }

      const job = await this.prisma.job.create({
        data: {
          projectId: params.projectId,
          queueId: params.queueId,
          name: params.name,
          payload: params.payload,
          priority: params.priority ?? 50,
          runAt: params.runAt ?? new Date(),
          timeoutMs: params.timeoutMs ?? 30000,
          maxAttempts: params.maxAttempts ?? 3,
          retryPolicyId: params.retryPolicyId,
          idempotencyKey: params.idempotencyKey,
          batchId: params.batchId,
          scheduledJobId: params.scheduledJobId,
          parentJobId: params.parentJobId,
          status: params.runAt && params.runAt.getTime() > Date.now() ? JobStatus.SCHEDULED : JobStatus.QUEUED,
        },
      });

      return { job, created: true };
    } catch {
      // In-memory fallback
      if (params.idempotencyKey) {
        for (const existing of memoryJobs.values()) {
          if (existing.projectId === params.projectId && existing.idempotencyKey === params.idempotencyKey) {
            return { job: existing, created: false };
          }
        }
      }

      const newJob: Job = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        projectId: params.projectId,
        queueId: params.queueId,
        name: params.name,
        payload: params.payload,
        result: null,
        status: params.runAt && params.runAt.getTime() > Date.now() ? JobStatus.SCHEDULED : JobStatus.QUEUED,
        priority: params.priority ?? 50,
        attempt: 0,
        maxAttempts: params.maxAttempts ?? 3,
        timeoutMs: params.timeoutMs ?? 30000,
        reprocessCount: 0,
        idempotencyKey: params.idempotencyKey || null,
        assignedWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
        runAt: params.runAt ?? new Date(),
        claimedAt: null,
        completedAt: null,
        error: null,
        batchId: params.batchId || null,
        scheduledJobId: params.scheduledJobId || null,
        parentJobId: params.parentJobId || null,
        retryPolicyId: params.retryPolicyId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryJobs.set(newJob.id, newJob);
      return { job: newJob, created: true };
    }
  }

  async getJobById(id: string): Promise<any> {
    try {
      return await this.prisma.job.findUnique({
        where: { id },
        include: {
          queue: true,
          executions: {
            orderBy: { attempt: 'asc' },
          },
          logs: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });
    } catch {
      const j = memoryJobs.get(id);
      if (!j) return null;
      return {
        ...j,
        queue: { id: j.queueId, name: 'default' },
        executions: Array.from(memoryExecutions.values()).filter((e) => e.jobId === id),
        logs: memoryLogs.filter((l) => l.jobId === id),
      };
    }
  }

  async queryJobs(params: {
    projectId?: string;
    queueId?: string;
    status?: JobStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: any }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 15;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params.projectId) where.projectId = params.projectId;
      if (params.queueId) where.queueId = params.queueId;
      if (params.status) where.status = params.status;
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { id: { contains: params.search } },
        ];
      }

      const [total, data] = await Promise.all([
        this.prisma.job.count({ where }),
        this.prisma.job.findMany({
          where,
          include: {
            queue: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch {
      // In-memory search & pagination
      let list = Array.from(memoryJobs.values());
      if (params.projectId) list = list.filter((j) => j.projectId === params.projectId || params.projectId === DEMO_PROJ_ID);
      if (params.queueId) list = list.filter((j) => j.queueId === params.queueId);
      if (params.status) list = list.filter((j) => j.status === params.status);
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter((j) => j.name.toLowerCase().includes(s) || j.id.includes(s));
      }

      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const total = list.length;
      const paginated = list.slice(skip, skip + limit).map((j) => ({
        ...j,
        queue: { id: j.queueId, name: 'default' },
      }));

      return {
        data: paginated,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  async startJobExecution(params: StartExecutionParams): Promise<{ job: Job; execution: JobExecution } | null> {
    try {
      const { jobId, workerId, leaseToken, attempt, metadata } = params;

      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.$queryRaw<Job[]>`
          UPDATE jobs
          SET status = 'RUNNING',
              updated_at = NOW()
          WHERE id = ${jobId}::uuid
            AND assigned_worker_id = ${workerId}
            AND lease_token = ${leaseToken}
            AND status = 'CLAIMED'
          RETURNING *;
        `;

        const job = updated && updated.length > 0 ? updated[0] : null;
        if (!job) return null;

        const execution = await tx.jobExecution.create({
          data: {
            jobId,
            workerId,
            leaseToken,
            attempt,
            status: ExecutionStatus.RUNNING,
            startedAt: new Date(),
            metadata: metadata ?? {},
          },
        });

        return { job, execution };
      });
    } catch {
      const job = memoryJobs.get(params.jobId);
      if (!job || job.assignedWorkerId !== params.workerId || job.leaseToken !== params.leaseToken) return null;
      job.status = JobStatus.RUNNING;
      job.updatedAt = new Date();
      const execution: JobExecution = {
        id: `exec-${Date.now()}`,
        jobId: job.id,
        workerId: params.workerId,
        leaseToken: params.leaseToken,
        attempt: params.attempt,
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
        finishedAt: null,
        heartbeatAt: new Date(),
        durationMs: null,
        error: null,
        stackTrace: null,
        result: null,
        metadata: params.metadata || {},
        createdAt: new Date(),
      };
      memoryExecutions.set(execution.id, execution);
      return { job, execution };
    }
  }

  async renewLease(jobId: string, workerId: string, leaseToken: string, extensionMs: number): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<{ id: string }[]>`
        UPDATE jobs
        SET lease_until = NOW() + (${extensionMs} || ' milliseconds')::interval,
            updated_at = NOW()
        WHERE id = ${jobId}::uuid
          AND assigned_worker_id = ${workerId}
          AND lease_token = ${leaseToken}
          AND status = 'RUNNING'
        RETURNING id;
      `;
      return Boolean(result && result.length > 0);
    } catch {
      const j = memoryJobs.get(jobId);
      if (!j || j.assignedWorkerId !== workerId || j.leaseToken !== leaseToken || j.status !== JobStatus.RUNNING) return false;
      j.leaseUntil = new Date(Date.now() + extensionMs);
      return true;
    }
  }

  async completeJob(params: CompleteJobParams): Promise<Job | null> {
    try {
      const { jobId, executionId, workerId, leaseToken, result, durationMs } = params;

      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.$queryRaw<Job[]>`
          UPDATE jobs
          SET status = 'COMPLETED',
              result = ${result ? JSON.stringify(result) : null}::jsonb,
              error = NULL,
              lease_until = NULL,
              completed_at = NOW(),
              updated_at = NOW()
          WHERE id = ${jobId}::uuid
            AND assigned_worker_id = ${workerId}
            AND lease_token = ${leaseToken}
            AND status = 'RUNNING'
          RETURNING *;
        `;

        const job = updated && updated.length > 0 ? updated[0] : null;
        if (!job) return null;

        await tx.jobExecution.update({
          where: { id: executionId },
          data: {
            status: ExecutionStatus.SUCCESS,
            finishedAt: new Date(),
            durationMs,
            result: result ?? undefined,
          },
        });

        return job;
      });
    } catch {
      const job = memoryJobs.get(params.jobId);
      if (!job) return null;
      job.status = JobStatus.COMPLETED;
      job.result = params.result || null;
      job.completedAt = new Date();
      job.leaseUntil = null;
      job.updatedAt = new Date();
      return job;
    }
  }

  async failJob(params: FailJobParams): Promise<Job | null> {
    try {
      const { jobId, executionId, workerId, leaseToken, error, stackTrace, nextRunAt, isDeadLetter, failedReason: _failedReason, durationMs } = params;

      return await this.prisma.$transaction(async (tx) => {
        let updated: Job[];

        if (isDeadLetter) {
          updated = await tx.$queryRaw<Job[]>`
            UPDATE jobs
            SET status = 'DEAD_LETTER',
                error = ${error},
                lease_until = NULL,
                updated_at = NOW()
            WHERE id = ${jobId}::uuid
              AND assigned_worker_id = ${workerId}
              AND lease_token = ${leaseToken}
              AND status = 'RUNNING'
            RETURNING *;
          `;
        } else {
          const retryDate = nextRunAt ?? new Date();
          updated = await tx.$queryRaw<Job[]>`
            UPDATE jobs
            SET status = 'QUEUED',
                error = ${error},
                run_at = ${retryDate},
                assigned_worker_id = NULL,
                lease_token = NULL,
                lease_until = NULL,
                claimed_at = NULL,
                updated_at = NOW()
            WHERE id = ${jobId}::uuid
              AND assigned_worker_id = ${workerId}
              AND lease_token = ${leaseToken}
              AND status = 'RUNNING'
            RETURNING *;
          `;
        }

        const job = updated && updated.length > 0 ? updated[0] : null;
        if (!job) return null;

        await tx.jobExecution.update({
          where: { id: executionId },
          data: {
            status: ExecutionStatus.FAILED,
            finishedAt: new Date(),
            durationMs,
            error,
            stackTrace,
          },
        });

        return job;
      });
    } catch {
      const job = memoryJobs.get(params.jobId);
      if (!job) return null;
      job.status = params.isDeadLetter ? JobStatus.DEAD_LETTER : JobStatus.QUEUED;
      job.error = params.error;
      job.leaseUntil = null;
      job.updatedAt = new Date();
      return job;
    }
  }

  async timeoutJob(params: TimeoutJobParams): Promise<Job | null> {
    return this.failJob({
      ...params,
      failedReason: 'Job execution exceeded timeout deadline',
    });
  }

  async appendLog(params: {
    jobId: string;
    executionId?: string;
    workerId?: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
  }): Promise<JobLog> {
    try {
      return await this.prisma.jobLog.create({
        data: {
          jobId: params.jobId,
          executionId: params.executionId,
          workerId: params.workerId,
          level: params.level,
          message: params.message,
          context: params.context ?? {},
        },
      });
    } catch {
      const log: JobLog = {
        id: `log-${Date.now()}`,
        jobId: params.jobId,
        executionId: params.executionId || null,
        workerId: params.workerId || null,
        level: params.level,
        message: params.message,
        context: params.context || {},
        timestamp: new Date(),
      };
      memoryLogs.push(log);
      return log;
    }
  }

  async recoverExpiredLeases(limit: number = 50): Promise<Job[]> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const expiredJobs = await tx.$queryRaw<Job[]>`
          SELECT *
          FROM jobs
          WHERE status IN ('CLAIMED', 'RUNNING')
            AND lease_until < NOW()
          ORDER BY lease_until ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit};
        `;

        const recovered: Job[] = [];
        for (const job of expiredJobs) {
          if (job.attempt < job.maxAttempts) {
            const res = await tx.$queryRaw<Job[]>`
              UPDATE jobs
              SET status = 'QUEUED',
                  assigned_worker_id = NULL,
                  lease_token = NULL,
                  lease_until = NULL,
                  claimed_at = NULL,
                  error = 'Recovered from expired lease / worker timeout',
                  updated_at = NOW()
              WHERE id = ${job.id}::uuid
              RETURNING *;
            `;
            if (res.length > 0 && res[0]) recovered.push(res[0]);
          }
        }
        return recovered;
      });
    } catch {
      return [];
    }
  }

  async reprocessDeadLetterJob(dlqId: string): Promise<Job> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const dlq = await tx.deadLetterJob.findUnique({
          where: { id: dlqId },
          include: { job: true },
        });

        if (!dlq) throw new Error(`DeadLetterJob with id ${dlqId} not found`);

        return await tx.job.update({
          where: { id: dlq.jobId },
          data: {
            status: JobStatus.QUEUED,
            runAt: new Date(),
            assignedWorkerId: null,
            leaseToken: null,
            leaseUntil: null,
            claimedAt: null,
            reprocessCount: { increment: 1 },
            maxAttempts: { increment: 3 },
          },
        });
      });
    } catch {
      const dlq = memoryDlq.get(dlqId);
      const job = dlq ? memoryJobs.get(dlq.jobId) : null;
      if (!job) throw new Error('Job not found in DLQ');
      job.status = JobStatus.QUEUED;
      job.reprocessCount += 1;
      job.maxAttempts += 3;
      job.error = null;
      job.updatedAt = new Date();
      return job;
    }
  }

  async cancelJob(jobId: string, reason?: string): Promise<Job | null> {
    try {
      return await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CANCELLED,
          error: reason || 'Cancelled by user',
          leaseUntil: null,
        },
      });
    } catch {
      const job = memoryJobs.get(jobId);
      if (!job) return null;
      job.status = JobStatus.CANCELLED;
      job.error = reason || 'Cancelled by user';
      job.updatedAt = new Date();
      return job;
    }
  }

  async getDeadLetterJobs(params: { projectId?: string; queueId?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params.queueId) where.queueId = params.queueId;
      if (params.projectId) where.job = { projectId: params.projectId };

      const [total, data] = await Promise.all([
        this.prisma.deadLetterJob.count({ where }),
        this.prisma.deadLetterJob.findMany({
          where,
          include: {
            job: true,
            queue: true,
          },
          orderBy: { archivedAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch {
      const dlqList = Array.from(memoryDlq.values());
      return {
        data: dlqList.slice(skip, skip + limit),
        meta: {
          page,
          limit,
          total: dlqList.length,
          totalPages: 1,
        },
      };
    }
  }
}
