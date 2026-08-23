import { PrismaClient, Worker, WorkerStatus, WorkerHeartbeat } from '@prisma/client';
import { getPrismaClient } from '../client';

export interface RegisterWorkerParams {
  id: string;
  hostname: string;
  pid: number;
  concurrency: number;
  ipAddress?: string | null;
  version?: string | null;
  metadata?: Record<string, any> | null;
  queueIds?: string[];
}

export interface RecordHeartbeatParams {
  workerId: string;
  activeJobsCount: number;
  concurrency: number;
  memoryUsageMb: number;
  cpuPercent?: number;
  activeJobIds: string[];
}

const memoryWorkers: Map<string, Worker> = new Map();

// Seed initial demo worker in memory
const demoWorker: Worker = {
  id: 'worker-primary-node-1',
  hostname: 'scheduler-node-prod-01',
  pid: 10420,
  status: WorkerStatus.ACTIVE,
  concurrency: 10,
  activeJobsCount: 0,
  ipAddress: '10.0.4.12',
  version: '1.0.0',
  metadata: { runtime: 'NodeJS 20.x', os: 'Linux x86_64' },
  totalJobsProcessed: 1420,
  totalJobsFailed: 12,
  startedAt: new Date(Date.now() - 86400000),
  lastHeartbeatAt: new Date(),
  stoppedAt: null,
};
memoryWorkers.set(demoWorker.id, demoWorker);

export class WorkerRepository {
  constructor(private prisma: PrismaClient = getPrismaClient()) {}

  async registerWorker(params: RegisterWorkerParams): Promise<Worker> {
    const { id, hostname, pid, concurrency, ipAddress, version, metadata, queueIds } = params;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const worker = await tx.worker.upsert({
          where: { id },
          create: {
            id,
            hostname,
            pid,
            status: WorkerStatus.ACTIVE,
            concurrency,
            activeJobsCount: 0,
            ipAddress,
            version,
            metadata: metadata ?? {},
            startedAt: new Date(),
            lastHeartbeatAt: new Date(),
            stoppedAt: null,
          },
          update: {
            hostname,
            pid,
            status: WorkerStatus.ACTIVE,
            concurrency,
            ipAddress,
            version,
            metadata: metadata ?? {},
            lastHeartbeatAt: new Date(),
            stoppedAt: null,
          },
        });

        if (queueIds && queueIds.length > 0) {
          for (const queueId of queueIds) {
            await tx.workerQueue.upsert({
              where: {
                uq_worker_queue: {
                  workerId: id,
                  queueId,
                },
              },
              create: {
                workerId: id,
                queueId,
                weight: 1,
              },
              update: {},
            });
          }
        }

        return worker;
      });
    } catch {
      const w: Worker = {
        id,
        hostname,
        pid,
        status: WorkerStatus.ACTIVE,
        concurrency,
        activeJobsCount: 0,
        ipAddress: ipAddress ?? null,
        version: version ?? null,
        metadata: metadata ?? {},
        totalJobsProcessed: 0,
        totalJobsFailed: 0,
        startedAt: new Date(),
        lastHeartbeatAt: new Date(),
        stoppedAt: null,
      };
      memoryWorkers.set(id, w);
      return w;
    }
  }

  async recordHeartbeat(params: RecordHeartbeatParams): Promise<WorkerHeartbeat> {
    const { workerId, activeJobsCount, concurrency, memoryUsageMb, cpuPercent, activeJobIds } = params;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.worker.update({
          where: { id: workerId },
          data: {
            lastHeartbeatAt: new Date(),
            status: WorkerStatus.ACTIVE,
            activeJobsCount,
          },
        });

        return tx.workerHeartbeat.create({
          data: {
            workerId,
            activeJobsCount,
            concurrency,
            memoryUsageMb,
            cpuPercent,
            activeJobIds: activeJobIds as any,
            timestamp: new Date(),
          },
        });
      });
    } catch {
      const w = memoryWorkers.get(workerId);
      if (w) {
        w.lastHeartbeatAt = new Date();
        w.activeJobsCount = activeJobsCount;
      }
      return {
        id: `hb-${Date.now()}`,
        workerId,
        activeJobsCount,
        concurrency,
        memoryUsageMb,
        cpuPercent: cpuPercent ?? 0,
        activeJobIds: activeJobIds as any,
        timestamp: new Date(),
      };
    }
  }

  async updateStatus(workerId: string, status: WorkerStatus): Promise<Worker> {
    try {
      return await this.prisma.worker.update({
        where: { id: workerId },
        data: {
          status,
          stoppedAt: status === WorkerStatus.STOPPED ? new Date() : undefined,
        },
      });
    } catch {
      const w = memoryWorkers.get(workerId);
      if (!w) throw new Error('Worker not found');
      w.status = status;
      if (status === WorkerStatus.STOPPED) w.stoppedAt = new Date();
      return w;
    }
  }

  async detectDeadWorkers(thresholdMs: number = 30000): Promise<Worker[]> {
    const cutoff = new Date(Date.now() - thresholdMs);

    try {
      const deadWorkers = await this.prisma.worker.findMany({
        where: {
          status: { in: [WorkerStatus.ACTIVE, WorkerStatus.DRAINING] },
          lastHeartbeatAt: { lt: cutoff },
        },
      });

      if (deadWorkers.length > 0) {
        const ids = deadWorkers.map((w) => w.id);
        await this.prisma.worker.updateMany({
          where: { id: { in: ids } },
          data: { status: WorkerStatus.DEAD },
        });
      }

      return deadWorkers;
    } catch {
      return [];
    }
  }

  async pruneHistoricalHeartbeats(retentionDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    try {
      const result = await this.prisma.workerHeartbeat.deleteMany({
        where: {
          timestamp: { lt: cutoff },
        },
      });
      return result.count;
    } catch {
      return 0;
    }
  }

  async getAllWorkers(): Promise<any[]> {
    try {
      return await this.prisma.worker.findMany({
        include: {
          workerQueues: {
            include: {
              queue: true,
            },
          },
        },
        orderBy: { lastHeartbeatAt: 'desc' },
      });
    } catch {
      return Array.from(memoryWorkers.values()).map((w) => ({
        ...w,
        workerQueues: [
          {
            id: `wq-${w.id}`,
            workerId: w.id,
            queueId: '44444444-4444-4444-4444-444444444444',
            weight: 1,
            queue: { id: '44444444-4444-4444-4444-444444444444', name: 'default' },
          },
        ],
      }));
    }
  }
}
