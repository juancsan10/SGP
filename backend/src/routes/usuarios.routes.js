const express=require('express'); const router=express.Router();
const ctrl=require('../controllers/usuarios.controller');
const {verifyToken,requireRole,requireSelfOrAdmin}=require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, optionalText, pagination } = require('../validators/common.validators');
const { body } = require('express-validator');

const profileValidators = [
  optionalText('nombres', 100),
  optionalText('apellidos', 100),
  optionalText('ficha', 50),
  optionalText('programa_formacion', 150)
];

const passwordValidators = [
  body('actual').isString().isLength({ min: 8, max: 128 }).withMessage('actual debe tener entre 8 y 128 caracteres'),
  body('nueva').isString().isLength({ min: 8, max: 128 }).withMessage('nueva debe tener entre 8 y 128 caracteres')
];

router.get('/',verifyToken,requireRole('Administrador','Instructor'),pagination,validate,ctrl.getAll);
router.get('/aprendices/buscar',verifyToken,requireRole('Administrador','Instructor'),ctrl.searchAprendizByIdentificacion);
router.get('/:id',verifyToken,requireSelfOrAdmin,[idParam('id')],validate,ctrl.getById);
router.put('/:id',verifyToken,requireSelfOrAdmin,[idParam('id'),...profileValidators],validate,ctrl.update);
router.put('/:id/password',verifyToken,requireSelfOrAdmin,[idParam('id'),...passwordValidators],validate,ctrl.changePassword);
router.delete('/:id',verifyToken,requireRole('Administrador'),[idParam('id')],validate,ctrl.remove);
module.exports=router;
