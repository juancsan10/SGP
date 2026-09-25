const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificaciones.controller');
const { verifyToken, requireSelfOrAdmin, requireNotificationOwner, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam } = require('../validators/common.validators');

// NUEVO — solo Administrador: crear notificaciones dirigidas a un usuario o a un rol completo.
router.post('/broadcast', verifyToken, requireRole('Administrador'), ctrl.broadcast);
// NUEVO — solo Administrador: ver las notificaciones que él mismo ha
// creado. Registrada ANTES de '/:id_usuario' para que 'enviadas' no se
// interprete como un id de usuario (mismo forma de un solo segmento).
router.get('/enviadas', verifyToken, requireRole('Administrador'), ctrl.getEnviadas);

router.get('/:id_usuario', verifyToken, requireSelfOrAdmin('id_usuario'), [idParam('id_usuario')], validate, ctrl.getByUsuario);
router.put('/leer-todas/:id_usuario', verifyToken, requireSelfOrAdmin('id_usuario'), [idParam('id_usuario')], validate, ctrl.marcarTodasLeidas);
router.put('/:id', verifyToken, requireNotificationOwner, [idParam('id')], validate, ctrl.marcarLeida);

module.exports = router;
