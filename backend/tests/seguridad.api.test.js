import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };

const tokenDe = (usuario, opciones = { expiresIn: '1h' }) => `Bearer ${jwt.sign(usuario, SECRETO, opciones)}`;

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('autenticación', () => {
  it('should respond 401 in JSON when a protected route is called without token', async () => {
    const res = await request(app).get('/api/v1/proyectos');

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ success: false, message: 'Token de acceso requerido' });
  });

  it('should respond 401 when the token already expired', async () => {
    const vencido = tokenDe(APRENDIZ, { expiresIn: -60 });

    const res = await request(app).get('/api/v1/proyectos').set('Authorization', vencido);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token inválido o expirado');
  });
});

describe('autorización por rol', () => {
  it('should respond 403 when an apprentice tries to create a project, without touching the database', async () => {
    // Arrange
    const query = vi.spyOn(db, 'query');

    // Act
    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(APRENDIZ))
      .send({ nombre: 'Proyecto pirata', fecha_inicio: '2026-11-01', id_instructor: 4 });

    // Assert
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });

  it('should respond 403 when the administrator tries to edit a task', async () => {
    const res = await request(app).put('/api/v1/tareas/5').set('Authorization', tokenDe(ADMIN)).send({ porcentaje_avance: 50 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('El administrador solo supervisa las tareas, no puede modificarlas.');
  });

  it('should respond 403 when an instructor edits a task of a project that is not his', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 1, id_asignado: 4 }]]) // la tarea existe
      .mockResolvedValueOnce([[]]);                                  // el proyecto no es suyo

    const res = await request(app).put('/api/v1/tareas/5').set('Authorization', tokenDe(INSTRUCTOR)).send({ porcentaje_avance: 50 });

    expect(res.status).toBe(403);
  });

  it('should let the instructor in charge edit the task', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 1, id_asignado: 4 }]]) // requireTaskEditor: la tarea
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])                 // requireTaskEditor: es su proyecto
      .mockResolvedValueOnce([{ affectedRows: 1 }])                  // UPDATE
      .mockResolvedValueOnce([{}]);                                  // historial

    const res = await request(app).put('/api/v1/tareas/5').set('Authorization', tokenDe(INSTRUCTOR)).send({ porcentaje_avance: 50 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Tarea actualizada' });
  });
});

describe('contrato de errores', () => {
  it('should respond 400 in JSON when the body is malformed JSON', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"correo": "a@b.co",');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ success: false, message: 'JSON inválido' });
  });

  it('should respond 400 when a query parameter has the wrong type', async () => {
    const res = await request(app).get('/api/v1/proyectos?limit=muchos').set('Authorization', tokenDe(ADMIN));

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ campo: 'limit', mensaje: 'limit debe estar entre 1 y 100' }]);
  });

  it('should not show the SQL error to the client when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // el error sí queda en el log del servidor
    vi.spyOn(db, 'query').mockRejectedValueOnce(new Error("ER_NO_SUCH_TABLE: Table 'tareas' doesn't exist"));

    const res = await request(app).get('/api/v1/tareas/recientes/dashboard').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Error interno del servidor' });
    expect(JSON.stringify(res.body)).not.toMatch(/ER_|Table|SELECT/);
  });
});
