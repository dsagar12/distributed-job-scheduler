const projectsService = require('../services/projects.service');
const { sendSuccess } = require('../utils/response');

class ProjectsController {
  async getProjectsByOrg(req, res, next) {
    try {
      const organizationId = req.query.organizationId || req.params.organizationId || '11111111-1111-1111-1111-111111111111';
      const result = await projectsService.getProjectsByOrg(organizationId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req, res, next) {
    try {
      const result = await projectsService.getProjectById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createProject(req, res, next) {
    try {
      const organizationId = req.body.organizationId || '11111111-1111-1111-1111-111111111111';
      const result = await projectsService.createProject({ ...req.body, organizationId });
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async rotateApiKey(req, res, next) {
    try {
      const result = await projectsService.rotateApiKey(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectsController();
