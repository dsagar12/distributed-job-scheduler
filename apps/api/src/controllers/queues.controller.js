const queuesService = require('../services/queues.service');
const { sendSuccess } = require('../utils/response');

class QueuesController {
  async getQueuesByProject(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await queuesService.getQueuesByProject(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getQueueById(req, res, next) {
    try {
      const result = await queuesService.getQueueById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createQueue(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await queuesService.createQueue({ ...req.body, projectId });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateQueue(req, res, next) {
    try {
      const result = await queuesService.updateQueue(req.params.id, req.body);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async pauseQueue(req, res, next) {
    try {
      const result = await queuesService.setPaused(req.params.id, true);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async resumeQueue(req, res, next) {
    try {
      const result = await queuesService.setPaused(req.params.id, false);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async deleteQueue(req, res, next) {
    try {
      const result = await queuesService.deleteQueue(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getQueueMetrics(req, res, next) {
    try {
      const result = await queuesService.getQueueMetrics(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QueuesController();
