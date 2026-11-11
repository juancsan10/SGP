import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { getAll, getByTabla } = require('../src/controllers/historial.controller');

const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };

function mockListado() {
  return vi.spyOn(db, 'query')
    .mockResolvedValueOnce([[{ id_historial: 9, usuario_rol: 'Aprendiz' }]])
    .mockResolvedValueOnce([[{ total: 1 }]]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('historial.controller — alcance por rol', () => {
  it('should limit the Instructor to his own actions and those of his project apprentices', async () => {
    // Arrange
    const spy = mockListado();
    const res = crearRes();

    // Act
    await getAll(crearReq({ user: INSTRUCTOR, query: { tabla: 'tareas' } }), res);

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain('(h.id_usuario = ? OR h.id_usuario IN (SELECT e.id_usuario FROM equipos_proyecto e');
    expect(sql).toContain('p.id_instructor = ?');
    expect(params).toEqual([2, 2, 'tareas', 50, 0]);
    expect(spy.mock.calls[1][1]).toEqual([2, 2, 'tareas']);
    expect(res.json.mock.calls[0][0].data[0].usuario_rol).toBe('Aprendiz');
  });

  it('should show only the instructor actions when autor=yo', async () => {
    // Arrange
    const spy = mockListado();

    // Act
    await getAll(crearReq({ user: INSTRUCTOR, query: { autor: 'yo' } }), crearRes());

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain('WHERE h.id_usuario = ?');
    expect(sql).not.toContain('equipos_proyecto');
    expect(params).toEqual([2, 50, 0]);
  });

  it('should show only the apprentices actions when autor=aprendices', async () => {
    // Arrange
    const spy = mockListado();

    // Act
    await getAll(crearReq({ user: INSTRUCTOR, query: { autor: 'aprendices' } }), crearRes());

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain('WHERE h.id_usuario IN (SELECT e.id_usuario');
    expect(params).toEqual([2, 50, 0]);
  });

  it('should keep the whole history for the Administrador and ignore autor', async () => {
    // Arrange
    const spy = mockListado();

    // Act
    await getAll(crearReq({ user: ADMIN, query: { autor: 'yo' } }), crearRes());

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).not.toContain('equipos_proyecto');
    expect(params).toEqual([50, 0]);
  });

  it('should apply the same scope when an Instructor asks for one table', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    // Act
    await getByTabla(crearReq({ user: INSTRUCTOR, params: { tabla: 'usuarios' } }), crearRes());

    // Assert
    expect(spy.mock.calls[0][1]).toEqual(['usuarios', 2, 2]);
  });
});
