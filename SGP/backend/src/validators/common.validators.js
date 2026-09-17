// validators/common.validators.js
//
// ⚠️ ESTE ARCHIVO ESTABA VACÍO (0 líneas) — por eso el backend no arrancaba
// en absoluto: 11 archivos de rutas distintas importan funciones de aquí
// (idParam, idBody, requiredText, optionalText, requiredDate, optionalDate,
// progress, pagination) y las usan directamente como middleware de Express.
// Con el archivo vacío, cada import quedaba `undefined`, y Express falla
// con "Route.post() requires a callback function but got a [object
// Undefined]" en cuanto intenta registrar la primera ruta que las usa.
//
// Se reconstruyen aquí con las firmas exactas que ya esperaban las 11
// rutas existentes (confirmado revisando cómo se llama cada función en
// cada archivo de rutas antes de escribir esto).

const { param, body, query } = require('express-validator');

// Valida que un parámetro de la URL (ej. /entregables/:id) sea un entero positivo.
const idParam = (name) =>
  param(name)
    .isInt({ min: 1 })
    .withMessage(`${name} debe ser un identificador numérico válido (entero positivo)`);

// Igual que idParam, pero para un campo dentro del body (ej. id_proyecto en un POST).
const idBody = (name) =>
  body(name)
    .isInt({ min: 1 })
    .withMessage(`${name} debe ser un identificador numérico válido (entero positivo)`);

// Texto obligatorio con longitud máxima.
const requiredText = (name, max) =>
  body(name)
    .trim()
    .notEmpty()
    .withMessage(`${name} es requerido`)
    .isLength({ max })
    .withMessage(`${name} no puede superar los ${max} caracteres`);

// Texto opcional (puede venir null/ausente) pero con longitud máxima si viene.
const optionalText = (name, max) =>
  body(name)
    .optional({ nullable: true })
    .trim()
    .isLength({ max })
    .withMessage(`${name} no puede superar los ${max} caracteres`);

// Fecha obligatoria en formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss).
const requiredDate = (name) =>
  body(name)
    .notEmpty()
    .withMessage(`${name} es requerida`)
    .isISO8601()
    .withMessage(`${name} debe ser una fecha válida (YYYY-MM-DD)`);

// Fecha opcional en formato ISO 8601.
const optionalDate = (name) =>
  body(name)
    .optional({ nullable: true })
    .isISO8601()
    .withMessage(`${name} debe ser una fecha válida (YYYY-MM-DD)`);

// NUEVO: texto con límite de caracteres Y de palabras a la vez. Se usa en
// mensajes y comentarios (ver mensajes.routes.js / comentarios.routes.js)
// para que el "apartado de mensajes" no permita textos interminables desde
// ningún rol (Administrador, Instructor o Aprendiz usan el mismo endpoint).
const limitedText = (name, { maxChars = 1000, maxWords = 300, required = true } = {}) => {
  let chain = body(name).trim();
  chain = required
    ? chain.notEmpty().withMessage(`${name} es requerido`)
    : chain.optional({ nullable: true });
  return chain
    .isLength({ max: maxChars })
    .withMessage(`${name} no puede superar los ${maxChars} caracteres`)
    .custom((value) => {
      if (!value) return true;
      const palabras = value.trim().split(/\s+/).filter(Boolean);
      if (palabras.length > maxWords) {
        throw new Error(`${name} no puede superar las ${maxWords} palabras (tiene ${palabras.length})`);
      }
      return true;
    });
};

// Porcentaje de avance (0-100), usado en fases/tareas.
const progress = body('porcentaje_avance')
  .optional()
  .isFloat({ min: 0, max: 100 })
  .withMessage('porcentaje_avance debe estar entre 0 y 100')
  .toFloat();

// Paginación estándar para listados (?limit=&offset=).
const pagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset debe ser mayor o igual a 0').toInt(),
];

module.exports = {
  idParam,
  idBody,
  requiredText,
  optionalText,
  requiredDate,
  optionalDate,
  progress,
  pagination,
  limitedText,
};
