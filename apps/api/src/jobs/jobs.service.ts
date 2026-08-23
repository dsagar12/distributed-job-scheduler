import { Injectable, NotFoundException } from '@nestjs/common';
import { JobRepository } from '@scheduler/database';
import { CreateJobDto } from './dto/create-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { CancelJobDto } from './dto/cancel-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly jobRepo: JobRepository) {}

  async createJob(dto: CreateJobDto) {
    const result = await this.jobRepo.createJob({
      projectId: dto.projectId,
      queueId: dto.queueId,
      name: dto.name,
      payload: dto.payload,
      priority: dto.priority,
      runAt: dto.runAt,
      timeoutMs: dto.timeoutMs,
      maxAttempts: dto.maxAttempts,
      retryPolicyId: dto.retryPolicyId,
      idempotencyKey: dto.idempotencyKey,
      batchId: dto.batchId,
      parentJobId: dto.parentJobId,
    });

    return result.job;
  }

  async getJobById(id: string) {
    const job = await this.jobRepo.getJobById(id);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async queryJobs(dto: QueryJobsDto) {
    return this.jobRepo.queryJobs({
      projectId: dto.projectId,
      queueId: dto.queueId,
      status: dto.status,
      search: dto.search,
      page: dto.page,
      limit: dto.limit,
    });
  }

  async cancelJob(id: string, dto?: CancelJobDto) {
    const job = await this.jobRepo.cancelJob(id, dto?.reason);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async reprocessJob(id: string) {
    return this.jobRepo.reprocessDeadLetterJob(id).catch(async () => {
      const job = await this.jobRepo.getJobById(id);
      if (!job) throw new NotFoundException(`Job with ID ${id} not found`);
      return job;
    });
  }

  async getJobExecutions(jobId: string) {
    const job = await this.getJobById(jobId);
    return job.executions || [];
  }

  async getJobLogs(jobId: string) {
    const job = await this.getJobById(jobId);
    return job.logs || [];
  }
}
