const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tareas.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, ctrl.create);
router.get('/:id_proyecto',   verifyToken, ctrl.getByProyecto);
router.put('/:id',            verifyToken, ctrl.update);
router.delete('/:id',         verifyToken, ctrl.remove);

module.exports = router;
