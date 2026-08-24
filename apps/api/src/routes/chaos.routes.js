const { Router } = require('express');
const chaosController = require('../controllers/chaos.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.post('/jobs/:jobId/expire-lease', chaosController.simulateLeaseExpiry);
router.post('/expire-lease', chaosController.simulateLeaseExpiry);

router.post('/workers/:workerId/kill', chaosController.simulateWorkerKill);
router.post('/kill-worker', chaosController.simulateWorkerKill);

router.post('/jobs/:jobId/force-failure', chaosController.forceJobFailure);
router.post('/fail-job', chaosController.forceJobFailure);

router.post('/recover-leases', chaosController.triggerRecoverySweep);
router.post('/trigger-sweeper', chaosController.triggerRecoverySweep);

router.get('/timeline', chaosController.getTimeline);

module.exports = router;
