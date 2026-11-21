import { createRequire } from 'node:module';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create, getByFase, update, remove } = require('../src/controllers/entregables.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const FASE = { id_fase: 4, id_proyecto: 1, fecha_inicio: '2026-03-01', fecha_fin: '2026-04-30' };

// Dependencia del reloj: "no se permite una fecha de entrega pasada" depende de HOY.
// Se fija la fecha del sistema para que el test no cambie de resultado según el día,
// y la zona horaria de Colombia para que el CI (en UTC) se comporte como el servidor real.
const zonaOriginal = process.env.TZ;
process.env.TZ = 'America/Bogota';
afterAll(() => {
  if (zonaOriginal === undefined) delete process.env.TZ; else process.env.TZ = zonaOriginal;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-03-10T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const nuevoEntregable = (datos = {}) => ({ nombre: 'Documento de requisitos', fecha_entrega: '2026-03-20', id_fase: 4, ...datos });

describe('entregables: create', () => {
  it('should create the deliverable as "Pendiente" with version 1.0 by default', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[FASE]])
      .mockResolvedValueOnce([[{ estado: 'Activo' }]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable() }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[2][0]).toContain("'Pendiente'");
    expect(query.mock.calls[2][1]).toEqual(['Documento de requisitos', null, '2026-03-20', null, '1.0', 4]);
  });

  // Hallazgo: en UTC-5, new Date('2026-03-10') es el 9 de marzo a las 7 p. m., así que
  // un entregable con fecha de HOY se rechazaba como "fecha pasada".
  it.each([
    ['today', '2026-03-10', 201],
    ['yesterday', '2026-03-09', 400],
  ])('should check the delivery date against today: %s', async (_caso, fecha_entrega, estado) => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[FASE]])
      .mockResolvedValueOnce([[{ estado: 'Activo' }]])
      .mockResolvedValueOnce([{ insertId: 30 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable({ fecha_entrega }) }), res);

    expect(res.status).toHaveBeenCalledWith(estado);
  });

  it.each([
    ['without required fields', { nombre: '' }, 'nombre, fecha_entrega e id_fase son requeridos'],
    ['with a date that is not a date', { fecha_entrega: 'mañana' }, 'fecha_entrega no es una fecha válida'],
  ])('should reject a deliverable %s', async (_caso, datos, mensaje) => {
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable(datos) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe(mensaje);
  });

  it('should respond 404 when the phase does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable() }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toBe('Fase no encontrada');
  });

  it('should not create deliverables in a finished project', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[FASE]]).mockResolvedValueOnce([[{ estado: 'Finalizado' }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable() }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should keep the delivery date inside the phase', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[FASE]]).mockResolvedValueOnce([[{ estado: 'Activo' }]]);
    const res = crearRes();

    await create(crearReq({ user: INSTRUCTOR, body: nuevoEntregable({ fecha_entrega: '2026-05-01' }) }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/posterior al fin de la fase \(2026-04-30\)/);
  });
});

describe('entregables: getByFase y update', () => {
  it('should list the deliverables of the phase by delivery date', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_entregable: 1 }]]);
    const res = crearRes();

    await getByFase(crearReq({ params: { id_fase: '4' } }), res);

    expect(query.mock.calls[0][0]).toMatch(/ORDER BY fecha_entrega ASC/);
  });

  it('should reject a real delivery date before the scheduled one', async () => {
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '30' }, body: { fecha_entrega: '2026-03-20', fecha_entregado: '2026-03-19' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should allow fixing a past date as long as it stays inside the phase', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ fase_inicio: '2026-03-01', fase_fin: '2026-04-30' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '30' }, body: { fecha_entrega: '2026-03-02' } }), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Entregable actualizado' });
  });

  it('should respond 404 when the deliverable does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = crearRes();

    await update(crearReq({ user: INSTRUCTOR, params: { id: '99' }, body: { estado: 'Entregado' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// Hallazgo S6: con comentarios, archivos o calificaciones la llave foránea respondía 500
describe('entregables: remove', () => {
  it('should delete a deliverable with 0 comments, files or grades', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '30' } }), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Entregable eliminado' });
  });

  it('should respond 409 without deleting when it has 1 related record', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ total: 1 }]]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '30' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('should respond 404 when the deliverable does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ total: 0 }]]).mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = crearRes();

    await remove(crearReq({ user: INSTRUCTOR, params: { id: '99' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
