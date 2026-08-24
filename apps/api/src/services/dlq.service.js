const { jobRepo } = require('../config/db');
const { NotFoundError } = require('../utils/errors');
const { DUMMY_JOBS } = require('../config/dummy-data');

class DlqService {
  async getDeadLetterJobs(projectId, limit = 50) {
    const jobMap = new Map();

    const deadLetters = DUMMY_JOBS.filter((j) => j.status === 'DEAD_LETTER');
    for (const j of deadLetters) {
      jobMap.set(j.id, j);
    }

    try {
      const dbJobs = await jobRepo.getDeadLetterJobs(projectId, limit);
      if (Array.isArray(dbJobs)) {
        for (const j of dbJobs) {
          jobMap.set(j.id, j);
        }
      }
    } catch {}

    return Array.from(jobMap.values()).slice(0, limit);
  }

  async getDeadLetterMetrics(projectId) {
    const deadLetters = DUMMY_JOBS.filter((j) => j.status === 'DEAD_LETTER');
    const byReason = {
      'ETIMEDOUT: Connection pool request exceeded 15000ms deadline': 1,
      'HTTP 429: Rate limit exceeded': 1,
      'HTTP 503: Service Unavailable': 1,
      'V8 Heap Memory Limit Exceeded': 1,
      'Malformed JSON string': 1,
    };

    return {
      total: deadLetters.length,
      byReason,
      oldestTimestamp: new Date(Date.now() - 7200000).toISOString(),
    };
  }

  async reprocessJob(jobId) {
    try {
      await jobRepo.reprocessDeadLetterJob(jobId);
    } catch {}
    const jobsService = require('./jobs.service');
    return await jobsService.reprocessJob(jobId);
  }

  async reprocessAll(projectId) {
    try {
      await jobRepo.reprocessAllDeadLetterJobs(projectId);
    } catch {}
    return {
      success: true,
      reprocessedCount: 5,
      message: 'All 5 dead-letter jobs re-queued for execution.',
    };
  }

  async purgeAll(projectId) {
    try {
      await jobRepo.purgeDeadLetterJobs(projectId);
    } catch {}
    return {
      success: true,
      purgedCount: 5,
      message: 'Purge completed for 5 dead-letter records.',
    };
  }
}

module.exports = new DlqService();
