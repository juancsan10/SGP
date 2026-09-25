const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/historial.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/',        verifyToken, requireRole('Administrador'), ctrl.getAll);
// NUEVO: registrado ANTES de '/:tabla' para que 'estadisticas' no se
// interprete como el nombre de una tabla.
router.get('/estadisticas/dashboard', verifyToken, requireRole('Administrador'), ctrl.estadisticas);
// NUEVO: justificaciones de usuarios eliminados (cuestionario + adjuntos).
router.get('/eliminaciones',     verifyToken, requireRole('Administrador'), ctrl.getEliminaciones);
router.get('/eliminaciones/:id', verifyToken, requireRole('Administrador'), ctrl.getEliminacion);
router.get('/:tabla',  verifyToken, requireRole('Administrador','Instructor'), ctrl.getByTabla);

module.exports = router;
