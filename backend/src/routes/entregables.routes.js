const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entregables.controller');
const { verifyToken, requireProjectMember } = require('../middlewares/auth.middleware');

router.post('/',        verifyToken, requireProjectMember('phase'), ctrl.create);
router.get('/:id_fase', verifyToken, requireProjectMember('phase'), ctrl.getByFase);
router.put('/:id',      verifyToken, requireProjectMember('deliverable'), ctrl.update);
router.delete('/:id',   verifyToken, requireProjectMember('deliverable'), ctrl.remove);

module.exports = router;
