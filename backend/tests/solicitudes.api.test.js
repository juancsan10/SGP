import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Contrato de /solicitudes con lo que usa SolicitudesPanel.jsx

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const ADMIN = { id: 1, rol: 'Administrador' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const tokenDe = (usuario) => `Bearer ${jwt.sign(usuario, SECRETO, { expiresIn: '1h' })}`;

const SOLICITUD = { tipo: 'Soporte técnico', asunto: 'Clave', descripcion: 'No me llega el enlace' };

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/solicitudes', () => {
  it('should create the request with an asunto of 5 characters, the same minimum as the form', async () => {
    // Arrange
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 12 }])        // INSERT solicitud
      .mockResolvedValueOnce([[{ id_usuario: 1 }]])     // administradores a los que se avisa (HU-28)
      .mockResolvedValue([{}]);                         // aviso al admin + historial

    // Act
    const res = await request(app).post('/api/v1/solicitudes').set('Authorization', tokenDe(APRENDIZ)).send(SOLICITUD);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, message: 'Solicitud enviada al Administrador', data: { id_solicitud: 12 } });
  });

  it('should reject an asunto of 4 characters', async () => {
    const res = await request(app).post('/api/v1/solicitudes').set('Authorization', tokenDe(APRENDIZ))
      .send({ ...SOLICITUD, asunto: 'Clav' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'El asunto debe tener entre 5 y 150 caracteres' });
  });

  it('should respond 403 when the apprentice links a project where he does not participate', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

    const res = await request(app).post('/api/v1/solicitudes').set('Authorization', tokenDe(APRENDIZ))
      .send({ ...SOLICITUD, id_proyecto: '9' });

    expect(res.status).toBe(403);
  });

  it('should only accept the types returned by /solicitudes/tipos', async () => {
    const tipos = await request(app).get('/api/v1/solicitudes/tipos').set('Authorization', tokenDe(APRENDIZ));
    const invalida = await request(app).post('/api/v1/solicitudes').set('Authorization', tokenDe(APRENDIZ))
      .send({ ...SOLICITUD, tipo: 'Queja' });

    expect(tipos.body.data).toContain('Soporte técnico');
    expect(invalida.status).toBe(400);
  });
});

describe('GET /api/v1/solicitudes (administrador)', () => {
  it('should send meta.resumen with the three states, which the admin tabs show', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])                                        // filas
      .mockResolvedValueOnce([[{ total: 3 }]])                            // total
      .mockResolvedValueOnce([[{ estado: 'Pendiente', total: '3' }]]);    // conteo por estado

    const res = await request(app).get('/api/v1/solicitudes?estado=Pendiente').set('Authorization', tokenDe(ADMIN));

    expect(res.status).toBe(200);
    // El estado sin solicitudes también llega, en 0; el conteo llega como número aunque MySQL lo dé como texto
    expect(res.body.meta.resumen).toEqual({ Pendiente: 3, Atendida: 0, Rechazada: 0 });
  });

  it('should respond 403 when an apprentice asks for every request', async () => {
    const res = await request(app).get('/api/v1/solicitudes').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/v1/solicitudes/:id/resolver', () => {
  it('should respond 409 when the request was already resolved', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_solicitud: 7, estado: 'Atendida' }]]);

    const res = await request(app).put('/api/v1/solicitudes/7/resolver').set('Authorization', tokenDe(ADMIN))
      .send({ estado: 'Rechazada', respuesta: 'No procede' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('La solicitud ya fue resuelta');
  });

  it('should require an answer of at least 5 characters, like the admin modal', async () => {
    const res = await request(app).put('/api/v1/solicitudes/7/resolver').set('Authorization', tokenDe(ADMIN))
      .send({ estado: 'Rechazada', respuesta: 'No.' });

    expect(res.status).toBe(400);
  });
});
