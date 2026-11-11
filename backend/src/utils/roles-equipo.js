// =====================================================
// utils/roles-equipo.js  (NUEVO — punto 4, #19)
// Paleta de colores sólidos para las etiquetas de rol de equipo y los
// roles predeterminados. Todos los colores tienen contraste ≥ 4.5:1 con
// texto blanco (WCAG AA). El frontend usa la misma paleta.
// =====================================================
const PALETA_ROLES = [
  '#2563eb', // azul
  '#047857', // verde
  '#7c3aed', // violeta
  '#b45309', // ámbar
  '#be185d', // rosa
  '#0e7490', // cian
  '#b91c1c', // rojo
  '#4338ca', // índigo
  '#475569', // pizarra
  '#4d7c0f', // oliva
];

const ROLES_PREDETERMINADOS = [
  { nombre: 'Líder del proyecto',      color: '#4338ca' },
  { nombre: 'Desarrollador',           color: '#2563eb' },
  { nombre: 'Desarrollador frontend',  color: '#0e7490' },
  { nombre: 'Desarrollador backend',   color: '#047857' },
  { nombre: 'Diseñador UX/UI',         color: '#be185d' },
  { nombre: 'Analista',                color: '#7c3aed' },
  { nombre: 'Tester / QA',             color: '#b45309' },
  { nombre: 'Base de datos',           color: '#4d7c0f' },
  { nombre: 'Documentador',            color: '#475569' },
];

const esColorValido = (c) => typeof c === 'string' && PALETA_ROLES.includes(c.toLowerCase());
const esPredeterminado = (nombre) =>
  ROLES_PREDETERMINADOS.some(r => r.nombre.toLowerCase() === String(nombre).trim().toLowerCase());

module.exports = { PALETA_ROLES, ROLES_PREDETERMINADOS, esColorValido, esPredeterminado };
