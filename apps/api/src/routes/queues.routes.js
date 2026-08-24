const { Router } = require('express');
const queuesController = require('../controllers/queues.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', queuesController.getQueuesByProject);
router.post('/', queuesController.createQueue);
router.get('/:id', queuesController.getQueueById);
router.put('/:id', queuesController.updateQueue);
router.patch('/:id', queuesController.updateQueue);

router.post('/:id/pause', queuesController.pauseQueue);
router.patch('/:id/pause', queuesController.pauseQueue);
router.put('/:id/pause', queuesController.pauseQueue);

router.post('/:id/resume', queuesController.resumeQueue);
router.patch('/:id/resume', queuesController.resumeQueue);
router.put('/:id/resume', queuesController.resumeQueue);

router.delete('/:id', queuesController.deleteQueue);
router.get('/:id/metrics', queuesController.getQueueMetrics);

module.exports = router;
