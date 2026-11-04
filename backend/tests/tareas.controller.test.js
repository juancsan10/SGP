import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create, update, getRecientes } = require('../src/controllers/tareas.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const PROYECTO = { id_proyecto: 1, estado: 'Activo', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-30' };

function nuevaTarea(datos = {}) {
  return { titulo: 'Diseñar login', id_proyecto: 1, id_asignado: 4, fecha_inicio: '2026-02-01', fecha_vencimiento: '2026-03-01', ...datos };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tareas create', () => {
  it('should reject a due date before the start date', async () => {
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea({ fecha_vencimiento: '2026-01-31' }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each(['Finalizado', 'Cancelado'])('should not create tasks in a project in state %s', async (estado) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ ...PROYECTO, estado }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea() }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe('No se pueden crear tareas en un proyecto finalizado o cancelado');
  });

  it('should accept a task that ends exactly the last day of the project', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[PROYECTO]])
      .mockResolvedValueOnce([[{ id_usuario: 4, estado: 1 }]])
      .mockResolvedValueOnce([[{ id_equipo: 1 }]])
      .mockResolvedValueOnce([{ insertId: 15 }])
      .mockResolvedValue([{}]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea({ fecha_vencimiento: '2026-06-30' }) }), res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should reject a task that ends one day after the project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[PROYECTO]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea({ fecha_vencimiento: '2026-07-01' }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('posterior al fin del proyecto (2026-06-30)');
  });

  it('should reject assigning the task to someone outside the project team', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[PROYECTO]])
      .mockResolvedValueOnce([[{ id_usuario: 9, estado: 1 }]])
      .mockResolvedValueOnce([[]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea({ id_asignado: 9 }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe('El usuario asignado debe pertenecer al equipo del proyecto');
  });

  it('should respond 404 when the assigned user is inactive', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[PROYECTO]])
      .mockResolvedValueOnce([[{ id_usuario: 4, estado: 0 }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaTarea() }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('tareas update', () => {
  it.each([-1, 101])('should reject a progress of %i (RN-013)', async (porcentaje_avance) => {
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '3' }, body: { porcentaje_avance } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should reject a new due date after the end of the project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ tarea_inicio: '2026-02-01', tarea_venc: '2026-03-01', proyecto_inicio: '2026-02-01', proyecto_fin: '2026-06-30' }]]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '3' }, body: { fecha_vencimiento: '2026-07-15' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should respond 404 when the task does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '999' }, body: { titulo: 'Nuevo' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('tareas getRecientes', () => {
  it('should only return the tasks assigned to the apprentice', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    await getRecientes(crearReq({ user: { id: 4, rol: 'Aprendiz' }, query: {} }), crearRes());

    const [sql, valores] = query.mock.calls[0];
    expect(sql).toContain('t.id_asignado = ?');
    expect(valores).toEqual([4, 8]);
  });

  it('should cap the limit at 50', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    await getRecientes(crearReq({ user: { id: 1, rol: 'Administrador' }, query: { limit: '500' } }), crearRes());

    expect(query.mock.calls[0][1]).toEqual([50]);
  });
});
