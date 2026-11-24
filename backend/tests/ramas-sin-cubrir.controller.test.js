import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Semana 8 (capa BD): ramas sin cubrir que mostró el reporte de cobertura del backend.
// archivos.controller (23 % de líneas, 0 % de ramas), githubIntegration.controller (18 %, 0 %),
// alerts.service (0 %) e historial.controller (53 %). La BD se reemplaza con stubs de db.query.
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificacionesService = require('../src/services/notificaciones.service');
const archivos = require('../src/controllers/archivos.controller');
const github = require('../src/controllers/githubIntegration.controller');
const historial = require('../src/controllers/historial.controller');
const { runExpirationAlerts } = require('../src/services/alerts.service');
const { UPLOAD_DIR } = require('../src/middlewares/upload.middleware');

const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };

afterEach(() => {
  vi.restoreAllMocks();
});

const llamar = async (accion, req) => {
  const res = crearRes();
  await accion(crearReq(req), res);
  return res;
};

const fallaLaBd = () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(db, 'query').mockRejectedValue(new Error('ECONNREFUSED'));
};

describe('archivos.controller', () => {
  it('should require name, path and deliverable to register an external file', async () => {
    const res = await llamar(archivos.create, { user: APRENDIZ, body: { nombre_archivo: 'avance.pdf' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should register an external file and write it in the history', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 12 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(archivos.create, {
      user: APRENDIZ, body: { nombre_archivo: 'Drive', ruta_archivo: 'https://drive.google.com/x', id_entregable: 3 },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { id_archivo: 12 } }));
    expect(query.mock.calls[1][1]).toEqual(['archivos', 12, 'INSERT', 4]);
  });

  it('should answer 400 when the upload arrives without the "archivo" field', async () => {
    const res = await llamar(archivos.uploadFile, { user: APRENDIZ, params: { id: '3' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should save the uploaded file with its public path and return its size', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 20 }]).mockResolvedValueOnce([{}]);
    const req = crearReq({ user: APRENDIZ, params: { id: '3' } });
    req.file = { filename: '171-avance.pdf', originalname: 'avance.pdf', size: 2048 };
    const res = crearRes();

    await archivos.uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[0][1]).toEqual(['avance.pdf', '/uploads/171-avance.pdf', '3']);
    expect(res.json.mock.calls[0][0].data).toMatchObject({ ruta_archivo: '/uploads/171-avance.pdf', tamano_bytes: 2048 });
  });

  it('should list the files of a deliverable', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_archivo: 1 }, { id_archivo: 2 }]]);

    const res = await llamar(archivos.getByEntregable, { params: { id_entregable: '3' } });

    expect(res.json.mock.calls[0][0].data).toHaveLength(2);
  });

  it('should answer 404 when deleting a file that does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    const res = await llamar(archivos.remove, { user: ADMIN, params: { id: '99' } });

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should delete only the database row for an external link (no file on disk)', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ ruta_archivo: 'https://drive.google.com/x' }]]).mockResolvedValue([{}]);
    const unlink = vi.spyOn(fs, 'unlink').mockImplementation(() => {});

    const res = await llamar(archivos.remove, { user: ADMIN, params: { id: '5' } });

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Archivo eliminado' });
    expect(unlink).not.toHaveBeenCalled();
  });

  // Rama de seguridad: la ruta guardada en la BD podría traer "../". El borrado usa solo el
  // nombre del archivo (path.basename), así nunca sale de la carpeta de subidas.
  it('should delete the physical file only inside the uploads folder, even if the stored path has ../', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ ruta_archivo: '/uploads/../../server.js' }]]).mockResolvedValue([{}]);
    const unlink = vi.spyOn(fs, 'unlink').mockImplementation(() => {});

    await llamar(archivos.remove, { user: ADMIN, params: { id: '5' } });

    expect(unlink).toHaveBeenCalledWith(path.join(UPLOAD_DIR, 'server.js'), expect.any(Function));
  });

  it('should not fail the request when the physical file was already gone (ENOENT)', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ ruta_archivo: '/uploads/viejo.pdf' }]]).mockResolvedValue([{}]);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fs, 'unlink').mockImplementation((_ruta, cb) => cb(Object.assign(new Error('no existe'), { code: 'ENOENT' })));

    const res = await llamar(archivos.remove, { user: ADMIN, params: { id: '5' } });

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Archivo eliminado' });
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    ['create', archivos.create, { body: { nombre_archivo: 'a', ruta_archivo: 'b', id_entregable: 1 } }],
    ['getByEntregable', archivos.getByEntregable, { params: { id_entregable: '1' } }],
    ['remove', archivos.remove, { params: { id: '1' } }],
  ])('should answer 500 without details when the database fails in %s', async (_nombre, accion, req) => {
    fallaLaBd();

    const res = await llamar(accion, { user: ADMIN, ...req });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Error interno del servidor' });
  });
});

describe('githubIntegration.controller (el token nunca sale en la respuesta)', () => {
  it('should require username and token', async () => {
    const res = await llamar(github.create, { user: APRENDIZ, body: { github_username: 'rubloxil' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should not link a second GitHub account for the same user', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_integration: 1 }]]);

    const res = await llamar(github.create, { user: APRENDIZ, body: { github_username: 'a', github_token: 't' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should link the account of the logged user, not one sent in the body', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ insertId: 3 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(github.create, { user: APRENDIZ, body: { github_username: 'a', github_token: 't', id_usuario: 99 } });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[1][1]).toEqual(['a', 't', 4]);
  });

  it('should forbid seeing the integration of another user unless Administrador', async () => {
    const res = await llamar(github.getByUsuario, { user: APRENDIZ, params: { id_usuario: '7' } });

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should never select the token column when showing an integration', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_integration: 1, github_username: 'a' }]]);

    const res = await llamar(github.getByUsuario, { user: ADMIN, params: { id_usuario: '7' } });

    expect(query.mock.calls[0][0]).not.toMatch(/github_token/);
    expect(res.json.mock.calls[0][0].data).not.toHaveProperty('github_token');
  });

  it('should answer 404 when the user has not linked GitHub', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    const res = await llamar(github.getByUsuario, { user: APRENDIZ, params: { id_usuario: '4' } });

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each([
    ['update', github.update, 'UPDATE', 'Integración de GitHub actualizada'],
    ['remove', github.remove, 'DELETE', 'Cuenta de GitHub desvinculada'],
  ])('should %s only the integration of the logged user', async (_n, accion, operacion, mensaje) => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(accion, { user: APRENDIZ, body: { github_username: 'b' } });

    expect(res.json).toHaveBeenCalledWith({ success: true, message: mensaje });
    expect(query.mock.calls[0][1].at(-1)).toBe(4);
    expect(query.mock.calls[1][1]).toEqual(['github_integration', 4, operacion, 4]);
  });

  it.each([['update', github.update], ['remove', github.remove]])('should answer 404 on %s when there is nothing linked', async (_n, accion) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await llamar(accion, { user: APRENDIZ });

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each([
    ['create', github.create, { body: { github_username: 'a', github_token: 't' } }],
    ['getByUsuario', github.getByUsuario, { params: { id_usuario: '4' } }],
    ['update', github.update, {}],
    ['remove', github.remove, {}],
  ])('should answer 500 when the database fails in %s', async (_n, accion, req) => {
    fallaLaBd();

    const res = await llamar(accion, { user: APRENDIZ, ...req });

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('alerts.service (avisos de vencimiento)', () => {
  it('should warn about tasks and deliverables that are due soon, only once per day', async () => {
    const crear = vi.spyOn(notificacionesService, 'crearYNotificar').mockResolvedValue();
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_tarea: 1, titulo: 'Diagrama', fecha_vencimiento: '2026-03-12', id_asignado: 4, proyecto: 'SGP' },
        { id_tarea: 2, titulo: 'Casos de uso', fecha_vencimiento: '2026-03-12', id_asignado: 5, proyecto: 'SGP' }]])
      .mockResolvedValueOnce([[]])                       // tarea 1: no avisada hoy
      .mockResolvedValueOnce([[{ id_notificacion: 9 }]]) // tarea 2: ya avisada hoy
      .mockResolvedValueOnce([[{ id_entregable: 3, nombre: 'Manual', fecha_entrega: '2026-03-11', proyecto: 'SGP', id_usuario: 4 }]])
      .mockResolvedValueOnce([[]]);

    await runExpirationAlerts();

    expect(crear).toHaveBeenCalledTimes(2);
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Vencimiento próximo: Diagrama', id_usuario: 4, prioridad: 'Alta' }));
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Entregable próximo: Manual', id_usuario: 4 }));
  });

  it('should not warn anybody when nothing is due', async () => {
    const crear = vi.spyOn(notificacionesService, 'crearYNotificar').mockResolvedValue();
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);

    await runExpirationAlerts();

    expect(crear).not.toHaveBeenCalled();
  });
});

describe('historial.controller (filtros, estadísticas y eliminaciones)', () => {
  it('should apply every filter and keep the page size between 1 and 200', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 0 }]]);

    const res = await llamar(historial.getAll, {
      user: ADMIN,
      query: { limit: '999', offset: '-5', tabla: 'tareas', accion: 'UPD', id_usuario: '4', fecha_desde: '2026-01-01', fecha_hasta: '2026-02-01', q: 'Ana' },
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/h.tabla_afectada = \?.*h.accion LIKE \?.*h.id_usuario = \?.*h.fecha_cambio >= \?.*h.fecha_cambio <= \?/s);
    expect(params.slice(-2)).toEqual([200, 0]);
    expect(params).toContain('%Ana%');
    expect(res.json.mock.calls[0][0].meta).toEqual({ total: 0, limit: 200, offset: 0 });
  });

  it('should return the dashboard statistics for the Administrador', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ total_usuarios: 10 }]])
      .mockResolvedValue([[{ total: 1 }]]);

    const res = await llamar(historial.estadisticas, { user: ADMIN });

    expect(res.json.mock.calls[0][0].data).toMatchObject({ totales: { total_usuarios: 10 }, porTabla: [{ total: 1 }] });
  });

  it('should search the deleted users and page them', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_eliminacion: 1 }]]).mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await llamar(historial.getEliminaciones, { user: ADMIN, query: { q: ' ana ', limit: '0' } });

    expect(query.mock.calls[0][1]).toEqual(['%ana%', '%ana%', '%ana%', '%ana%', 10, 0]);
    expect(res.json.mock.calls[0][0].meta).toEqual({ total: 1, limit: 10, offset: 0 });
  });

  it('should answer 404 for a deletion record that does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    const res = await llamar(historial.getEliminacion, { user: ADMIN, params: { id: '9' } });

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return the deletion record with its files and parse the saved summary', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_eliminacion: 1, resumen: '{"proyectos":2}' }]])
      .mockResolvedValueOnce([[{ id_archivo: 1 }]]);

    const res = await llamar(historial.getEliminacion, { user: ADMIN, params: { id: '1' } });

    expect(res.json.mock.calls[0][0].data).toMatchObject({ resumen: { proyectos: 2 }, archivos: [{ id_archivo: 1 }] });
  });

  it('should not break when the saved summary is not valid JSON', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_eliminacion: 1, resumen: '{roto' }]])
      .mockResolvedValueOnce([[]]);

    const res = await llamar(historial.getEliminacion, { user: ADMIN, params: { id: '1' } });

    expect(res.json.mock.calls[0][0].data.resumen).toBeNull();
  });

  it.each([
    ['getByTabla', historial.getByTabla, { params: { tabla: 'tareas' } }],
    ['getAll', historial.getAll, {}],
    ['estadisticas', historial.estadisticas, {}],
    ['getEliminaciones', historial.getEliminaciones, {}],
    ['getEliminacion', historial.getEliminacion, { params: { id: '1' } }],
  ])('should answer 500 when the database fails in %s', async (_n, accion, req) => {
    fallaLaBd();

    const res = await llamar(accion, { user: INSTRUCTOR, ...req });

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
