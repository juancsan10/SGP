const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mensajes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, ctrl.create);
router.get('/:id_proyecto',   verifyToken, ctrl.getByProyecto);

module.exports = router;
