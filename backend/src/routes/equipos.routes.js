const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipos.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',                       verifyToken, ctrl.create);
router.get('/:id_proyecto',            verifyToken, ctrl.getByProyecto);
router.delete('/:id',                  verifyToken, ctrl.remove);

module.exports = router;
