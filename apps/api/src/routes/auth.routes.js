const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/me', authenticateJwt, authController.me);

module.exports = router;
