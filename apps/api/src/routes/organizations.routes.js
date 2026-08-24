const { Router } = require('express');
const organizationsController = require('../controllers/organizations.controller');
const { authenticateJwt } = require('../middleware/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', organizationsController.getOrganizations);
router.post('/', organizationsController.createOrganization);
router.get('/:id', organizationsController.getOrgById);

module.exports = router;
