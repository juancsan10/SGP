const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tareas.controller');
const { verifyToken, requireProjectMember, requireProjectManager, requireTaskEditor, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, requiredText, optionalText, requiredDate, optionalDate, progress } = require('../validators/common.validators');

router.post('/', verifyToken, requireProjectManager('project-direct'), [
  requiredText('titulo', 150),
  optionalText('descripcion', 5000),
  optionalDate('fecha_inicio'),
  optionalDate('fecha_vencimiento'),
  optionalText('prioridad', 50),
  idBody('id_proyecto'),
  idBody('id_asignado')
], validate, ctrl.create);
router.get('/:id_proyecto', verifyToken, requireProjectMember('project-direct'), [idParam('id_proyecto')], validate, ctrl.getByProyecto);
router.put('/:id', verifyToken, requireTaskEditor, [
  idParam('id'),
  optionalText('titulo', 150),
  optionalText('descripcion', 5000),
  optionalDate('fecha_inicio'),
  optionalDate('fecha_vencimiento'),
  optionalText('estado', 50),
  optionalText('prioridad', 50),
  progress
], validate, ctrl.update);
router.delete('/:id', verifyToken, requireRole('Instructor','Administrador'), requireProjectManager('task'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
