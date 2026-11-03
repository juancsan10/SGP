import { describe, it, expect } from 'vitest';
import { getNavItems } from '../src/utils/navegacion.js';

describe('navegación según rol (lógica pura)', () => {
  it('para Aprendiz incluye solo las rutas principales y excluye Administración', () => {
    const items = getNavItems(false, false);
    const rutas = items.filter(i => !i.section).map(i => i.path);

    expect(rutas).toContain('/dashboard');
    expect(rutas).toContain('/proyectos');
    expect(rutas).toContain('/tareas');
    expect(rutas).toContain('/entregas');
    expect(rutas).toContain('/notificaciones');
    expect(rutas).toContain('/calendario');
    expect(rutas).toContain('/timeline');

    // No debe contener rutas de administración
    expect(rutas).not.toContain('/usuarios');
    expect(rutas).not.toContain('/historial');
    expect(items.some(i => i.label === 'Administración')).toBe(false);
  });

  it('para Instructor incluye las rutas principales y la sección Administración', () => {
    const items = getNavItems(false, true);
    const rutas = items.filter(i => !i.section).map(i => i.path);

    expect(rutas).toContain('/usuarios');
    expect(rutas).toContain('/historial');
    expect(items.some(i => i.label === 'Administración')).toBe(true);
  });

  it('para Administrador incluye las rutas principales y la sección Administración', () => {
    const items = getNavItems(true, false);
    const rutas = items.filter(i => !i.section).map(i => i.path);

    expect(rutas).toContain('/usuarios');
    expect(rutas).toContain('/historial');
    expect(items.some(i => i.label === 'Administración')).toBe(true);
  });
});
