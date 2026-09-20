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

// Login: mismo límite (5 por 15 min) pero solo cuenta los intentos FALLIDOS.
// Antes compartía el contador con la recuperación de contraseña y también
// contaba los ingresos correctos, así que bastaban 5 inicios de sesión
// legítimos (p. ej. probar los 3 roles de la demo) para bloquear el acceso.
const loginLimiter=rateLimit({
  windowMs:15*60*1000,
  max:5,
  skipSuccessfulRequests:true,
  standardHeaders:true,
  legacyHeaders:false,
  message:{success:false,message:'Demasiados intentos. Intenta nuevamente en 15 minutos.'}
});

router.post('/login',loginLimiter,loginValidators,validate,ctrl.login);
router.post('/register',registerValidators,validate,ctrl.register);
router.post('/password-reset/request',authLimiter,resetRequestValidators,validate,ctrl.requestPasswordReset);
router.post('/password-reset/confirm',resetConfirmValidators,validate,ctrl.resetPassword);
router.post('/users',verifyToken,requireRole('Administrador'),adminUserValidators,validate,ctrl.createUserByAdmin);
module.exports=router;
