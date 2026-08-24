const workersService = require('../services/workers.service');
const { sendSuccess } = require('../utils/response');

class WorkersController {
  async getAllWorkers(req, res, next) {
    try {
      const result = await workersService.getAllWorkers();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getWorkerById(req, res, next) {
    try {
      const result = await workersService.getWorkerById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WorkersController();
