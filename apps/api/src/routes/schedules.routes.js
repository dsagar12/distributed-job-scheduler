const { Router } = require('express');
const schedulesController = require('../controllers/schedules.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', schedulesController.getSchedulesByProject);
router.post('/', schedulesController.createSchedule);
router.get('/:id', schedulesController.getScheduleById);

router.post('/:id/pause', schedulesController.pauseSchedule);
router.patch('/:id/pause', schedulesController.pauseSchedule);
router.put('/:id/pause', schedulesController.pauseSchedule);

router.post('/:id/resume', schedulesController.resumeSchedule);
router.patch('/:id/resume', schedulesController.resumeSchedule);
router.put('/:id/resume', schedulesController.resumeSchedule);

router.post('/:id/trigger', schedulesController.triggerImmediately);
router.delete('/:id', schedulesController.deleteSchedule);

module.exports = router;
