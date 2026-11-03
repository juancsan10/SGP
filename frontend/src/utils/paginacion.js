// =====================================================
// utils/paginacion.js
// Funciones puras para cálculo de paginación
// =====================================================

export function calcularTotalPaginas(total = 0, limit = 10) {
  if (limit <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

export function obtenerPaginaActual(offset = 0, limit = 10) {
  if (limit <= 0) return 1;
  return Math.floor(Math.max(0, offset) / limit) + 1;
}

export function generarRangoPaginas(total = 0, limit = 10, offset = 0) {
  const totalPages = calcularTotalPaginas(total, limit);
  const currentPage = obtenerPaginaActual(offset, limit);
  const paginas = [];

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      paginas.push(p);
    } else if (paginas[paginas.length - 1] !== '…') {
      paginas.push('…');
    }
  }

  return paginas;
}
