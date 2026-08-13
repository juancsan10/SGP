const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/historial.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/',        verifyToken, requireRole('Administrador'), ctrl.getAll);
router.get('/:tabla',  verifyToken, requireRole('Administrador','Instructor'), ctrl.getByTabla);

module.exports = router;
