const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/archivos.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',                verifyToken, requireProjectMember('deliverable'), ctrl.create);
router.get('/:id_entregable',   verifyToken, requireProjectMember('deliverable'), ctrl.getByEntregable);
router.delete('/:id',           verifyToken, requireProjectMember('file'), ctrl.remove);

module.exports = router;
