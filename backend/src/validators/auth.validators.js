const { body } = require('express-validator');

// normalizeEmail() por defecto QUITA los puntos de las cuentas de Gmail
// ("rubiel.tads@gmail.com" → "rubieltads@gmail.com"), así que el
// correo que llegaba al login ya no coincidía con el guardado en la BD.
// Solo se normaliza a minúsculas; el resto del correo se respeta tal cual.
const NORMALIZE_EMAIL_OPTS = {
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  gmail_convert_googlemaildotcom: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false
};

/**
 * Validaciones para inicio de sesión
 */
const loginValidators = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo no tiene un formato válido')
    .normalizeEmail(NORMALIZE_EMAIL_OPTS),

  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

/**
 * Validaciones para registro de aprendices
 */
const registerValidators = [
  body('nombres')
    .trim()
    .notEmpty()
    .withMessage('Los nombres son requeridos')
    .isLength({ min: 2, max: 100 })
    .withMessage('Los nombres deben tener entre 2 y 100 caracteres'),

  body('apellidos')
    .trim()
    .notEmpty()
    .withMessage('Los apellidos son requeridos')
    .isLength({ min: 2, max: 100 })
    .withMessage('Los apellidos deben tener entre 2 y 100 caracteres'),

  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo no tiene un formato válido')
    .normalizeEmail(NORMALIZE_EMAIL_OPTS),

  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),

  body('ficha')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('La ficha no puede superar los 50 caracteres'),

  body('programa_formacion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El programa de formación no puede superar los 150 caracteres')
];

/**
 * Solicitud de recuperación de contraseña
 */
const resetRequestValidators = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo no tiene un formato válido')
    .normalizeEmail(NORMALIZE_EMAIL_OPTS)
];

/**
 * Confirmación de recuperación de contraseña
 */
const resetConfirmValidators = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('El token de recuperación es requerido'),

  body('nueva_contrasena')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
];

/**
 * Creación de usuarios por parte del administrador
 */
const adminUserValidators = [
  body('nombres')
    .trim()
    .notEmpty()
    .withMessage('Los nombres son requeridos')
    .isLength({ min: 2, max: 100 })
    .withMessage('Los nombres deben tener entre 2 y 100 caracteres'),

  body('apellidos')
    .trim()
    .notEmpty()
    .withMessage('Los apellidos son requeridos')
    .isLength({ min: 2, max: 100 })
    .withMessage('Los apellidos deben tener entre 2 y 100 caracteres'),

  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo no tiene un formato válido')
    .normalizeEmail(NORMALIZE_EMAIL_OPTS),

  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),

  // El sistema tiene un único Administrador: desde aquí solo se crean
  // Instructores (id_rol = 2).
  body('id_rol')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isInt({ min: 2, max: 2 })
    .withMessage('Solo se pueden crear Instructores: el sistema tiene un único Administrador'),

  body('ficha')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('La ficha no puede superar los 50 caracteres'),

  body('programa_formacion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('El programa de formación no puede superar los 150 caracteres')
];

module.exports = {
  loginValidators,
  registerValidators,
  resetRequestValidators,
  resetConfirmValidators,
  adminUserValidators
};