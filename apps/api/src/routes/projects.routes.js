const { Router } = require('express');
const projectsController = require('../controllers/projects.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', projectsController.getProjectsByOrg);
router.post('/', projectsController.createProject);
router.get('/:id', projectsController.getProjectById);
router.post('/:id/rotate-key', projectsController.rotateApiKey);
router.post('/:id/regenerate-key', projectsController.rotateApiKey);

module.exports = router;
