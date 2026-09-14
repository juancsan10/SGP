const { validationResult } = require('express-validator');

/**
 * Middleware general para procesar los errores
 * generados por express-validator.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map((error) => ({
        campo: error.path,
        mensaje: error.msg
      }))
    });
  }

  next();
};

module.exports = {
  validate
};