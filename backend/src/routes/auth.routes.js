const express=require('express');
const rateLimit=require('express-rate-limit');
const router=express.Router();
const ctrl=require('../controllers/auth.controller');
const {verifyToken,requireRole}=require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { loginValidators, registerValidators, resetRequestValidators, resetConfirmValidators, adminUserValidators } = require('../validators/auth.validators');

const authLimiter=rateLimit({
  windowMs:15*60*1000,
  max:5,
  standardHeaders:true,
  legacyHeaders:false,
  message:{success:false,message:'Demasiados intentos. Intenta nuevamente en 15 minutos.'}
});

router.post('/login',authLimiter,loginValidators,validate,ctrl.login);
router.post('/register',registerValidators,validate,ctrl.register);
router.post('/password-reset/request',authLimiter,resetRequestValidators,validate,ctrl.requestPasswordReset);
router.post('/password-reset/confirm',resetConfirmValidators,validate,ctrl.resetPassword);
router.post('/users',verifyToken,requireRole('Administrador'),adminUserValidators,validate,ctrl.createUserByAdmin);
module.exports=router;
