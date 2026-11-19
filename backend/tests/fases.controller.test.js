import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create, getByProyecto, update, remove } = require('../src/controllers/fases.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const PROYECTO = { id_proyecto: 1, estado: 'Activo', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-30' };

afterEach(() => {
  vi.restoreAllMocks();
});

const nuevaFase = (datos = {}) => ({ nombre_fase: 'Análisis', id_proyecto: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-03-01', ...datos });

describe('fases: create', () => {
  it('should create the phase inside the project dates and record the history', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[PROYECTO]])
      .mockResolvedValueOnce([{ insertId: 9 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaFase() }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Fase creada', data: { id_fase: 9 } });
    expect(query.mock.calls[2][1]).toEqual(['fases_proyecto', 9, 'INSERT', 2]);
  });

  it.each([
    ['without name', { nombre_fase: '' }, 'nombre_fase e id_proyecto son requeridos'],
    ['ending the same day it starts', { fecha_fin: '2026-02-01' }, 'La fecha de fin debe ser posterior a la fecha de inicio'],
  ])('should reject a phase %s without querying the database', async (_caso, datos, mensaje) => {
    const query = vi.spyOn(db, 'query');
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaFase(datos) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe(mensaje);
    expect(query).not.toHaveBeenCalled();
  });

  it('should respond 404 when the project does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaFase() }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each(['Finalizado', 'Cancelado'])('should not add phases to a %s project', async (estado) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ ...PROYECTO, estado }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaFase() }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    ['one day before the project starts', { fecha_inicio: '2026-01-31' }, /anterior al inicio del proyecto \(2026-02-01\)/],
    ['one day after the project ends', { fecha_fin: '2026-07-01' }, /posterior al fin del proyecto \(2026-06-30\)/],
  ])('should reject a phase %s', async (_caso, datos, mensaje) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[PROYECTO]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevaFase(datos) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(mensaje);
  });
});

describe('fases: getByProyecto', () => {
  it('should list the phases of the project ordered by start date', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_fase: 1 }, { id_fase: 2 }]]);
    const res = crearRes();

    await getByProyecto(crearReq({ params: { id_proyecto: '1' } }), res);

    expect(query.mock.calls[0][0]).toMatch(/ORDER BY fecha_inicio ASC/);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id_fase: 1 }, { id_fase: 2 }] });
  });
});

describe('fases: update', () => {
  const FASE_ACTUAL = [[{ fase_inicio: '2026-02-01', fase_fin: '2026-03-01', proyecto_inicio: '2026-02-01', proyecto_fin: '2026-06-30' }]];

  it.each([
    [0, 200],
    [100, 200],
    [-1, 400],
    [101, 400],
  ])('should check the progress limits (RN-013): %s%% → %s', async (porcentaje_avance, estado) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '4' }, body: { porcentaje_avance } }), res);

    if (estado === 400) expect(res.status).toHaveBeenCalledWith(400);
    else expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Fase actualizada' });
  });

  it('should keep the new end date inside the project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce(FASE_ACTUAL);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '4' }, body: { fecha_fin: '2026-07-01' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/posterior al fin del proyecto/);
  });

  it('should respond 404 when the phase does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '99' }, body: { nombre_fase: 'Diseño' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// Hallazgo S6: borrar una fase con entregables chocaba con la llave foránea y respondía 500
describe('fases: remove', () => {
  it('should delete a phase with 0 deliverables', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '4' } }), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Fase eliminada' });
    expect(query.mock.calls[1][0]).toMatch(/^DELETE FROM fases_proyecto/);
  });

  it('should respond 409 without deleting when the phase has 1 deliverable', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ total: 1 }]]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No se puede eliminar la fase: tiene 1 entregable(s). Elimínalos primero.' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('should respond 404 when the phase does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '99' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should answer 500 without details when the database fails', async () => {
    vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Connection lost'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error interno del servidor' });
  });
});
