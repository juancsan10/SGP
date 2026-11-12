// NUEVO — Solicitudes de Instructores y Aprendices al Administrador.
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/solicitudes.controller');
const aprendices = require('../controllers/solicitudes-aprendiz.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam } = require('../validators/common.validators');

// NUEVO (punto 10, #19): el Instructor solicita crear un aprendiz; el Administrador decide.
router.post('/aprendices',             verifyToken, requireRole('Instructor'), aprendices.create);
router.get('/aprendices/mias',         verifyToken, requireRole('Instructor'), aprendices.mias);
router.get('/aprendices',              verifyToken, requireRole('Administrador'), aprendices.getAll);
router.put('/aprendices/:id/resolver', verifyToken, requireRole('Administrador'), [idParam('id')], validate, aprendices.resolver);

router.get('/tipos',        verifyToken, ctrl.tipos);
router.get('/mias',         verifyToken, requireRole('Instructor', 'Aprendiz'), ctrl.mias);
router.get('/',             verifyToken, requireRole('Administrador'), ctrl.getAll);
router.post('/',            verifyToken, requireRole('Instructor', 'Aprendiz'), ctrl.create);
router.put('/:id/resolver', verifyToken, requireRole('Administrador'), [idParam('id')], validate, ctrl.resolver);

module.exports = router;
