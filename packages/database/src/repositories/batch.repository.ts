import { PrismaClient, Batch, BatchStatus, Job, JobStatus } from '@prisma/client';
import { getPrismaClient } from '../client';
import { CreateJobParams } from './job.repository';

export interface CreateBatchParams {
  projectId: string;
  name: string;
  jobs: Array<Omit<CreateJobParams, 'projectId' | 'batchId'>>;
}

export class BatchRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  /**
   * Creates a batch and all its associated child jobs in a single transaction.
   */
  async createBatch(params: CreateBatchParams): Promise<Batch & { jobs: Job[] }> {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          projectId: params.projectId,
          name: params.name,
          status: BatchStatus.PROCESSING,
          totalJobs: params.jobs.length,
          completedJobs: 0,
          failedJobs: 0,
        },
      });

      const createdJobs: Job[] = [];

      let orderIndex = 0;
      for (const item of params.jobs) {
        const job = await tx.job.create({
          data: {
            projectId: params.projectId,
            queueId: item.queueId,
            name: item.name,
            payload: item.payload,
            priority: item.priority ?? 50,
            runAt: item.runAt ?? new Date(),
            timeoutMs: item.timeoutMs ?? 30000,
            maxAttempts: item.maxAttempts ?? 3,
            retryPolicyId: item.retryPolicyId,
            batchId: batch.id,
            status: item.runAt && item.runAt.getTime() > Date.now() ? JobStatus.SCHEDULED : JobStatus.QUEUED,
          },
        });

        await tx.batchJob.create({
          data: {
            batchId: batch.id,
            jobId: job.id,
            orderIndex,
          },
        });

        createdJobs.push(job);
        orderIndex++;
      }

      return { ...batch, jobs: createdJobs };
    });
  }

  /**
   * Recalculates and updates batch progress based on child jobs state.
   */
  async updateBatchProgress(batchId: string): Promise<Batch> {
    return this.prisma.$transaction(async (tx) => {
      const counts = await tx.job.groupBy({
        by: ['status'],
        where: { batchId },
        _count: { id: true },
      });

      const statusMap: Record<string, number> = {};
      let total = 0;
      for (const c of counts) {
        statusMap[c.status] = c._count.id;
        total += c._count.id;
      }

      const completed = statusMap[JobStatus.COMPLETED] || 0;
      const failed = (statusMap[JobStatus.FAILED] || 0) + (statusMap[JobStatus.DEAD_LETTER] || 0);

      let status: BatchStatus = BatchStatus.PROCESSING;
      let completedAt: Date | null = null;

      if (completed === total && total > 0) {
        status = BatchStatus.COMPLETED;
        completedAt = new Date();
      } else if (failed === total && total > 0) {
        status = BatchStatus.FAILED;
        completedAt = new Date();
      } else if (completed + failed === total && total > 0) {
        status = BatchStatus.PARTIALLY_FAILED;
        completedAt = new Date();
      }

      return tx.batch.update({
        where: { id: batchId },
        data: {
          completedJobs: completed,
          failedJobs: failed,
          status,
          completedAt,
        },
      });
    });
  }

  async getBatchById(id: string): Promise<(Batch & { jobs: Job[] }) | null> {
    return this.prisma.batch.findUnique({
      where: { id },
      include: {
        jobs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getBatchesByProject(projectId: string): Promise<Batch[]> {
    return this.prisma.batch.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
