const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/githubIntegration.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, ctrl.create);
router.get('/:id_usuario',    verifyToken, ctrl.getByUsuario);
router.put('/',               verifyToken, ctrl.update);
router.delete('/',            verifyToken, ctrl.remove);

module.exports = router;
