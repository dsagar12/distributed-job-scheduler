const { Router } = require('express');
const investigatorController = require('../controllers/investigator.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/jobs/:jobId/analyze', investigatorController.analyzeJobFailure);
router.post('/analyze', investigatorController.analyzeJobFailure);
router.get('/analyze', investigatorController.analyzeJobFailure);

module.exports = router;
