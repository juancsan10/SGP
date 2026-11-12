import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const {
  getAll,
  getById,
  buscarPorIdentificacion,
  update,
  remove,
  activar,
} = require('../src/controllers/usuarios.controller');

const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usuarios.controller', () => {
  describe('getAll', () => {
    it('devuelve el listado de usuarios y los metadatos de paginación', async () => {
      const usuariosMock = [
        { id_usuario: 1, nombres: 'Laura', apellidos: 'Gómez', rol: 'Instructor' },
      ];
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([usuariosMock])
        .mockResolvedValueOnce([[{ total: 1 }]]);

      const req = crearReq({ query: { limit: '10', offset: '0' } });
      const res = crearRes();

      await getAll(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: usuariosMock,
        meta: { total: 1, limit: 10, offset: 0 },
      });
    });
  });

  describe('getById', () => {
    it('responde 404 cuando el usuario no existe', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

      const req = crearReq({ params: { id: '999' } });
      const res = crearRes();

      await getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('responde 200 con la información del usuario si existe', async () => {
      const usuario = { id_usuario: 2, nombres: 'Carlos', apellidos: 'Herrera' };
      vi.spyOn(db, 'query').mockResolvedValueOnce([[usuario]]);

      const req = crearReq({ params: { id: '2' } });
      const res = crearRes();

      await getById(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: usuario });
    });
  });

  describe('buscarPorIdentificacion', () => {
    it('responde 400 cuando la identificación tiene formato inválido', async () => {
      const req = crearReq({ query: { identificacion: '12' } });
      const res = crearRes();

      await buscarPorIdentificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Identificación inválida' });
    });

    it('responde 404 cuando no encuentra un usuario con esa cédula', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

      const req = crearReq({ query: { identificacion: '1098765432' } });
      const res = crearRes();

      await buscarPorIdentificacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responde 200 con el usuario encontrado', async () => {
      const usuario = { id_usuario: 4, nombres: 'Carlos', identificacion: '1098765432' };
      vi.spyOn(db, 'query').mockResolvedValueOnce([[usuario]]);

      const req = crearReq({ query: { identificacion: '1098765432' } });
      const res = crearRes();

      await buscarPorIdentificacion(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: usuario });
    });
  });

  describe('update', () => {
    it('responde 403 si un no-administrador intenta modificar el correo o la identificación', async () => {
      const req = crearReq({
        user: INSTRUCTOR,
        params: { id: '2' },
        body: { correo: 'nuevo@sena.edu.co' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Solo el Administrador puede modificar el correo o la identificación',
      });
    });

    it('responde 400 si el correo a actualizar tiene formato inválido', async () => {
      const req = crearReq({
        user: ADMIN,
        params: { id: '2' },
        body: { correo: 'invalido' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Correo electrónico inválido',
      });
    });

    it('responde 409 si el correo ya pertenece a otro usuario', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 9 }]]);

      const req = crearReq({
        user: ADMIN,
        params: { id: '2' },
        body: { correo: 'repetido@sena.edu.co' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ese correo ya está registrado por otro usuario',
      });
    });

    it('responde 400 si la identificación tiene formato inválido (menor a 5 o mayor a 15)', async () => {
      const req = crearReq({
        user: ADMIN,
        params: { id: '2' },
        body: { identificacion: '123' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'La identificación debe tener entre 5 y 15 dígitos',
      });
    });

    it('responde 409 si la identificación ya pertenece a otro usuario', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 9 }]]);

      const req = crearReq({
        user: ADMIN,
        params: { id: '2' },
        body: { identificacion: '12345678' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Esa identificación ya está registrada por otro usuario',
      });
    });

    it('responde 404 si el usuario a modificar no existe', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);

      const req = crearReq({
        user: ADMIN,
        params: { id: '999' },
        body: { nombres: 'Nuevo Nombre' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responde 200 cuando se actualiza exitosamente', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
        .mockResolvedValueOnce([{}]);                 // historial

      const req = crearReq({
        user: ADMIN,
        params: { id: '2' },
        body: { nombres: 'Carlos Andrés' },
      });
      const res = crearRes();

      await update(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario actualizado',
      });
    });
  });

  describe('remove (desactivación lógica)', () => {
    it('responde 403 si se intenta desactivar al Administrador único', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[{ nombre_rol: 'Administrador' }]]);

      const req = crearReq({ user: ADMIN, params: { id: '1' } });
      const res = crearRes();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No se puede desactivar al Administrador único del sistema',
      });
    });

    it('responde 404 si el usuario a desactivar no existe', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[{ nombre_rol: 'Aprendiz' }]])
        .mockResolvedValueOnce([{ affectedRows: 0 }]);

      const req = crearReq({ user: ADMIN, params: { id: '999' } });
      const res = crearRes();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responde 200 cuando el usuario es desactivado exitosamente', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[{ nombre_rol: 'Instructor' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{}]);

      const req = crearReq({ user: ADMIN, params: { id: '2' } });
      const res = crearRes();

      await remove(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario desactivado',
      });
    });
  });

  describe('activar', () => {
    it('responde 404 si el usuario no existe', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([{ affectedRows: 0 }]);

      const req = crearReq({ user: ADMIN, params: { id: '999' } });
      const res = crearRes();

      await activar(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responde 200 cuando se activa exitosamente', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{}]);

      const req = crearReq({ user: ADMIN, params: { id: '2' } });
      const res = crearRes();

      await activar(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario activado',
      });
    });
  });
});

describe('usuarios.controller — alcance del Instructor', () => {
  it('should list only the apprentices of the instructor projects by default', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4, nombres: 'Carlos', rol: 'Aprendiz', proyectos: 'SGP' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);
    const req = crearReq({ user: INSTRUCTOR, query: { rol: 'Administrador' } });
    const res = crearRes();

    // Act
    await getAll(req, res);

    // Assert: ignora ?rol, fuerza Aprendiz y filtra por sus proyectos
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain("r.nombre_rol = 'Aprendiz'");
    expect(sql).toContain('p.id_instructor = ?');
    expect(sql).toContain('AS proyectos');
    expect(params).toEqual([2, 2, 50, 0]);
    expect(params).not.toContain('Administrador');
    expect(res.json.mock.calls[0][0].data[0].proyectos).toBe('SGP');
  });

  it('should list active apprentices without project filter when alcance=disponibles', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);
    const req = crearReq({ user: INSTRUCTOR, query: { alcance: 'disponibles' } });

    // Act
    await getAll(req, crearRes());

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain("r.nombre_rol = 'Aprendiz'");
    expect(sql).toContain('u.estado = 1');
    expect(sql).not.toContain('p.id_instructor = ?');
    expect(params).toEqual([50, 0]);
  });

  it('should keep the full list for the Administrador', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    // Act
    await getAll(crearReq({ user: ADMIN, query: { rol: 'Instructor' } }), crearRes());

    // Assert
    const [sql, params] = spy.mock.calls[0];
    expect(sql).not.toContain("r.nombre_rol = 'Aprendiz'");
    expect(params).toEqual(['Instructor', 50, 0]);
  });

  it('should only find apprentices when an Instructor searches by identification', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const req = crearReq({ user: INSTRUCTOR, query: { identificacion: '1098765001', rol: 'Administrador' } });
    const res = crearRes();

    // Act
    await buscarPorIdentificacion(req, res);

    // Assert
    expect(spy.mock.calls[0][1]).toEqual(['1098765001', 'Aprendiz']);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('rutas de usuarios — acciones solo del Administrador', () => {
  it('should reject activating, deactivating or deleting users with an Instructor token', async () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    const request = require('supertest');
    const app = require('../src/app');
    process.env.JWT_SECRET = 'secreto_solo_para_tests_de_api_32chars';
    const token = `Bearer ${jwt.sign(INSTRUCTOR, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
    const spy = vi.spyOn(db, 'query');

    // Act
    const respuestas = await Promise.all([
      request(app).put('/api/v1/usuarios/4/activar').set('Authorization', token),
      request(app).delete('/api/v1/usuarios/4').set('Authorization', token),
      request(app).post('/api/v1/usuarios/4/eliminacion').set('Authorization', token),
    ]);

    // Assert
    expect(respuestas.map(r => r.status)).toEqual([403, 403, 403]);
    expect(spy).not.toHaveBeenCalled();
  });
});
