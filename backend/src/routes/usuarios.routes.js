const express=require('express'); const router=express.Router();
const ctrl=require('../controllers/usuarios.controller');
const {verifyToken,requireRole,requireSelfOrAdmin}=require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, optionalText, pagination } = require('../validators/common.validators');
const { body } = require('express-validator');
const { upload } = require('../middlewares/upload.middleware');

const profileValidators = [
  optionalText('nombres', 100),
  optionalText('apellidos', 100),
  optionalText('ficha', 50),
  optionalText('programa_formacion', 150),
  optionalText('correo', 150),          // solo Administrador (se valida en el controlador)
  optionalText('identificacion', 30)    // solo Administrador (se valida en el controlador)
];

const passwordValidators = [
  body('actual').isString().isLength({ min: 8, max: 128 }).withMessage('actual debe tener entre 8 y 128 caracteres'),
  body('nueva').isString().isLength({ min: 8, max: 128 }).withMessage('nueva debe tener entre 8 y 128 caracteres')
];

router.get('/',verifyToken,requireRole('Administrador','Instructor'),pagination,validate,ctrl.getAll);
// CORREGIDO: la ruta ya no es "/aprendices/buscar" — ahora busca en
// cualquier rol (Aprendiz, Instructor, Administrador), opcionalmente
// filtrado con ?rol=.
router.get('/buscar',verifyToken,requireRole('Administrador','Instructor'),ctrl.buscarPorIdentificacion);
router.get('/:id',verifyToken,requireSelfOrAdmin(),[idParam('id')],validate,ctrl.getById);
router.put('/:id',verifyToken,requireSelfOrAdmin(),[idParam('id'),...profileValidators],validate,ctrl.update);
router.put('/:id/password',verifyToken,requireSelfOrAdmin(),[idParam('id'),...passwordValidators],validate,ctrl.changePassword);
// NUEVO — solo Administrador: reactivar y eliminar permanentemente.
router.put('/:id/activar',verifyToken,requireRole('Administrador'),[idParam('id')],validate,ctrl.activar);
// NUEVO: eliminación definitiva SIEMPRE con cuestionario (motivo,
// descripción y archivos de soporte). Reemplaza al antiguo
// DELETE /:id/permanente, que no pedía justificación.
router.get('/:id/impacto-eliminacion',verifyToken,requireRole('Administrador'),[idParam('id')],validate,ctrl.impactoEliminacion);
router.post('/:id/eliminacion',verifyToken,requireRole('Administrador'),upload.array('archivos',5),[idParam('id')],validate,ctrl.eliminarConJustificacion);
router.delete('/:id',verifyToken,requireRole('Administrador'),[idParam('id')],validate,ctrl.remove);
module.exports=router;
