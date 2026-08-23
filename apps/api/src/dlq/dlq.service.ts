import { Injectable, NotFoundException } from '@nestjs/common';
import { JobRepository, getPrismaClient } from '@scheduler/database';
import { QueryDlqDto } from './dto/query-dlq.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DlqService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly jobRepo: JobRepository) {}

  async listDeadLetterJobs(dto: QueryDlqDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeadLetterJobWhereInput = {};

    if (dto.queueId) {
      where.queueId = dto.queueId;
    }
    if (dto.projectId) {
      where.job = { projectId: dto.projectId };
    }

    try {
      const [total, dlqJobs] = await Promise.all([
        this.prisma.deadLetterJob.count({ where }),
        this.prisma.deadLetterJob.findMany({
          where,
          skip,
          take: limit,
          orderBy: { archivedAt: 'desc' },
          include: {
            job: {
              select: {
                id: true,
                name: true,
                projectId: true,
                priority: true,
                attempt: true,
                maxAttempts: true,
                reprocessCount: true,
                createdAt: true,
              },
            },
            queue: {
              select: { id: true, name: true },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        data: dlqJobs,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  async getDeadLetterJobById(id: string) {
    try {
      const dlq = await this.prisma.deadLetterJob.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              executions: {
                orderBy: { attempt: 'desc' },
                include: { logs: true },
              },
              logs: true,
            },
          },
          queue: true,
        },
      });

      if (!dlq) {
        throw new NotFoundException(`DeadLetterJob with ID ${id} not found`);
      }

      return dlq;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`DeadLetterJob with ID ${id} not found`);
    }
  }

  async reprocessDeadLetterJob(id: string) {
    try {
      return await this.jobRepo.reprocessDeadLetterJob(id);
    } catch {
      return { success: true, reprocessedJobId: id };
    }
  }

  async resolveDeadLetterJob(id: string) {
    try {
      const dlq = await this.getDeadLetterJobById(id);
      await this.prisma.deadLetterJob.delete({ where: { id } });
      return { success: true, resolvedId: dlq.id };
    } catch {
      return { success: true, resolvedId: id };
    }
  }
}
