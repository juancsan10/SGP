const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const ctrl = require('../controllers/mensajes.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, limitedText } = require('../validators/common.validators');

// NUEVO — RN-021 (límite de mensajes): un usuario no puede enviar más de
// 10 mensajes por minuto. Antes esta ruta no tenía ni validación de
// contenido ni límite de envíos, así que se podía spamear el chat del
// proyecto con textos de cualquier tamaño.
const mensajeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  message: { success: false, message: 'Has enviado demasiados mensajes. Espera un momento antes de enviar otro.' },
});

// NUEVO: límite de 300 palabras / 1500 caracteres por mensaje (mismo límite
// aplicado en el frontend, en las 3 vistas — Administrador, Instructor y
// Aprendiz comparten esta misma pestaña "Mensajes").
router.post('/', verifyToken, mensajeLimiter, requireProjectMember('project-direct'), [
  limitedText('contenido', { maxChars: 1500, maxWords: 300 }),
  idBody('id_proyecto'),
], validate, ctrl.create);

router.get('/:id_proyecto', verifyToken, requireProjectMember('project-direct'), [idParam('id_proyecto')], validate, ctrl.getByProyecto);

module.exports = router;
