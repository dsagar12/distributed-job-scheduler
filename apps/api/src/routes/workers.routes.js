const { Router } = require('express');
const workersController = require('../controllers/workers.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', workersController.getAllWorkers);
router.get('/:id', workersController.getWorkerById);

module.exports = router;
