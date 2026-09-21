const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reuniones.controller');
// CORREGIDO: solo el Instructor responsable programa reuniones — el
// Administrador supervisa (GET) pero no crea. Se usa requireInstructorOwner
// en vez de requireRole+requireProjectMember para que quede sin bypass de Admin.
const { verifyToken, requireRole, requireProjectMember, requireInstructorOwner } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, requireInstructorOwner('project-direct'), ctrl.create);
router.get('/:id_proyecto',   verifyToken, requireProjectMember('project-direct'), ctrl.getByProyecto);
router.put('/:id',            verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('meeting'), ctrl.update);
router.delete('/:id',         verifyToken, requireRole('Instructor','Administrador'), requireProjectMember('meeting'), ctrl.remove);

module.exports = router;
