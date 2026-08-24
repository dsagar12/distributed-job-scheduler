const { Router } = require('express');
const jobsController = require('../controllers/jobs.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.post('/', jobsController.createJob);
router.get('/', jobsController.queryJobs);
router.get('/:id', jobsController.getJobById);
router.post('/:id/cancel', jobsController.cancelJob);
router.post('/:id/reprocess', jobsController.reprocessJob);
router.get('/:id/executions', jobsController.getJobExecutions);
router.get('/:id/logs', jobsController.getJobLogs);

module.exports = router;
