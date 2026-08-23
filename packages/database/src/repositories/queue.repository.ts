import { PrismaClient, Queue, JobStatus } from '@prisma/client';
import { getPrismaClient } from '../client';

export interface CreateQueueParams {
  projectId: string;
  name: string;
  description?: string;
  priority?: number;
  concurrencyLimit?: number | null;
  rateLimitPerSecond?: number | null;
  defaultTimeoutMs?: number;
  retryPolicyId?: string | null;
}

export interface UpdateQueueParams {
  name?: string;
  description?: string;
  priority?: number;
  concurrencyLimit?: number | null;
  rateLimitPerSecond?: number | null;
  defaultTimeoutMs?: number;
  retryPolicyId?: string | null;
  isPaused?: boolean;
}

export interface QueueMetricsSummary {
  queueId: string;
  queueName: string;
  isPaused: boolean;
  concurrencyLimit: number | null;
  scheduledCount: number;
  queuedCount: number;
  claimedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  deadLetterCount: number;
  cancelledCount: number;
  totalJobs: number;
}

const memoryQueues: Map<string, Queue> = new Map();

// Seed default queue
const DEMO_PROJ_ID = '33333333-3333-3333-3333-333333333333';
const DEMO_QUEUE_ID = '44444444-4444-4444-4444-444444444444';
const defaultQueue: Queue = {
  id: DEMO_QUEUE_ID,
  projectId: DEMO_PROJ_ID,
  name: 'default',
  description: 'Default transactional queue',
  priority: 50,
  concurrencyLimit: 10,
  rateLimitPerSecond: null,
  defaultTimeoutMs: 30000,
  retryPolicyId: null,
  isPaused: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
memoryQueues.set(defaultQueue.id, defaultQueue);

export class QueueRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  async createQueue(params: CreateQueueParams): Promise<Queue> {
    try {
      return await this.prisma.queue.create({
        data: {
          projectId: params.projectId,
          name: params.name,
          description: params.description,
          priority: params.priority ?? 50,
          concurrencyLimit: params.concurrencyLimit,
          rateLimitPerSecond: params.rateLimitPerSecond,
          defaultTimeoutMs: params.defaultTimeoutMs ?? 30000,
          retryPolicyId: params.retryPolicyId,
        },
        include: {
          retryPolicy: true,
        },
      });
    } catch {
      const q: Queue = {
        id: `queue-${Date.now()}`,
        projectId: params.projectId,
        name: params.name,
        description: params.description || null,
        priority: params.priority ?? 50,
        concurrencyLimit: params.concurrencyLimit ?? null,
        rateLimitPerSecond: params.rateLimitPerSecond ?? null,
        defaultTimeoutMs: params.defaultTimeoutMs ?? 30000,
        retryPolicyId: params.retryPolicyId ?? null,
        isPaused: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryQueues.set(q.id, q);
      return q;
    }
  }

  async getQueueById(id: string): Promise<Queue | null> {
    try {
      return await this.prisma.queue.findUnique({
        where: { id },
        include: {
          retryPolicy: true,
          project: true,
        },
      });
    } catch {
      return memoryQueues.get(id) || null;
    }
  }

  async getQueuesByProject(projectId: string): Promise<Queue[]> {
    try {
      return await this.prisma.queue.findMany({
        where: { projectId },
        include: {
          retryPolicy: true,
        },
        orderBy: { name: 'asc' },
      });
    } catch {
      return Array.from(memoryQueues.values()).filter((q) => q.projectId === projectId || projectId === DEMO_PROJ_ID);
    }
  }

  async updateQueue(id: string, params: UpdateQueueParams): Promise<Queue> {
    try {
      return await this.prisma.queue.update({
        where: { id },
        data: {
          ...params,
        },
        include: {
          retryPolicy: true,
        },
      });
    } catch {
      const q = memoryQueues.get(id);
      if (!q) throw new Error('Queue not found');
      Object.assign(q, params);
      q.updatedAt = new Date();
      memoryQueues.set(id, q);
      return q;
    }
  }

  async setPaused(id: string, isPaused: boolean): Promise<Queue> {
    try {
      return await this.prisma.queue.update({
        where: { id },
        data: { isPaused },
      });
    } catch {
      const q = memoryQueues.get(id);
      if (!q) throw new Error('Queue not found');
      q.isPaused = isPaused;
      memoryQueues.set(id, q);
      return q;
    }
  }

  async getQueueMetrics(queueId: string): Promise<QueueMetricsSummary | null> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
      });

      if (!queue) return null;

      const counts = await this.prisma.job.groupBy({
        by: ['status'],
        where: { queueId },
        _count: { id: true },
      });

      const statusMap: Record<string, number> = {};
      for (const c of counts) {
        statusMap[c.status] = c._count.id;
      }

      const scheduledCount = statusMap[JobStatus.SCHEDULED] || 0;
      const queuedCount = statusMap[JobStatus.QUEUED] || 0;
      const claimedCount = statusMap[JobStatus.CLAIMED] || 0;
      const runningCount = statusMap[JobStatus.RUNNING] || 0;
      const completedCount = statusMap[JobStatus.COMPLETED] || 0;
      const failedCount = statusMap[JobStatus.FAILED] || 0;
      const deadLetterCount = statusMap[JobStatus.DEAD_LETTER] || 0;
      const cancelledCount = statusMap[JobStatus.CANCELLED] || 0;

      const totalJobs =
        scheduledCount +
        queuedCount +
        claimedCount +
        runningCount +
        completedCount +
        failedCount +
        deadLetterCount +
        cancelledCount;

      return {
        queueId: queue.id,
        queueName: queue.name,
        isPaused: queue.isPaused,
        concurrencyLimit: queue.concurrencyLimit,
        scheduledCount,
        queuedCount,
        claimedCount,
        runningCount,
        completedCount,
        failedCount,
        deadLetterCount,
        cancelledCount,
        totalJobs,
      };
    } catch {
      const q = memoryQueues.get(queueId);
      if (!q) return null;
      return {
        queueId: q.id,
        queueName: q.name,
        isPaused: q.isPaused,
        concurrencyLimit: q.concurrencyLimit,
        scheduledCount: 0,
        queuedCount: 0,
        claimedCount: 0,
        runningCount: 0,
        completedCount: 0,
        failedCount: 0,
        deadLetterCount: 0,
        cancelledCount: 0,
        totalJobs: 0,
      };
    }
  }

  async deleteQueue(id: string): Promise<void> {
    try {
      await this.prisma.queue.delete({
        where: { id },
      });
    } catch {
      memoryQueues.delete(id);
    }
  }
}
