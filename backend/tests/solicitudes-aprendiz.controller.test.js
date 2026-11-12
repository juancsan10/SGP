import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificaciones = require('../src/services/notificaciones.service');
const { create, mias, resolver } = require('../src/controllers/solicitudes-aprendiz.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const ADMIN = { id: 1, rol: 'Administrador' };
const DATOS = {
  nombres: 'Sofía', apellidos: 'Martínez', correo: 'Sofia.Martinez@sgpsena.local', identificacion: '1098765999',
  ficha: '3228970', programa_formacion: 'Análisis y Desarrollo de Software', id_proyecto: 3, contrasena: 'Sena2026x',
};

beforeEach(() => {
  vi.spyOn(notificaciones, 'crearYNotificarMultiples').mockResolvedValue();
  vi.spyOn(notificaciones, 'crearYNotificar').mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /solicitudes/aprendices (Instructor)', () => {
  it.each([
    ['ficha', { ficha: '' }],
    ['programa', { programa_formacion: '' }],
    ['identificación', { identificacion: '12' }],
    ['proyecto', { id_proyecto: undefined }],
    ['contraseña', { contrasena: 'solo-letras' }],
  ])('should reject the request with 400 when %s is missing or invalid', async (_campo, cambio) => {
    // Arrange
    const spy = vi.spyOn(db, 'query');
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: { ...DATOS, ...cambio } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should reject a project that does not belong to the instructor', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: DATOS }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should reject an email that already has an account', async () => {
    // Arrange
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 3, nombre: 'SGP' }]])
      .mockResolvedValueOnce([[{ correo: 'sofia.martinez@sgpsena.local', identificacion: '1' }]]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: DATOS }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toBe('Ya existe una cuenta con ese correo');
  });

  it('should store the request with a hashed password and notify the administrators', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 3, nombre: 'SGP' }]]) // proyecto propio
      .mockResolvedValueOnce([[]])                                 // sin cuenta con ese correo/cc
      .mockResolvedValueOnce([[]])                                 // sin solicitud pendiente igual
      .mockResolvedValueOnce([{ insertId: 11 }])                   // INSERT
      .mockResolvedValueOnce([[{ id_usuario: 1 }]])                // administradores
      .mockResolvedValue([{}]);                                    // historial
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: DATOS }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    const [, valores] = spy.mock.calls[3];
    expect(valores.slice(0, 8)).toEqual([2, 3, 'Sofía', 'Martínez', 'sofia.martinez@sgpsena.local', '1098765999', '3228970', 'Análisis y Desarrollo de Software']);
    expect(valores[8]).toMatch(/^\$2[aby]\$10\$/);
    expect(valores).not.toContain('Sena2026x');
    expect(notificaciones.crearYNotificarMultiples).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [1] }));
  });
});

describe('GET /solicitudes/aprendices/mias', () => {
  it('should never select the password hash', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    // Act
    await mias(crearReq({ user: INSTRUCTOR }), crearRes());

    // Assert
    expect(spy.mock.calls[0][0]).not.toContain('contrasena_hash');
    expect(spy.mock.calls[0][1]).toEqual([2]);
  });
});

describe('PUT /solicitudes/aprendices/:id/resolver (Administrador)', () => {
  const PENDIENTE = { id_solicitud_aprendiz: 11, id_instructor: 2, id_proyecto: 3, nombres: 'Sofía', apellidos: 'Martínez',
    correo: 'sofia.martinez@sgpsena.local', identificacion: '1098765999', ficha: '3228970',
    programa_formacion: 'ADSO', contrasena_hash: '$2a$10$hash', estado: 'Pendiente' };

  function conexionFalsa(respuestas) {
    const conn = {
      query: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue(),
      commit: vi.fn().mockResolvedValue(),
      rollback: vi.fn().mockResolvedValue(),
      release: vi.fn(),
    };
    respuestas.forEach(r => conn.query.mockResolvedValueOnce(r));
    vi.spyOn(db, 'getConnection').mockResolvedValue(conn);
    vi.spyOn(db, 'query').mockResolvedValue([{}]); // historial
    return conn;
  }

  it('should create the apprentice account and add it to the project team when approved', async () => {
    // Arrange
    const conn = conexionFalsa([
      [[PENDIENTE]],            // SELECT … FOR UPDATE
      [[]], [[]],               // sin duplicados
      [{ insertId: 40 }],       // INSERT usuarios
      [{}],                     // INSERT equipos_proyecto
      [{}],                     // UPDATE solicitud
    ]);
    const res = crearRes();

    // Act
    await resolver(crearReq({ user: ADMIN, params: { id: '11' }, body: { estado: 'Aprobada', respuesta: 'Datos verificados' } }), res);

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { id_usuario: 40 } }));
    const insertUsuario = conn.query.mock.calls[3];
    expect(insertUsuario[0]).toContain('INSERT INTO usuarios');
    expect(insertUsuario[1]).toEqual(['Sofía', 'Martínez', 'sofia.martinez@sgpsena.local', '1098765999', '$2a$10$hash', '3228970', 'ADSO', 3]);
    expect(conn.query.mock.calls[4][1]).toEqual([3, 40, 'Aprendiz']);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
    expect(notificaciones.crearYNotificar).toHaveBeenCalledWith(expect.objectContaining({ id_usuario: 2, titulo: 'Aprendiz creado' }));
  });

  it('should not create any account when rejected', async () => {
    // Arrange
    const conn = conexionFalsa([[[PENDIENTE]], [{}]]);
    const res = crearRes();

    // Act
    await resolver(crearReq({ user: ADMIN, params: { id: '11' }, body: { estado: 'Rechazada', respuesta: 'La ficha no corresponde' } }), res);

    // Assert
    expect(conn.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO usuarios'))).toBe(false);
    expect(conn.query.mock.calls[1][1]).toEqual(['Rechazada', 'La ficha no corresponde', 1, null, 11]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Solicitud rechazada' }));
  });

  it('should answer 409 and roll back when the request was already resolved', async () => {
    // Arrange
    const conn = conexionFalsa([[[{ ...PENDIENTE, estado: 'Aprobada' }]]]);
    const res = crearRes();

    // Act
    await resolver(crearReq({ user: ADMIN, params: { id: '11' }, body: { estado: 'Aprobada', respuesta: 'Datos verificados' } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });

  it('should require an answer for the instructor', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'getConnection');
    const res = crearRes();

    // Act
    await resolver(crearReq({ user: ADMIN, params: { id: '11' }, body: { estado: 'Aprobada', respuesta: '' } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('rutas de solicitudes de aprendiz — permisos', () => {
  it('should only let the Instructor request and only the Administrador resolve', async () => {
    // Arrange
    const jwt = require('jsonwebtoken');
    const request = require('supertest');
    const app = require('../src/app');
    process.env.JWT_SECRET = 'secreto_solo_para_tests_de_api_32chars';
    const token = (u) => `Bearer ${jwt.sign(u, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
    const APRENDIZ = { id: 4, rol: 'Aprendiz' };
    const spy = vi.spyOn(db, 'query');

    // Act
    const [aprendizCrea, adminCrea, instructorResuelve, instructorLista] = await Promise.all([
      request(app).post('/api/v1/solicitudes/aprendices').set('Authorization', token(APRENDIZ)).send(DATOS),
      request(app).post('/api/v1/solicitudes/aprendices').set('Authorization', token(ADMIN)).send(DATOS),
      request(app).put('/api/v1/solicitudes/aprendices/11/resolver').set('Authorization', token(INSTRUCTOR)).send({ estado: 'Aprobada', respuesta: 'ok ok ok' }),
      request(app).get('/api/v1/solicitudes/aprendices').set('Authorization', token(INSTRUCTOR)),
    ]);

    // Assert
    expect([aprendizCrea.status, adminCrea.status, instructorResuelve.status, instructorLista.status]).toEqual([403, 403, 403, 403]);
    expect(spy).not.toHaveBeenCalled();
  });
});
