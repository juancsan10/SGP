const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/proyectos.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.post('/',     verifyToken, requireRole('Instructor','Administrador'), ctrl.create);
router.get('/',      verifyToken, ctrl.getAll);
router.get('/:id',   verifyToken, ctrl.getById);
router.put('/:id',   verifyToken, ctrl.update);
router.delete('/:id',verifyToken, requireRole('Instructor','Administrador'), ctrl.remove);

module.exports = router;
