const schedulesService = require('../services/schedules.service');
const { sendSuccess } = require('../utils/response');

class SchedulesController {
  async getSchedulesByProject(req, res, next) {
    try {
      const projectId = req.query.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await schedulesService.getSchedulesByProject(projectId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(req, res, next) {
    try {
      const result = await schedulesService.getScheduleById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createSchedule(req, res, next) {
    try {
      const projectId = req.body.projectId || req.headers['x-project-id'] || '33333333-3333-3333-3333-333333333333';
      const result = await schedulesService.createSchedule({ ...req.body, projectId });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async pauseSchedule(req, res, next) {
    try {
      const result = await schedulesService.setPaused(req.params.id, true);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async resumeSchedule(req, res, next) {
    try {
      const result = await schedulesService.setPaused(req.params.id, false);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async triggerImmediately(req, res, next) {
    try {
      const result = await schedulesService.triggerImmediately(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async deleteSchedule(req, res, next) {
    try {
      const result = await schedulesService.deleteSchedule(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SchedulesController();
