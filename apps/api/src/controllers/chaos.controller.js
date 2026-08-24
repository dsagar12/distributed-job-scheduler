const chaosService = require('../services/chaos.service');
const { sendSuccess } = require('../utils/response');

class ChaosController {
  async simulateLeaseExpiry(req, res, next) {
    try {
      const jobId = req.params.jobId || req.body.jobId;
      const result = await chaosService.simulateLeaseExpiry(jobId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async simulateWorkerKill(req, res, next) {
    try {
      const workerId = req.params.workerId || req.body.workerId;
      const result = await chaosService.simulateWorkerKill(workerId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async forceJobFailure(req, res, next) {
    try {
      const jobId = req.params.jobId || req.body.jobId;
      const reason = req.body.reason;
      const result = await chaosService.forceJobFailure(jobId, reason);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async triggerRecoverySweep(req, res, next) {
    try {
      const result = await chaosService.triggerRecoverySweep();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getTimeline(req, res, next) {
    try {
      const result = chaosService.getTimeline();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChaosController();
