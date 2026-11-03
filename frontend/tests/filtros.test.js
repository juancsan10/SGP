import { describe, it, expect } from 'vitest';
import { filtrarProyectos, filtrarTareas } from '../src/utils/filtros.js';

describe('filtros (lógica pura)', () => {
  describe('filtrarProyectos', () => {
    const proyectosMock = [
      { id: 1, nombre: 'Sistema de Gestión SGP', instructor: 'Laura Gómez' },
      { id: 2, nombre: 'Plataforma E-learning', instructor: 'Carlos Herrera' },
      { id: 3, nombre: 'Control de Inventario SENA', instructor: 'Laura Gómez' },
    ];

    it('devuelve todos los proyectos cuando el filtro está vacío o es null', () => {
      expect(filtrarProyectos(proyectosMock, '')).toHaveLength(3);
      expect(filtrarProyectos(proyectosMock, null)).toHaveLength(3);
    });

    it('filtra por nombre de proyecto de forma insensible a mayúsculas', () => {
      const res = filtrarProyectos(proyectosMock, 'inventario');
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toContain('Control de Inventario');
    });

    it('filtra por nombre de instructor', () => {
      const res = filtrarProyectos(proyectosMock, 'laura');
      expect(res).toHaveLength(2);
    });

    it('devuelve arreglo vacío cuando ningún proyecto coincide', () => {
      expect(filtrarProyectos(proyectosMock, 'inexistente')).toEqual([]);
    });

    it('maneja arreglos vacíos o nulos de forma segura', () => {
      expect(filtrarProyectos([], 'algo')).toEqual([]);
      expect(filtrarProyectos(null, 'algo')).toEqual([]);
    });
  });

  describe('filtrarTareas', () => {
    const tareasMock = [
      { id: 1, titulo: 'Diseño de base de datos', asignado_nombre: 'Rubiel', proyecto_nombre: 'SGP', estado: 'Pendiente' },
      { id: 2, titulo: 'Pruebas unitarias API', asignado_nombre: 'Juan Manuel', proyecto_nombre: 'SGP', estado: 'Completada' },
      { id: 3, titulo: 'Diagramas UML', asignado_nombre: 'Juan Carlos', proyecto_nombre: 'Inventario', estado: 'Pendiente' },
    ];

    it('retorna todas las tareas cuando no hay filtros aplicados', () => {
      expect(filtrarTareas(tareasMock, '', '')).toHaveLength(3);
    });

    it('filtra por texto coincidiendo con el título', () => {
      const res = filtrarTareas(tareasMock, 'base de datos', '');
      expect(res).toHaveLength(1);
      expect(res[0].titulo).toBe('Diseño de base de datos');
    });

    it('filtra por texto coincidiendo con el asignado', () => {
      const res = filtrarTareas(tareasMock, 'juan manuel', '');
      expect(res).toHaveLength(1);
      expect(res[0].asignado_nombre).toBe('Juan Manuel');
    });

    it('filtra por estado', () => {
      const res = filtrarTareas(tareasMock, '', 'Pendiente');
      expect(res).toHaveLength(2);
    });

    it('combina filtro de texto y de estado simultáneamente', () => {
      const res = filtrarTareas(tareasMock, 'sgp', 'Completada');
      expect(res).toHaveLength(1);
      expect(res[0].titulo).toBe('Pruebas unitarias API');
    });

    it('maneja valores nulos de forma segura', () => {
      expect(filtrarTareas(null, 'test', '')).toEqual([]);
    });
  });
});
