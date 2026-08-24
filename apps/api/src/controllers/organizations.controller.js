const organizationsService = require('../services/organizations.service');
const { sendSuccess } = require('../utils/response');

class OrganizationsController {
  async getOrganizations(req, res, next) {
    try {
      const userId = req.user?.userId || 'usr_admin_default';
      const result = await organizationsService.getOrganizationsByUser(userId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getOrgById(req, res, next) {
    try {
      const result = await organizationsService.getOrgById(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createOrganization(req, res, next) {
    try {
      const userId = req.user?.userId || 'usr_admin_default';
      const result = await organizationsService.createOrganization(userId, req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrganizationsController();
