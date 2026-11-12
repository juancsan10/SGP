// NUEVO (punto 4, #19): catálogo de roles de equipo con color.
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roles-equipo.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam } = require('../validators/common.validators');

router.get('/',       verifyToken, requireRole('Instructor', 'Administrador'), ctrl.getAll);
router.post('/',      verifyToken, requireRole('Instructor'), ctrl.create);
router.put('/:id',    verifyToken, requireRole('Instructor'), [idParam('id')], validate, ctrl.update);
router.delete('/:id', verifyToken, requireRole('Instructor'), [idParam('id')], validate, ctrl.remove);

module.exports = router;
