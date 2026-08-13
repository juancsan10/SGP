const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificaciones.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/:id_usuario',              verifyToken, ctrl.getByUsuario);
router.put('/leer-todas/:id_usuario',   verifyToken, ctrl.marcarTodasLeidas);
router.put('/:id',                      verifyToken, ctrl.marcarLeida);

module.exports = router;
