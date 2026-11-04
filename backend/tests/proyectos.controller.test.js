import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create, update } = require('../src/controllers/proyectos.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };

afterEach(() => {
  vi.restoreAllMocks();
});

function nuevoProyecto(datos = {}) {
  return { nombre: 'SGP', fecha_inicio: '2026-01-01', fecha_fin: '2026-04-01', id_instructor: 2, ...datos };
}

// Stub de la BD para un create válido: el instructor tiene `activos` proyectos
function bdParaCrear(activos = 0) {
  return vi.spyOn(db, 'query')
    .mockResolvedValueOnce([[{ total: activos }]])  // RN-002: conteo de activos
    .mockResolvedValueOnce([{ insertId: 50 }])       // INSERT del proyecto
    .mockResolvedValueOnce([{}]);                    // historial
}

describe('create (RN-004: duración entre 1 y 6 meses)', () => {
  it.each([
    ['exactly 1 month', '2026-02-01', '2026-03-01'],
    ['exactly 6 calendar months', '2026-01-01', '2026-07-01'],
    ['6 months starting in February', '2026-02-01', '2026-08-01'],
  ])('should accept a project of %s', async (_caso, fecha_inicio, fecha_fin) => {
    bdParaCrear();
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto({ fecha_inicio, fecha_fin }) }), res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([
    ['one day less than 1 month', '2026-02-01', '2026-02-28'],
    ['one day more than 6 months', '2026-01-01', '2026-07-02'],
  ])('should reject a project of %s', async (_caso, fecha_inicio, fecha_fin) => {
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto({ fecha_inicio, fecha_fin }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'RN-004: Los proyectos deben durar entre 1 y 6 meses' });
  });
});

describe('create (otras reglas)', () => {
  it('should reject an end date equal to the start date (RN-011)', async () => {
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto({ fecha_fin: '2026-01-01' }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/^RN-011/);
  });

  it('should respond 403 when an instructor creates a project for another instructor', async () => {
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto({ id_instructor: 3 }) }), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should let the instructor with 9 active projects create one more (RN-002)', async () => {
    bdParaCrear(9);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto() }), res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should reject a new project when the instructor already has 10 active (RN-002)', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ total: 10 }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto() }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).toHaveBeenCalledTimes(1); // no llegó a insertar
  });

  it('should create the project in "En Planificación" state (RN-009)', async () => {
    const query = bdParaCrear();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoProyecto() }), crearRes());

    expect(query.mock.calls[1][0]).toContain("'En Planificación'");
  });
});

describe('update', () => {
  // Stub: el proyecto existe con avance 40% y luego la consulta del avance actual
  function bdConAvance(avance) {
    return vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ fecha_inicio: '2026-01-01', fecha_fin: '2026-05-01', porcentaje_avance: avance }]])
      .mockResolvedValueOnce([[{ porcentaje_avance: avance }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}]);
  }

  it('should reject lowering the progress (RN-014)', async () => {
    bdConAvance('40.00');
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '7' }, body: { porcentaje_avance: 39 } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/^RN-014/);
  });

  it('should accept keeping the same progress (RN-014)', async () => {
    bdConAvance('40.00');
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '7' }, body: { porcentaje_avance: 40 } }), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Proyecto actualizado' });
  });

  it('should reject a progress greater than 100 (RN-013)', async () => {
    bdConAvance('40.00');
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '7' }, body: { porcentaje_avance: 101 } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/^RN-013/);
  });

  it('should respond 404 when the project does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '999' }, body: { nombre: 'X' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
