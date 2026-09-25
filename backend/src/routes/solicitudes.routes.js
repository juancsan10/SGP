// NUEVO — Solicitudes de Instructores y Aprendices al Administrador.
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/solicitudes.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam } = require('../validators/common.validators');

router.get('/tipos',        verifyToken, ctrl.tipos);
router.get('/mias',         verifyToken, requireRole('Instructor', 'Aprendiz'), ctrl.mias);
router.get('/',             verifyToken, requireRole('Administrador'), ctrl.getAll);
router.post('/',            verifyToken, requireRole('Instructor', 'Aprendiz'), ctrl.create);
router.put('/:id/resolver', verifyToken, requireRole('Administrador'), [idParam('id')], validate, ctrl.resolver);

module.exports = router;
