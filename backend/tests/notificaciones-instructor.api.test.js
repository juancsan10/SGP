import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Punto 7 (#19): el Instructor notifica solo a sus aprendices, al equipo de
// uno de sus proyectos o a un aprendiz suyo; la bandeja muestra quién envía.

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificaciones = require('../src/services/notificaciones.service');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const ADMIN = { id: 1, rol: 'Administrador' };
const tokenDe = (u) => `Bearer ${jwt.sign(u, SECRETO, { expiresIn: '1h' })}`;
const AVISO = { titulo: 'Entrega del viernes', mensaje: 'Recuerden subir el avance', tipo: 'informativo', prioridad: 'Media' };

beforeAll(() => { process.env.JWT_SECRET = SECRETO; });
beforeEach(() => { vi.spyOn(notificaciones, 'crearYNotificarMultiples').mockResolvedValue([]); });
afterEach(() => { vi.restoreAllMocks(); });

const enviar = (usuario, cuerpo) => request(app).post('/api/v1/notificaciones/broadcast').set('Authorization', tokenDe(usuario)).send({ ...AVISO, ...cuerpo });

describe('POST /notificaciones/broadcast como Instructor', () => {
  it('should notify every active apprentice of his projects with MisAprendices', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4 }, { id_usuario: 5 }]]).mockResolvedValue([{}]);

    // Act
    const res = await enviar(INSTRUCTOR, { rol_destino: 'MisAprendices' });

    // Assert
    expect(res.status).toBe(201);
    expect(spy.mock.calls[0][0]).toContain('p.id_instructor = ?');
    expect(spy.mock.calls[0][1]).toEqual([2]);
    expect(notificaciones.crearYNotificarMultiples).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [4, 5], id_creador: 2 }));
  });

  it('should notify the team of one of his projects', async () => {
    // Arrange
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 3 }]])
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValue([{}]);

    // Act
    const res = await enviar(INSTRUCTOR, { id_proyecto: 3 });

    // Assert
    expect(res.status).toBe(201);
    expect(notificaciones.crearYNotificarMultiples).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [4] }));
  });

  it('should reject a project that belongs to another instructor', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    // Act
    const res = await enviar(INSTRUCTOR, { id_proyecto: 9 });

    // Assert
    expect(res.status).toBe(403);
    expect(notificaciones.crearYNotificarMultiples).not.toHaveBeenCalled();
  });

  it('should reject a user that is not an apprentice of his projects', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    // Act
    const res = await enviar(INSTRUCTOR, { id_usuario: 1 });

    // Assert
    expect(res.status).toBe(403);
  });

  it.each(['Aprendiz', 'Instructor', 'Todos'])('should not let the instructor notify the whole role %s', async (rol) => {
    // Arrange
    const spy = vi.spyOn(db, 'query');

    // Act
    const res = await enviar(INSTRUCTOR, { rol_destino: rol });

    // Assert
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('POST /notificaciones/broadcast como Administrador a un proyecto', () => {
  it('should notify the project team and its instructor', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4 }, { id_usuario: 2 }]]).mockResolvedValue([{}]);

    // Act
    const res = await enviar(ADMIN, { id_proyecto: 3 });

    // Assert
    expect(res.status).toBe(201);
    expect(spy.mock.calls[0][1]).toEqual([3, 3]);
    expect(notificaciones.crearYNotificarMultiples).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [4, 2] }));
  });
});

describe('GET /notificaciones/:id_usuario', () => {
  it('should include who sent each notification and his role', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_notificacion: 1, creador_nombre: 'Diana Ríos', creador_rol: 'Administrador' }]]);

    // Act
    const res = await request(app).get('/api/v1/notificaciones/2').set('Authorization', tokenDe(INSTRUCTOR));

    // Assert
    expect(res.status).toBe(200);
    expect(spy.mock.calls[0][0]).toContain('AS creador_rol');
    expect(res.body.data[0].creador_rol).toBe('Administrador');
  });
});
