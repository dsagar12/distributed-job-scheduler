import { Injectable, NotFoundException } from '@nestjs/common';
import { BatchRepository } from '@scheduler/database';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private readonly batchRepo: BatchRepository) {}

  async createBatch(dto: CreateBatchDto) {
    return this.batchRepo.createBatch({
      projectId: dto.projectId,
      name: dto.name,
      jobs: dto.jobs,
    });
  }

  async getBatchById(id: string) {
    const batch = await this.batchRepo.getBatchById(id);
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${id} not found`);
    }

    const progressPercentage =
      batch.totalJobs > 0
        ? Math.round(((batch.completedJobs + batch.failedJobs) / batch.totalJobs) * 100)
        : 0;

    return {
      ...batch,
      progressPercentage,
    };
  }

  async getBatchesByProject(projectId: string) {
    return this.batchRepo.getBatchesByProject(projectId);
  }

  async updateBatchProgress(batchId: string) {
    return this.batchRepo.updateBatchProgress(batchId);
  }
}
