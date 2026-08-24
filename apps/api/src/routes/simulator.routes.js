const { Router } = require('express');
const simulatorController = require('../controllers/simulator.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.post('/burst', simulatorController.injectLoadBurst);
router.post('/run', simulatorController.injectLoadBurst);
router.get('/telemetry/:queueId', simulatorController.getQueueTelemetry);
router.get('/telemetry', simulatorController.getQueueTelemetry);

module.exports = router;
