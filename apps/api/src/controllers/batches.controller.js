const batchesService = require('../services/batches.service');
const { sendSuccess } = require('../utils/response');

class BatchesController {
  async getBatchesByProject(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await batchesService.getBatchesByProject(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req, res, next) {
    try {
      const result = await batchesService.getBatchById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await batchesService.createBatch({ ...req.body, projectId });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async cancelBatch(req, res, next) {
    try {
      const result = await batchesService.cancelBatch(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BatchesController();
