const { Router } = require('express');
const batchesController = require('../controllers/batches.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', batchesController.getBatchesByProject);
router.post('/', batchesController.createBatch);
router.get('/:id', batchesController.getBatchById);
router.post('/:id/cancel', batchesController.cancelBatch);

module.exports = router;
