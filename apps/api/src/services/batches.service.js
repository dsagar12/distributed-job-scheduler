const { batchRepo } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { DUMMY_BATCHES } = require('../config/dummy-data');

class BatchesService {
  constructor() {
    this.memoryBatches = [...DUMMY_BATCHES];
  }

  async getBatchesByProject(projectId) {
    const batchMap = new Map();

    for (const b of this.memoryBatches) {
      batchMap.set(b.id, { ...b, projectId: projectId || b.projectId });
    }

    try {
      const dbBatches = await batchRepo.getBatchesByProject(projectId);
      if (Array.isArray(dbBatches)) {
        for (const dbB of dbBatches) {
          batchMap.set(dbB.id, dbB);
        }
      }
    } catch {}

    return Array.from(batchMap.values());
  }

  async getBatchById(id) {
    const batches = await this.getBatchesByProject();
    let batch = batches.find((b) => b.id === id);
    if (!batch) {
      batch = this.memoryBatches[0];
    }
    return batch;
  }

  async createBatch(dto) {
    const newBatch = {
      id: 'batch_' + Date.now(),
      projectId: dto.projectId || '33333333-3333-3333-3333-333333333333',
      name: dto.name,
      status: 'IN_PROGRESS',
      totalJobs: (dto.jobs || []).length || 5,
      completedJobs: 0,
      failedJobs: 0,
      onCompleteWebhook: dto.onCompleteWebhook,
      createdAt: new Date(),
      updatedAt: new Date(),
      jobs: (dto.jobs || []).map((j, idx) => ({
        id: `b-sub-${Date.now()}-${idx}`,
        name: j.name || `Subtask #${idx + 1}`,
        status: 'QUEUED',
        priority: j.priority || 50,
      })),
    };

    try {
      const created = await batchRepo.createBatch(dto);
      if (created) Object.assign(newBatch, created);
    } catch {}

    this.memoryBatches.unshift(newBatch);
    return newBatch;
  }

  async cancelBatch(id) {
    const batch = await this.getBatchById(id);
    batch.status = 'CANCELLED';
    return batch;
  }
}

module.exports = new BatchesService();
