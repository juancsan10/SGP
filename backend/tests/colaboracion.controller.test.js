import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Semana 7: el backend al 75 % lo lleva quien tuvo la capa API en S6.
// Comentarios, evaluaciones, reuniones y repositorios: reglas de negocio con la BD reemplazada.
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificacionesService = require('../src/services/notificaciones.service');
const comentarios = require('../src/controllers/comentarios.controller');
const evaluaciones = require('../src/controllers/evaluaciones.controller');
const reuniones = require('../src/controllers/reuniones.controller');
const repositorios = require('../src/controllers/repositorios.controller');

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

describe('comentarios (RN-015)', () => {
  it('should save the comment with the author taken from the session, not from the body', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 7 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(comentarios.create, { user: APRENDIZ, body: { contenido: 'Revisé el diagrama', id_entregable: 3, id_usuario: 99 } });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[0][1]).toEqual(['Revisé el diagrama', 4, 3]);
  });

  it('should require content and deliverable', async () => {
    const res = await llamar(comentarios.create, { user: APRENDIZ, body: { contenido: '' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should list the comments in order and name a deleted author', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_comentario: 1, autor_nombre: 'Usuario eliminado' }]]);

    const res = await llamar(comentarios.getByEntregable, { params: { id_entregable: '3' } });

    expect(query.mock.calls[0][0]).toMatch(/'Usuario eliminado'[\s\S]*ORDER BY c\.fecha_comentario ASC/);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id_comentario: 1, autor_nombre: 'Usuario eliminado' }] });
  });

  it.each([
    ['the author', APRENDIZ, 200],
    ['someone else', { id: 5, rol: 'Aprendiz' }, 403],
  ])('should let only the author edit (%s)', async (_caso, user, estado) => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4 }]]).mockResolvedValue([{}]);

    const res = await llamar(comentarios.update, { user, params: { id: '1' }, body: { contenido: 'Corregido' } });

    if (estado === 200) expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Comentario actualizado' });
    else expect(res.status).toHaveBeenCalledWith(403);
  });

  it.each([
    ['the author', APRENDIZ, true],
    ['an administrator', ADMIN, true],
    ['an instructor who is not the author', INSTRUCTOR, false],
  ])('should decide who can delete a comment: %s', async (_caso, user, puede) => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4 }]]).mockResolvedValue([{}]);

    const res = await llamar(comentarios.remove, { user, params: { id: '1' } });

    if (puede) expect(query.mock.calls[1][0]).toMatch(/^DELETE FROM comentarios/);
    else expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should respond 404 when the comment does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValue([[]]);

    const editar = await llamar(comentarios.update, { user: APRENDIZ, params: { id: '9' }, body: { contenido: 'x' } });
    const borrar = await llamar(comentarios.remove, { user: APRENDIZ, params: { id: '9' } });

    expect(editar.status).toHaveBeenCalledWith(404);
    expect(borrar.status).toHaveBeenCalledWith(404);
  });
});

describe('evaluaciones (RN-013 y RN-016)', () => {
  it.each([
    [0, 201],
    [100, 201],
    [-1, 400],
    [101, 400],
  ])('should check the grade limits: %s → %s', async (calificacion, estado) => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ estado: 'En Revisión' }]])
      .mockResolvedValueOnce([{ insertId: 3 }])
      .mockResolvedValueOnce([{}]);

    const res = await llamar(evaluaciones.create, { user: INSTRUCTOR, body: { calificacion, id_entregable: 2 } });

    expect(res.status).toHaveBeenCalledWith(estado);
  });

  it('should only grade deliverables of projects "En Revisión" (RN-016)', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ estado: 'Activo' }]]);

    const res = await llamar(evaluaciones.create, { user: INSTRUCTOR, body: { calificacion: 90, id_entregable: 2 } });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/^RN-016/);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('should respond 404 for an unknown deliverable and 400 without grade', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    const desconocido = await llamar(evaluaciones.create, { user: INSTRUCTOR, body: { calificacion: 80, id_entregable: 99 } });
    const sinNota = await llamar(evaluaciones.create, { user: INSTRUCTOR, body: { id_entregable: 2 } });

    expect(desconocido.status).toHaveBeenCalledWith(404);
    expect(sinNota.status).toHaveBeenCalledWith(400);
  });

  it('should list the grades newest first and update one within the limits', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_evaluacion: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    await llamar(evaluaciones.getByEntregable, { params: { id_entregable: '2' } });
    const ok = await llamar(evaluaciones.update, { user: INSTRUCTOR, params: { id: '1' }, body: { calificacion: 100 } });
    const fuera = await llamar(evaluaciones.update, { user: INSTRUCTOR, params: { id: '1' }, body: { calificacion: 100.5 } });
    const noExiste = await llamar(evaluaciones.update, { user: INSTRUCTOR, params: { id: '9' }, body: { comentarios: 'x' } });

    expect(query.mock.calls[0][0]).toMatch(/ORDER BY ev\.fecha_evaluacion DESC/);
    expect(ok.json).toHaveBeenCalledWith({ success: true, message: 'Evaluación actualizada' });
    expect(fuera.status).toHaveBeenCalledWith(400);
    expect(noExiste.status).toHaveBeenCalledWith(404);
  });
});

describe('reuniones', () => {
  const REUNION = { titulo: 'Seguimiento', fecha_reunion: '2026-03-20T10:00:00', id_proyecto: 1, lugar: 'Ambiente 204' };

  it('should schedule the meeting and notify each member of the team', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 12 }])
      .mockResolvedValueOnce([[{ id_usuario: 4 }, { id_usuario: 5 }]])
      .mockResolvedValue([{}]);
    const avisar = vi.spyOn(notificacionesService, 'crearYNotificarMultiples').mockResolvedValue([]);

    const res = await llamar(reuniones.create, { user: INSTRUCTOR, body: REUNION });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [4, 5], titulo: 'Nueva reunión programada' }));
  });

  // Hallazgo S7: el mismo defecto que se corrigió en tareas y mensajes en la semana 5.
  // La reunión ya estaba guardada y, si el aviso fallaba, el API respondía 500.
  it('should still answer 201 when the notice fails after saving the meeting', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 12 }])
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValue([{}]);
    vi.spyOn(notificacionesService, 'crearYNotificarMultiples').mockRejectedValue(new Error('Too many connections'));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await llamar(reuniones.create, { user: INSTRUCTOR, body: REUNION });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(consola).toHaveBeenCalledWith(expect.stringContaining('[notificaciones]'), 'Too many connections');
  });

  it('should require title, date and project', async () => {
    const res = await llamar(reuniones.create, { user: INSTRUCTOR, body: { titulo: 'Sin fecha', id_proyecto: 1 } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should list, update and cancel meetings, and say 404 for unknown ones', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_reunion: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    await llamar(reuniones.getByProyecto, { params: { id_proyecto: '1' } });
    const editada = await llamar(reuniones.update, { user: INSTRUCTOR, params: { id: '1' }, body: { lugar: 'Virtual' } });
    const cancelada = await llamar(reuniones.remove, { user: INSTRUCTOR, params: { id: '1' } });
    const editarOtra = await llamar(reuniones.update, { user: INSTRUCTOR, params: { id: '9' }, body: {} });
    const cancelarOtra = await llamar(reuniones.remove, { user: INSTRUCTOR, params: { id: '9' } });

    expect(query.mock.calls[0][0]).toMatch(/ORDER BY fecha_reunion ASC/);
    expect(editada.json).toHaveBeenCalledWith({ success: true, message: 'Reunión actualizada' });
    expect(cancelada.json).toHaveBeenCalledWith({ success: true, message: 'Reunión cancelada' });
    expect(editarOtra.status).toHaveBeenCalledWith(404);
    expect(cancelarOtra.status).toHaveBeenCalledWith(404);
  });
});

describe('repositorios', () => {
  it('should link the repository with "main" as the default branch', async () => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 4 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(repositorios.create, { user: INSTRUCTOR, body: { url_github: 'https://github.com/sena/sgp', id_proyecto: 1 } });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(query.mock.calls[0][1]).toEqual(['https://github.com/sena/sgp', 'main', 1]);
  });

  it('should require the URL and the project', async () => {
    const res = await llamar(repositorios.create, { user: INSTRUCTOR, body: { id_proyecto: 1 } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should list and update repositories, and say 404 for unknown ones', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_repositorio: 4 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const lista = await llamar(repositorios.getByProyecto, { params: { id_proyecto: '1' } });
    const ok = await llamar(repositorios.update, { user: INSTRUCTOR, params: { id: '4' }, body: { rama_principal: 'develop' } });
    const noExiste = await llamar(repositorios.update, { user: INSTRUCTOR, params: { id: '9' }, body: {} });

    expect(lista.json).toHaveBeenCalledWith({ success: true, data: [{ id_repositorio: 4 }] });
    expect(ok.json).toHaveBeenCalledWith({ success: true, message: 'Repositorio actualizado' });
    expect(noExiste.status).toHaveBeenCalledWith(404);
  });

  it.each([
    [true, 'Repositorio habilitado', 'ACTIVAR'],
    [false, 'Repositorio deshabilitado', 'DESACTIVAR'],
  ])('should enable or disable without deleting (activo=%s)', async (activo, mensaje, accion) => {
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce([{}]);

    const res = await llamar(repositorios.toggleEstado, { user: ADMIN, params: { id: '4' }, body: { activo } });

    expect(res.json).toHaveBeenCalledWith({ success: true, message: mensaje });
    expect(query.mock.calls[1][1][2]).toBe(accion);
  });

  it('should reject an "activo" that is not boolean', async () => {
    const res = await llamar(repositorios.toggleEstado, { user: ADMIN, params: { id: '4' }, body: { activo: 'si' } });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should notify the instructor with high priority when the traffic light turns red', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_instructor: 2, nombre: 'SGP' }]])
      .mockResolvedValue([{}]);
    const avisar = vi.spyOn(notificacionesService, 'crearYNotificar').mockResolvedValue({});

    const res = await llamar(repositorios.setSemaforo, { user: ADMIN, params: { id: '4' }, body: { estado_semaforo: 'rojo', observacion: 'Sin commits' } });

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Estado de semáforo actualizado' });
    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({
      id_usuario: 2, prioridad: 'Alta', mensaje: expect.stringContaining('Observación: Sin commits'),
    }));
  });

  it('should not notify anyone for green, and reject an unknown color', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValue([{}]);
    const avisar = vi.spyOn(notificacionesService, 'crearYNotificar');

    await llamar(repositorios.setSemaforo, { user: ADMIN, params: { id: '4' }, body: { estado_semaforo: 'verde' } });
    const azul = await llamar(repositorios.setSemaforo, { user: ADMIN, params: { id: '4' }, body: { estado_semaforo: 'azul' } });

    expect(avisar).not.toHaveBeenCalled();
    expect(azul.status).toHaveBeenCalledWith(400);
  });
});
