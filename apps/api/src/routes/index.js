const { Router } = require('express');

const authRoutes = require('./auth.routes');
const queuesRoutes = require('./queues.routes');
const jobsRoutes = require('./jobs.routes');
const workersRoutes = require('./workers.routes');
const metricsRoutes = require('./metrics.routes');
const schedulesRoutes = require('./schedules.routes');
const batchesRoutes = require('./batches.routes');
const dlqRoutes = require('./dlq.routes');
const chaosRoutes = require('./chaos.routes');
const investigatorRoutes = require('./investigator.routes');
const simulatorRoutes = require('./simulator.routes');
const projectsRoutes = require('./projects.routes');
const organizationsRoutes = require('./organizations.routes');
const healthRoutes = require('./health.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/queues', queuesRoutes);
router.use('/jobs', jobsRoutes);
router.use('/workers', workersRoutes);
router.use('/metrics', metricsRoutes);
router.use('/schedules', schedulesRoutes);
router.use('/batches', batchesRoutes);
router.use('/dlq', dlqRoutes);
router.use('/chaos', chaosRoutes);
router.use('/investigator', investigatorRoutes);
router.use('/simulator', simulatorRoutes);
router.use('/projects', projectsRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/health', healthRoutes);

module.exports = router;
