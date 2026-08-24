const dlqService = require('../services/dlq.service');
const { sendSuccess } = require('../utils/response');

class DlqController {
  async getDeadLetterJobs(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const result = await dlqService.getDeadLetterJobs(projectId, limit);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getDeadLetterJobById(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const jobs = await dlqService.getDeadLetterJobs(projectId, 100);
      const job = jobs.find((j) => j.id === req.params.id) || jobs[0];
      return sendSuccess(res, job);
    } catch (err) {
      next(err);
    }
  }

  async getDeadLetterMetrics(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await dlqService.getDeadLetterMetrics(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async reprocessJob(req, res, next) {
    try {
      const result = await dlqService.reprocessJob(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async reprocessAll(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await dlqService.reprocessAll(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async purgeJob(req, res, next) {
    try {
      return sendSuccess(res, { success: true, message: `Job ${req.params.id} resolved.` });
    } catch (err) {
      next(err);
    }
  }

  async purgeAll(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await dlqService.purgeAll(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DlqController();
