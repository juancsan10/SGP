const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/archivos.controller');
const { verifyToken, requireProjectMember, requireProjectManager, denyAdmin } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, requiredText } = require('../validators/common.validators');
const { upload } = require('../middlewares/upload.middleware');

router.post('/', verifyToken, denyAdmin('adjuntar archivos'), requireProjectMember('deliverable'), [
  requiredText('nombre_archivo', 255),
  requiredText('ruta_archivo', 500),
  idBody('id_entregable')
], validate, ctrl.create);
// NUEVO: subida real del binario. requireProjectMember corre ANTES que
// multer (upload.single) a propósito: así, si el usuario no pertenece al
// proyecto del entregable, la petición se rechaza con 403 sin llegar a
// escribir ningún archivo en disco.
router.post('/upload/:id', verifyToken, denyAdmin('adjuntar archivos'), requireProjectMember('deliverable'), upload.single('archivo'), [idParam('id')], validate, ctrl.uploadFile);
router.get('/:id_entregable', verifyToken, requireProjectMember('deliverable'), [idParam('id_entregable')], validate, ctrl.getByEntregable);
router.delete('/:id', verifyToken, denyAdmin('eliminar archivos'), requireProjectManager('file'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
