import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkerRepository, getPrismaClient } from '@scheduler/database';

@Injectable()
export class WorkersService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly workerRepo: WorkerRepository) {}

  async getAllWorkers() {
    return this.workerRepo.getAllWorkers();
  }

  async getWorkerById(id: string) {
    try {
      const worker = await this.prisma.worker.findUnique({
        where: { id },
        include: {
          workerQueues: {
            include: {
              queue: true,
            },
          },
          heartbeats: {
            take: 50,
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (worker) return worker;
    } catch {
      // fallback
    }

    const all = await this.workerRepo.getAllWorkers();
    const found = all.find((w: any) => w.id === id);
    if (!found) {
      throw new NotFoundException(`Worker node with ID ${id} not found`);
    }

    return found;
  }
}
