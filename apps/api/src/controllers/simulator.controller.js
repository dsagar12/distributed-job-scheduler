const simulatorService = require('../services/simulator.service');
const { sendSuccess } = require('../utils/response');

class SimulatorController {
  async injectLoadBurst(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await simulatorService.injectLoadBurst({ ...req.body, projectId });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getQueueTelemetry(req, res, next) {
    try {
      const queueId = req.params.queueId || req.query.queueId;
      const result = await simulatorService.getQueueTelemetry(queueId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SimulatorController();
