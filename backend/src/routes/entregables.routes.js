const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entregables.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',        verifyToken, ctrl.create);
router.get('/:id_fase', verifyToken, ctrl.getByFase);
router.put('/:id',      verifyToken, ctrl.update);
router.delete('/:id',   verifyToken, ctrl.remove);

module.exports = router;
