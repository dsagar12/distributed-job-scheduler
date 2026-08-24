const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req.body.refreshToken);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const userId = req.user?.userId;
      const result = await authService.getProfile(userId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
