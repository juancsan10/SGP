const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/archivos.controller');
const { verifyToken, requireProjectMember, requireProjectManager } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, requiredText } = require('../validators/common.validators');

router.post('/', verifyToken, requireProjectMember('deliverable'), [
  requiredText('nombre_archivo', 255),
  requiredText('ruta_archivo', 500),
  idBody('id_entregable')
], validate, ctrl.create);
router.get('/:id_entregable', verifyToken, requireProjectMember('deliverable'), [idParam('id_entregable')], validate, ctrl.getByEntregable);
router.delete('/:id', verifyToken, requireProjectManager('file'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
