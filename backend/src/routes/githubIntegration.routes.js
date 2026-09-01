const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/githubIntegration.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/',              verifyToken, ctrl.create);
router.get('/:id_usuario',    verifyToken, (req,res,next)=>{ if(req.user.rol==='Administrador'||req.user.id===Number(req.params.id_usuario)) return next(); return res.status(403).json({success:false,message:'No puedes consultar esta integración'}); }, ctrl.getByUsuario);
router.put('/',               verifyToken, ctrl.update);
router.delete('/',            verifyToken, ctrl.remove);

module.exports = router;
