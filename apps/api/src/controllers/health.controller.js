const healthService = require('../services/health.service');
const { sendSuccess } = require('../utils/response');

class HealthController {
  async getHealth(req, res, next) {
    try {
      const result = await healthService.checkHealth();
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HealthController();
