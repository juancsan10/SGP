// validators/proyectos.validators.js
//
// ⚠️ ESTE ARCHIVO ESTABA VACÍO — igual que common.validators.js, esto
// tumbaba el servidor completo apenas se intentaba registrar cualquier
// ruta de /proyectos (que es la primera que carga routes/index.js).
//
// Diseño: el primer elemento de updateProjectValidators es idParam('id')
// a propósito. proyectos.routes.js reutiliza
// "updateProjectValidators.slice(0,1)" en las rutas GET/:id y DELETE/:id
// para validar solo el formato del ID sin repetir el arreglo completo.

const { body } = require('express-validator');
const { idParam, idBody, pagination } = require('./common.validators');

const ESTADOS_VALIDOS = ['En Planificación', 'Activo', 'En Revisión', 'Finalizado', 'Cancelado'];

const createProjectValidators = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('nombre es requerido')
    .isLength({ max: 150 })
    .withMessage('nombre no puede superar los 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('descripcion no puede superar los 5000 caracteres'),

  body('fecha_inicio')
    .notEmpty()
    .withMessage('fecha_inicio es requerida')
    .isISO8601()
    .withMessage('fecha_inicio debe ser una fecha válida (YYYY-MM-DD)'),

  body('fecha_fin')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('fecha_fin debe ser una fecha válida (YYYY-MM-DD)'),

  idBody('id_instructor'),
];

// NOTA: idParam('id') va primero a propósito (ver comentario de arriba).
const updateProjectValidators = [
  idParam('id'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('nombre no puede superar los 150 caracteres'),

  body('descripcion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('descripcion no puede superar los 5000 caracteres'),

  body('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('fecha_inicio debe ser una fecha válida (YYYY-MM-DD)'),

  body('fecha_fin')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('fecha_fin debe ser una fecha válida (YYYY-MM-DD)'),

  body('estado')
    .optional()
    .isIn(ESTADOS_VALIDOS)
    .withMessage(`estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`),
];

module.exports = {
  createProjectValidators,
  updateProjectValidators,
  pagination, // re-exportado de common.validators.js: proyectos.routes.js lo importa desde aquí
};
