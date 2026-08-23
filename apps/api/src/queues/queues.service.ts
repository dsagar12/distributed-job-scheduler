import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { QueueRepository, getPrismaClient } from '@scheduler/database';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';

@Injectable()
export class QueuesService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly queueRepo: QueueRepository) {}

  async getQueuesByProject(projectId: string) {
    const queues = await this.queueRepo.getQueuesByProject(projectId);
    const result = [];

    for (const q of queues) {
      const metrics = await this.queueRepo.getQueueMetrics(q.id);
      result.push({
        ...q,
        metrics,
      });
    }

    return result;
  }

  async getQueueById(id: string) {
    const queue = await this.queueRepo.getQueueById(id);
    if (!queue) {
      throw new NotFoundException(`Queue with ID ${id} not found`);
    }

    const metrics = await this.queueRepo.getQueueMetrics(id);
    return {
      ...queue,
      metrics,
    };
  }

  async createQueue(dto: CreateQueueDto) {
    try {
      const existing = await this.prisma.queue.findFirst({
        where: {
          projectId: dto.projectId,
          name: dto.name,
        },
      });

      if (existing) {
        throw new ConflictException(`Queue with name "${dto.name}" already exists in this project`);
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
    }

    return this.queueRepo.createQueue(dto);
  }

  async updateQueue(id: string, dto: UpdateQueueDto) {
    await this.getQueueById(id);
    return this.queueRepo.updateQueue(id, dto);
  }

  async setPaused(id: string, isPaused: boolean) {
    await this.getQueueById(id);
    return this.queueRepo.setPaused(id, isPaused);
  }

  async deleteQueue(id: string) {
    await this.getQueueById(id);
    await this.queueRepo.deleteQueue(id);
    return { success: true };
  }

  async getQueueMetrics(id: string) {
    await this.getQueueById(id);
    return this.queueRepo.getQueueMetrics(id);
  }
}
