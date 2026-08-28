const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reuniones.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Solo Instructor/Administrador programan reuniones
router.post('/',              verifyToken, requireRole('Instructor','Administrador'), ctrl.create);
router.get('/:id_proyecto',   verifyToken, ctrl.getByProyecto);
router.put('/:id',            verifyToken, requireRole('Instructor','Administrador'), ctrl.update);
router.delete('/:id',         verifyToken, requireRole('Instructor','Administrador'), ctrl.remove);

module.exports = router;
