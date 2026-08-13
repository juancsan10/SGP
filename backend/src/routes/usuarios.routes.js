const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarios.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

router.get('/',     verifyToken, requireRole('Administrador','Instructor'), ctrl.getAll);
router.get('/:id',  verifyToken, ctrl.getById);
router.put('/:id',  verifyToken, ctrl.update);
router.delete('/:id', verifyToken, requireRole('Administrador'), ctrl.remove);

module.exports = router;
