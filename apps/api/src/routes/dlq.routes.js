const { Router } = require('express');
const dlqController = require('../controllers/dlq.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', dlqController.getDeadLetterJobs);
router.get('/jobs', dlqController.getDeadLetterJobs);
router.get('/metrics', dlqController.getDeadLetterMetrics);
router.get('/:id', dlqController.getDeadLetterJobById);
router.post('/:id/reprocess', dlqController.reprocessJob);
router.post('/jobs/:id/reprocess', dlqController.reprocessJob);
router.post('/reprocess-all', dlqController.reprocessAll);
router.post('/purge-all', dlqController.purgeAll);
router.delete('/:id', dlqController.purgeJob);

module.exports = router;
