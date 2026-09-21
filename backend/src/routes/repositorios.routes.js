const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/repositorios.controller');
const { verifyToken, requireProjectMember, requireProjectManager, requireInstructorOwner, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, idBody, optionalText } = require('../validators/common.validators');
const { body } = require('express-validator');

const githubUrl = body('url_github').optional().isURL({ protocols: ['http','https'], require_protocol: true }).withMessage('url_github debe ser una URL http/https válida').isLength({ max: 255 }).withMessage('url_github no puede superar 255 caracteres');

router.post('/', verifyToken, requireInstructorOwner('project-direct'), [
  githubUrl, idBody('id_proyecto'), optionalText('rama_principal', 100)
], validate, ctrl.create);
router.get('/:id_proyecto', verifyToken, requireProjectMember('project-direct'), [idParam('id_proyecto')], validate, ctrl.getByProyecto);
router.put('/:id', verifyToken, requireProjectManager('repository'), [
  idParam('id'), githubUrl, optionalText('rama_principal', 100)
], validate, ctrl.update);

// NUEVO — solo Administrador: habilitar/deshabilitar y semáforo de cumplimiento.
router.put('/:id/estado',    verifyToken, requireRole('Administrador'), [idParam('id')], validate, ctrl.toggleEstado);
router.put('/:id/semaforo',  verifyToken, requireRole('Administrador'), [idParam('id')], validate, ctrl.setSemaforo);

module.exports = router;
