const investigatorService = require('../services/investigator.service');
const { sendSuccess } = require('../utils/response');

class InvestigatorController {
  async analyzeJobFailure(req, res, next) {
    try {
      const jobId = req.params.jobId || req.body.jobId || req.query.jobId;
      const result = await investigatorService.analyzeJobFailure(jobId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InvestigatorController();
