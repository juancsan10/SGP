const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comentarios.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, limitedText } = require('../validators/common.validators');

// NUEVO: mismo criterio de límite de palabras/caracteres que en mensajes.routes.js
// (RN-015 — retroalimentación de entregables), para que el campo "contenido"
// no acepte textos de longitud arbitraria en ninguna de las 3 vistas.
router.post('/', verifyToken, requireProjectMember('deliverable'), [
  limitedText('contenido', { maxChars: 2000, maxWords: 300 }),
  idBody('id_entregable'),
], validate, ctrl.create);

router.get('/:id_entregable', verifyToken, requireProjectMember('deliverable'), [idParam('id_entregable')], validate, ctrl.getByEntregable);

router.put('/:id', verifyToken, requireProjectMember('comment'), [
  idParam('id'),
  limitedText('contenido', { maxChars: 2000, maxWords: 300 }),
], validate, ctrl.update);

router.delete('/:id', verifyToken, requireProjectMember('comment'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
