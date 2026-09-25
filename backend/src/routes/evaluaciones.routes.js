const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/evaluaciones.controller');
const { verifyToken, requireRole, requireProjectMember } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody } = require('../validators/common.validators');
const { body } = require('express-validator');

const score = body('calificacion').isFloat({ min: 0, max: 100 }).withMessage('calificacion debe estar entre 0 y 100').toFloat();

// El Administrador no califica: solo el instructor responsable del proyecto.
router.post('/', verifyToken, requireRole('Instructor'), requireProjectMember('deliverable'), [
  idBody('id_entregable'), score
], validate, ctrl.create);
router.get('/:id_entregable', verifyToken, requireProjectMember('deliverable'), [idParam('id_entregable')], validate, ctrl.getByEntregable);
router.put('/:id', verifyToken, requireRole('Instructor'), requireProjectMember('evaluation'), [
  idParam('id'), score
], validate, ctrl.update);

module.exports = router;
