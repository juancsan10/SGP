const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipos.controller');
const { verifyToken, requireProjectMember, requireProjectManager, requireInstructorOwner, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, optionalText } = require('../validators/common.validators');

router.post('/', verifyToken, requireInstructorOwner('project-direct'), [
  idBody('id_proyecto'),
  idBody('id_usuario'),
  optionalText('rol_en_equipo', 100)
], validate, ctrl.create);
router.get('/:id_proyecto', verifyToken, requireProjectMember('project-direct'), [idParam('id_proyecto')], validate, ctrl.getByProyecto);

// NUEVO — Administrador: gestión de solicitudes de eliminación de equipo.
// Registradas ANTES de '/:id' para que 'solicitudes' no se interprete como un id_proyecto.
router.get('/solicitudes/listar',      verifyToken, requireRole('Administrador'), ctrl.listSolicitudes);
router.put('/solicitudes/:id/resolver', verifyToken, requireRole('Administrador'), [idParam('id')], validate, ctrl.resolverSolicitud);

// NUEVO (punto 4): cambiar el rol y el color de un miembro (solo el instructor responsable).
router.put('/:id/rol', verifyToken, requireInstructorOwner('team'), [idParam('id'), optionalText('rol_en_equipo', 100)], validate, ctrl.updateRol);
router.delete('/:id', verifyToken, requireProjectManager('team'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
