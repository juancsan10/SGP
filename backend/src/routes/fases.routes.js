const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fases.controller');
const { verifyToken, requireProjectMember, requireProjectManager } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, requiredText, optionalText, requiredDate, optionalDate, progress } = require('../validators/common.validators');

router.post('/', verifyToken, requireProjectManager('project-direct'), [
  requiredText('nombre_fase', 100),
  optionalText('descripcion', 5000),
  optionalDate('fecha_inicio'),
  optionalDate('fecha_fin'),
  idBody('id_proyecto')
], validate, ctrl.create);
router.get('/:id_proyecto', verifyToken, requireProjectMember('project-direct'), [idParam('id_proyecto')], validate, ctrl.getByProyecto);
router.put('/:id', verifyToken, requireProjectManager('phase'), [
  idParam('id'),
  optionalText('nombre_fase', 100),
  optionalText('descripcion', 5000),
  optionalDate('fecha_inicio'),
  optionalDate('fecha_fin'),
  progress
], validate, ctrl.update);
router.delete('/:id', verifyToken, requireProjectManager('phase'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
