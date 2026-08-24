const { Router } = require('express');
const metricsController = require('../controllers/metrics.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/overview', metricsController.getOverview);
router.get('/timeline', metricsController.getTimeline);
router.get('/queues', metricsController.getQueuesSummary);

module.exports = router;
