const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entregables.controller');
const { verifyToken, requireProjectMember, requireProjectManager, requireInstructorOwner } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, requiredText, optionalText, requiredDate, optionalDate } = require('../validators/common.validators');

router.post('/', verifyToken, requireInstructorOwner('phase'), [
  requiredText('nombre', 150),
  optionalText('descripcion', 5000),
  requiredDate('fecha_entrega'),
  optionalText('url_drive', 255),
  optionalText('version', 50),
  idBody('id_fase')
], validate, ctrl.create);
router.get('/:id_fase', verifyToken, requireProjectMember('phase'), [idParam('id_fase')], validate, ctrl.getByFase);
router.put('/:id', verifyToken, requireProjectManager('deliverable'), [
  idParam('id'),
  optionalText('nombre', 150),
  optionalText('descripcion', 5000),
  optionalDate('fecha_entrega'),
  optionalDate('fecha_entregado'),
  optionalText('estado', 50),
  optionalText('url_drive', 255),
  optionalText('version', 50)
], validate, ctrl.update);
router.delete('/:id', verifyToken, requireProjectManager('deliverable'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
