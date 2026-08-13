const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/repositorios.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, ctrl.create);
router.get('/:id_proyecto',   verifyToken, ctrl.getByProyecto);
router.put('/:id',            verifyToken, ctrl.update);

module.exports = router;
