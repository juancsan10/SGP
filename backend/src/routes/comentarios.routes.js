const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comentarios.controller');
const { verifyToken, requireProjectMember, denyAdmin } = require('../middlewares/auth.middleware');

router.post('/',                verifyToken, denyAdmin('comentar'), requireProjectMember('deliverable'), ctrl.create);
router.get('/:id_entregable',   verifyToken, requireProjectMember('deliverable'), ctrl.getByEntregable);
router.put('/:id',              verifyToken, denyAdmin('editar comentarios'), requireProjectMember('comment'), ctrl.update);
router.delete('/:id',           verifyToken, denyAdmin('borrar comentarios'), requireProjectMember('comment'), ctrl.remove);

module.exports = router;
