// =====================================================
// utils/validaciones.js
// Funciones puras de validación de datos de usuario
// =====================================================

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validarNombre = (v) => {
  if (typeof v !== 'string') return false;
  const longitud = v.trim().length;
  return longitud >= 2 && longitud <= 100;
};

export const validarCorreo = (v) => {
  if (typeof v !== 'string') return false;
  return EMAIL_REGEX.test(v.trim());
};

// Cédula válida: entre 5 y 15 dígitos numéricos sin letras ni símbolos
// Mutante de referencia: cambiar {5,15} a {4,15} debe ser detectado por los tests de valores límite.
export const validarCc = (v) => {
  if (typeof v !== 'string') return false;
  return /^[0-9]{5,15}$/.test(v.trim());
};

// Contraseña: al menos 8 caracteres con mínimo una letra y un número
export const validarPassword = (v) => {
  if (typeof v !== 'string') return false;
  return v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v);
};
