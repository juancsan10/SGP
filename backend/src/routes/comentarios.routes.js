const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/comentarios.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',                verifyToken, requireProjectMember('deliverable'), ctrl.create);
router.get('/:id_entregable',   verifyToken, requireProjectMember('deliverable'), ctrl.getByEntregable);
router.put('/:id',              verifyToken, requireProjectMember('comment'), ctrl.update);
router.delete('/:id',           verifyToken, requireProjectMember('comment'), ctrl.remove);

module.exports = router;
