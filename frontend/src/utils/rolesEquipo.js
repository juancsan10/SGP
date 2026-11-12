// =====================================================
// utils/rolesEquipo.js  (NUEVO — punto 4, #19)
// Paleta y color de las etiquetas de rol de equipo. Debe coincidir con
// backend/src/utils/roles-equipo.js (todos con contraste AA y texto blanco).
// =====================================================
export const PALETA_ROLES = [
  { color: '#2563eb', nombre: 'Azul' },
  { color: '#047857', nombre: 'Verde' },
  { color: '#7c3aed', nombre: 'Violeta' },
  { color: '#b45309', nombre: 'Ámbar' },
  { color: '#be185d', nombre: 'Rosa' },
  { color: '#0e7490', nombre: 'Cian' },
  { color: '#b91c1c', nombre: 'Rojo' },
  { color: '#4338ca', nombre: 'Índigo' },
  { color: '#475569', nombre: 'Pizarra' },
  { color: '#4d7c0f', nombre: 'Oliva' },
];

const COLORES_PREDETERMINADOS = {
  'líder del proyecto': '#4338ca',
  'desarrollador': '#2563eb',
  'desarrollador frontend': '#0e7490',
  'desarrollador backend': '#047857',
  'diseñador ux/ui': '#be185d',
  'analista': '#7c3aed',
  'tester / qa': '#b45309',
  'base de datos': '#4d7c0f',
  'documentador': '#475569',
};

// Color de la etiqueta: el guardado; si no hay, el del rol predeterminado
// con ese nombre; si tampoco, uno fijo de la paleta derivado del nombre
// (así un rol escrito a mano antes de esta mejora siempre sale igual).
export function colorDeRol(nombre, color) {
  if (color) return color;
  const clave = String(nombre || '').trim().toLowerCase();
  if (!clave) return null;
  if (COLORES_PREDETERMINADOS[clave]) return COLORES_PREDETERMINADOS[clave];
  let h = 0;
  for (const ch of clave) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PALETA_ROLES[h % PALETA_ROLES.length].color;
}
