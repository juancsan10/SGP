const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entregas.controller');
const { verifyToken, requireTaskOwnerOrAdmin, requireTaskDeliveryReview, requireRole } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { idParam, optionalText } = require('../validators/common.validators');
const { upload } = require('../middlewares/upload.middleware');
const entregaBody = [optionalText('comentario_aprendiz',5000), optionalText('url_entrega',500), optionalText('ruta_archivo',500)];

// NUEVO — listado global de supervisión (Administrador/Instructor).
router.get('/', verifyToken, requireRole('Administrador','Instructor'), ctrl.getAllAdmin);

router.get('/tarea/:id',verifyToken,[idParam('id')],validate,ctrl.getByTarea);
router.post('/tarea/:id',verifyToken,requireTaskOwnerOrAdmin,[idParam('id'),...entregaBody],validate,ctrl.submit);
// NUEVO: subida real de un archivo como parte de la entrega. Reutiliza el
// mismo controlador submit() en vez de duplicar su lógica de estados
// (Entregada/Corregida) — solo intercepta el archivo subido por multer y
// lo convierte en el campo ruta_archivo que submit() ya sabe procesar.
// requireTaskOwnerOrAdmin corre ANTES que multer a propósito: si el
// aprendiz no es dueño de la tarea, la petición se rechaza sin escribir
// ningún archivo en disco.
router.post('/tarea/:id/upload', verifyToken, requireTaskOwnerOrAdmin, upload.single('archivo'),
  (req, res, next) => {
    if (req.file) req.body.ruta_archivo = `/uploads/${req.file.filename}`;
    next();
  },
  [idParam('id'), ...entregaBody], validate, ctrl.submit);
router.put('/tarea/:id/revision',verifyToken,requireTaskDeliveryReview,[idParam('id'),optionalText('estado',50),optionalText('observacion_instructor',5000)],validate,ctrl.review);
module.exports=router;
