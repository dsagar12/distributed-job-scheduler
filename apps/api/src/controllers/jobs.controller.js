const jobsService = require('../services/jobs.service');
const { sendSuccess } = require('../utils/response');

class JobsController {
  async createJob(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await jobsService.createJob({ ...req.body, projectId });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async queryJobs(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await jobsService.queryJobs({ ...req.query, projectId });
      return sendSuccess(res, result.data, 200, result.meta);
    } catch (err) {
      next(err);
    }
  }

  async getJobById(req, res, next) {
    try {
      const result = await jobsService.getJobById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async cancelJob(req, res, next) {
    try {
      const result = await jobsService.cancelJob(req.params.id, req.body);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async reprocessJob(req, res, next) {
    try {
      const result = await jobsService.reprocessJob(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getJobExecutions(req, res, next) {
    try {
      const result = await jobsService.getJobExecutions(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getJobLogs(req, res, next) {
    try {
      const result = await jobsService.getJobLogs(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new JobsController();
