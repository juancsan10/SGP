import { describe, it, expect } from 'vitest';
import {
  calcularTotalPaginas,
  obtenerPaginaActual,
  generarRangoPaginas,
} from '../src/utils/paginacion.js';

describe('paginación (lógica pura)', () => {
  describe('calcularTotalPaginas', () => {
    it('retorna 1 cuando el total es 0', () => {
      expect(calcularTotalPaginas(0, 10)).toBe(1);
    });

    it('calcula correctamente el total de páginas según el límite', () => {
      expect(calcularTotalPaginas(10, 10)).toBe(1);
      expect(calcularTotalPaginas(11, 10)).toBe(2);
      expect(calcularTotalPaginas(25, 10)).toBe(3);
    });

    it('protege contra límite cero o negativo', () => {
      expect(calcularTotalPaginas(10, 0)).toBe(1);
      expect(calcularTotalPaginas(10, -5)).toBe(1);
    });
  });

  describe('obtenerPaginaActual', () => {
    it('retorna 1 cuando el offset es 0', () => {
      expect(obtenerPaginaActual(0, 10)).toBe(1);
    });

    it('calcula la página según el offset y el límite', () => {
      expect(obtenerPaginaActual(10, 10)).toBe(2);
      expect(obtenerPaginaActual(20, 10)).toBe(3);
    });

    it('protege contra offsets negativos', () => {
      expect(obtenerPaginaActual(-10, 10)).toBe(1);
    });
  });

  describe('generarRangoPaginas', () => {
    it('genera todas las páginas consecutivas cuando son pocas', () => {
      // 30 items, 10 por página = 3 páginas
      expect(generarRangoPaginas(30, 10, 0)).toEqual([1, 2, 3]);
    });

    it('incluye puntos suspensivos cuando hay muchas páginas alejadas de la actual', () => {
      // 100 items, 10 por página = 10 páginas, página 1
      const paginas = generarRangoPaginas(100, 10, 0);
      expect(paginas).toContain(1);
      expect(paginas).toContain(2);
      expect(paginas).toContain('…');
      expect(paginas).toContain(10);
    });

    it('centra el rango alrededor de la página actual', () => {
      // Página 5 de 10
      const paginas = generarRangoPaginas(100, 10, 40);
      expect(paginas).toEqual([1, '…', 4, 5, 6, '…', 10]);
    });
  });
});
