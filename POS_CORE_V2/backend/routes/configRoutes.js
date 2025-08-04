const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const isAuthenticated = require('../middleware/isAuthenticated');
const checkRole = require('../middleware/authRole');

router.get('/config', isAuthenticated, checkRole('administrador'), configController.getConfig);
router.post('/config', isAuthenticated, checkRole('administrador'), configController.saveConfig);

module.exports = router;
