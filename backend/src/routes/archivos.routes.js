const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/archivos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',                verifyToken, ctrl.create);
router.get('/:id_entregable',   verifyToken, ctrl.getByEntregable);
router.delete('/:id',           verifyToken, ctrl.remove);

module.exports = router;
