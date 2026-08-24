const metricsService = require('../services/metrics.service');
const { sendSuccess } = require('../utils/response');

class MetricsController {
  async getOverview(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await metricsService.getOverview(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getTimeline(req, res, next) {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours, 10) : 24;
      const result = await metricsService.getTimeline(hours);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getQueuesSummary(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await metricsService.getQueuesSummary(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MetricsController();
