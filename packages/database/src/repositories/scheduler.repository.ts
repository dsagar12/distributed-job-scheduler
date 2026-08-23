import { PrismaClient, ScheduledJob, ScheduledJobStatus, Job, JobStatus } from '@prisma/client';
import { getPrismaClient } from '../client';

export interface CreateScheduledJobParams {
  projectId: string;
  queueId: string;
  name: string;
  cronExpression?: string | null;
  timezone?: string;
  payload: Record<string, any>;
  nextRunAt: Date;
  maxRuns?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export class SchedulerRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Promotes delayed/future jobs from SCHEDULED to QUEUED once run_at <= NOW().
   */
  async advanceScheduledJobs(limit: number = 100): Promise<Job[]> {
    return this.prisma.$queryRaw<Job[]>`
      WITH due_jobs AS (
        SELECT id
        FROM jobs
        WHERE status = 'SCHEDULED'
          AND run_at <= NOW()
        ORDER BY run_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE jobs j
      SET status = 'QUEUED',
          updated_at = NOW()
      FROM due_jobs
      WHERE j.id = due_jobs.id
      RETURNING j.*;
    `;
  }

  /**
   * Fetches active recurring schedule definitions that are due for evaluation.
   */
  async claimDueSchedules(limit: number = 20): Promise<ScheduledJob[]> {
    return this.prisma.$queryRaw<ScheduledJob[]>`
      SELECT *
      FROM scheduled_jobs
      WHERE status = 'ACTIVE'
        AND next_run_at <= NOW()
        AND (end_date IS NULL OR end_date > NOW())
        AND (max_runs IS NULL OR total_runs < max_runs)
      ORDER BY next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit};
    `;
  }

  /**
   * Atomically triggers a scheduled job instance:
   * 1. Creates a discrete Job record in QUEUED state.
   * 2. Updates the ScheduledJob's nextRunAt, lastRunAt, and totalRuns.
   */
  async triggerSchedule(scheduleId: string, nextRunAt: Date | null, isCompleted: boolean): Promise<{ job: Job; schedule: ScheduledJob }> {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.scheduledJob.findUnique({
        where: { id: scheduleId },
        include: { queue: true },
      });

      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Generate unique idempotency key for this specific execution tick
      const executionTimestamp = schedule.nextRunAt.toISOString();
      const idempotencyKey = `schedule:${schedule.id}:${executionTimestamp}`;

      // Create discrete Job record
      const job = await tx.job.create({
        data: {
          projectId: schedule.projectId,
          queueId: schedule.queueId,
          name: `${schedule.name} (${executionTimestamp})`,
          payload: schedule.payload as any,
          priority: 50,
          status: JobStatus.QUEUED,
          runAt: new Date(),
          scheduledJobId: schedule.id,
          idempotencyKey,
        },
      });

      // Update schedule definition
      const updatedSchedule = await tx.scheduledJob.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          totalRuns: { increment: 1 },
          nextRunAt: nextRunAt ?? schedule.nextRunAt,
          status: isCompleted ? ScheduledJobStatus.COMPLETED : ScheduledJobStatus.ACTIVE,
        },
      });

      return { job, schedule: updatedSchedule };
    });
  }

  async createScheduledJob(params: CreateScheduledJobParams): Promise<ScheduledJob> {
    return this.prisma.scheduledJob.create({
      data: {
        projectId: params.projectId,
        queueId: params.queueId,
        name: params.name,
        cronExpression: params.cronExpression,
        timezone: params.timezone ?? 'UTC',
        payload: params.payload,
        nextRunAt: params.nextRunAt,
        maxRuns: params.maxRuns,
        startDate: params.startDate,
        endDate: params.endDate,
        status: ScheduledJobStatus.ACTIVE,
      },
      include: {
        queue: true,
      },
    });
  }

  async getScheduledJobsByProject(projectId: string): Promise<ScheduledJob[]> {
    return this.prisma.scheduledJob.findMany({
      where: { projectId },
      include: {
        queue: true,
      },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async updateScheduledJobStatus(id: string, status: ScheduledJobStatus): Promise<ScheduledJob> {
    return this.prisma.scheduledJob.update({
      where: { id },
      data: { status },
    });
  }
}
