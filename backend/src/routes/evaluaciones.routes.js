const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/evaluaciones.controller');
const { verifyToken, requireRole, requireProjectMember } = require('../middlewares/auth.middleware');

// Solo Instructor/Administrador pueden calificar (RN-016)
router.post('/',                verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('deliverable'), ctrl.create);
router.get('/:id_entregable',   verifyToken, requireProjectMember('deliverable'), ctrl.getByEntregable);
router.put('/:id',              verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('evaluation'), ctrl.update);

module.exports = router;
