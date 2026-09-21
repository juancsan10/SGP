// utils/glosario-prohibido.js
//
// Filtro de contenido para el canal de mensajes del proyecto. Lista base
// de palabras/expresiones no permitidas en un contexto académico (insultos,
// lenguaje discriminatorio, acoso). El equipo puede ampliar este arreglo
// sin tocar el controlador que lo usa.

const PALABRAS_PROHIBIDAS = [
  'idiota', 'estupido', 'estúpido', 'imbecil', 'imbécil', 'inutil', 'inútil',
  'basura', 'maldito', 'maldita', 'odio', 'callate', 'cállate',
  'marica', 'puto', 'puta', 'pendejo', 'pendeja', 'gonorrea', 'malparido', 'malparida',
  'hijueputa', 'hp', 'gilipollas', 'imbécil', 'retrasado', 'retrasada',
];

// Normaliza el texto (minúsculas, sin tildes) para no dejar pasar variaciones simples.
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Revisa un texto contra el glosario. Devuelve la primera palabra
 * prohibida encontrada, o null si el texto está limpio.
 */
function contienePalabraProhibida(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const normalizado = normalizar(texto);
  for (const palabra of PALABRAS_PROHIBIDAS) {
    const palabraNormalizada = normalizar(palabra);
    const regex = new RegExp(`\\b${palabraNormalizada}\\b`, 'i');
    if (regex.test(normalizado)) return palabra;
  }
  return null;
}

module.exports = { PALABRAS_PROHIBIDAS, contienePalabraProhibida };
