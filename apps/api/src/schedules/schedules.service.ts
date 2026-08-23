import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulerRepository, getPrismaClient } from '@scheduler/database';
import { getNextCronOccurrence, isValidCronExpression } from '@scheduler/shared';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduledJobStatus, JobStatus } from '@prisma/client';

@Injectable()
export class SchedulesService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly schedulerRepo: SchedulerRepository) {}

  async createSchedule(dto: CreateScheduleDto) {
    let nextRunAt = dto.nextRunAt;

    if (dto.cronExpression) {
      if (!isValidCronExpression(dto.cronExpression)) {
        throw new BadRequestException(`Invalid cron expression: "${dto.cronExpression}"`);
      }
      if (!nextRunAt) {
        nextRunAt = getNextCronOccurrence({
          cronExpression: dto.cronExpression,
          tz: dto.timezone || 'UTC',
        });
      }
    }

    if (!nextRunAt) {
      throw new BadRequestException('Either a valid cronExpression or a future nextRunAt timestamp must be provided');
    }

    return this.schedulerRepo.createScheduledJob({
      ...dto,
      nextRunAt,
    });
  }

  async getSchedulesByProject(projectId: string) {
    return this.schedulerRepo.getScheduledJobsByProject(projectId);
  }

  async getScheduleById(id: string) {
    const schedule = await this.prisma.scheduledJob.findUnique({
      where: { id },
      include: {
        queue: true,
        jobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    await this.getScheduleById(id);

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.cronExpression) {
      if (!isValidCronExpression(dto.cronExpression)) {
        throw new BadRequestException(`Invalid cron expression: "${dto.cronExpression}"`);
      }
      data.cronExpression = dto.cronExpression;
    }

    return this.prisma.scheduledJob.update({
      where: { id },
      data,
    });
  }

  async triggerScheduleNow(id: string) {
    const schedule = await this.getScheduleById(id);

    let nextRunAt: Date | null = null;
    if (schedule.cronExpression) {
      nextRunAt = getNextCronOccurrence({
        cronExpression: schedule.cronExpression,
        tz: schedule.timezone || 'UTC',
      });
    }

    const isCompleted = Boolean(schedule.maxRuns && schedule.totalRuns + 1 >= schedule.maxRuns);

    // Discrete job creation with idempotency key
    const executionTimestamp = new Date().toISOString();
    const idempotencyKey = `schedule:manual:${schedule.id}:${executionTimestamp}`;

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          projectId: schedule.projectId,
          queueId: schedule.queueId,
          name: `${schedule.name} (Manual trigger ${executionTimestamp})`,
          payload: schedule.payload as any,
          priority: 50,
          status: JobStatus.QUEUED,
          runAt: new Date(),
          scheduledJobId: schedule.id,
          idempotencyKey,
        },
      });

      const updatedSchedule = await tx.scheduledJob.update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          totalRuns: { increment: 1 },
          nextRunAt: nextRunAt ?? schedule.nextRunAt,
          status: isCompleted ? ScheduledJobStatus.COMPLETED : schedule.status,
        },
      });

      return { job, schedule: updatedSchedule };
    });
  }

  async deleteSchedule(id: string) {
    await this.getScheduleById(id);
    await this.prisma.scheduledJob.delete({ where: { id } });
    return { success: true };
  }
}
