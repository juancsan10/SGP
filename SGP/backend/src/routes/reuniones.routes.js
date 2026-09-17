const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reuniones.controller');
const { verifyToken, requireRole, requireProjectMember } = require('../middlewares/auth.middleware');

// Solo Instructor/Administrador programan reuniones
router.post('/',              verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('project-direct'), ctrl.create);
router.get('/:id_proyecto',   verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);
router.put('/:id',            verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('meeting'), ctrl.update);
router.delete('/:id',         verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('meeting'), ctrl.remove);

module.exports = router;
