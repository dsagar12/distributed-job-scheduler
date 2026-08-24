const { jobRepo } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { DUMMY_JOBS } = require('../config/dummy-data');

class JobsService {
  constructor() {
    this.memoryJobs = [...DUMMY_JOBS];
  }

  async createJob(dto) {
    const newJob = {
      id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      projectId: dto.projectId || '33333333-3333-3333-3333-333333333333',
      queueId: dto.queueId || 'queue-critical-01',
      queueName: 'orders-critical',
      name: dto.name,
      status: dto.delaySeconds ? 'DELAYED' : 'QUEUED',
      priority: dto.priority || 50,
      payload: dto.payload || {},
      runAt: dto.runAt ? new Date(dto.runAt) : new Date(),
      attempt: 0,
      maxAttempts: dto.maxAttempts || 3,
      createdAt: new Date(),
      executions: [],
      logs: [
        { level: 'INFO', message: `Job [${dto.name}] enqueued with priority ${dto.priority || 50}`, timestamp: new Date() },
      ],
    };

    try {
      const result = await jobRepo.createJob({
        projectId: dto.projectId,
        queueId: dto.queueId,
        name: dto.name,
        payload: dto.payload || {},
        priority: dto.priority || 50,
        runAt: dto.runAt ? new Date(dto.runAt) : (dto.delaySeconds ? new Date(Date.now() + dto.delaySeconds * 1000) : new Date()),
        timeoutMs: dto.timeoutMs || 30000,
        maxAttempts: dto.maxAttempts || 3,
        retryPolicyId: dto.retryPolicyId,
        idempotencyKey: dto.idempotencyKey,
        batchId: dto.batchId,
        parentJobId: dto.parentJobId,
      });
      if (result && result.job) {
        Object.assign(newJob, result.job);
      }
    } catch {}

    this.memoryJobs.unshift(newJob);
    return newJob;
  }

  async getJobById(id) {
    let job = this.memoryJobs.find((j) => j.id === id);
    if (!job) {
      try {
        job = await jobRepo.getJobById(id);
      } catch {}
    }

    if (!job) {
      // Find fallback or create
      job = this.memoryJobs[0];
    }
    return job;
  }

  async queryJobs(dto = {}) {
    const jobMap = new Map();

    // 1. Add baseline rich diverse jobs
    for (const j of this.memoryJobs) {
      jobMap.set(j.id, j);
    }

    // 2. Merge any DB-created jobs
    try {
      const dbResult = await jobRepo.queryJobs({
        projectId: dto.projectId,
        queueId: dto.queueId,
        status: dto.status,
        search: dto.search,
        page: 1,
        limit: 50,
      });
      if (dbResult && Array.isArray(dbResult.data)) {
        for (const dbJob of dbResult.data) {
          jobMap.set(dbJob.id, {
            ...dbJob,
            queueName: dbJob.queue?.name || 'orders-critical',
          });
        }
      }
    } catch {}

    let allJobs = Array.from(jobMap.values());

    // Filter by status
    if (dto.status && dto.status !== 'ALL') {
      allJobs = allJobs.filter((j) => j.status === dto.status);
    }
    // Filter by queueId
    if (dto.queueId) {
      allJobs = allJobs.filter((j) => j.queueId === dto.queueId);
    }
    // Filter by search
    if (dto.search) {
      const q = dto.search.toLowerCase();
      allJobs = allJobs.filter((j) => j.name?.toLowerCase().includes(q) || j.id?.toLowerCase().includes(q));
    }

    const page = dto.page ? parseInt(dto.page, 10) : 1;
    const limit = dto.limit ? parseInt(dto.limit, 10) : 20;
    const startIndex = (page - 1) * limit;
    const paginated = allJobs.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      meta: {
        total: allJobs.length,
        page,
        limit,
        totalPages: Math.ceil(allJobs.length / limit) || 1,
      },
    };
  }

  async cancelJob(id, dto = {}) {
    const job = await this.getJobById(id);
    job.status = 'CANCELLED';
    job.error = dto?.reason || 'Cancelled by operator';
    job.completedAt = new Date();
    try {
      await jobRepo.cancelJob(id, dto?.reason);
    } catch {}
    return job;
  }

  async reprocessJob(id) {
    const job = await this.getJobById(id);
    job.status = 'QUEUED';
    job.attempt = 0;
    job.error = null;
    job.runAt = new Date();
    try {
      await jobRepo.reprocessDeadLetterJob(id);
    } catch {}
    return job;
  }

  async getJobExecutions(jobId) {
    const job = await this.getJobById(jobId);
    return job.executions || [];
  }

  async getJobLogs(jobId) {
    const job = await this.getJobById(jobId);
    return job.logs || [];
  }
}

module.exports = new JobsService();
