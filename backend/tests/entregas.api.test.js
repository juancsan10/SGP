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
const OTRO_APRENDIZ = { id: 5, rol: 'Aprendiz' };
const TAREA = { id_tarea: 10, id_asignado: 4, id_instructor: 2, proyecto_estado: 'Activo' };

const tokenDe = (usuario) => `Bearer ${jwt.sign(usuario, SECRETO, { expiresIn: '1h' })}`;

// Stub de la BD: una respuesta por consulta, en el orden en que se hacen
const bdDevuelve = (...respuestas) => {
  const query = vi.spyOn(db, 'query');
  respuestas.forEach((r) => query.mockResolvedValueOnce(r));
  return query;
};

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/v1/entregas/tarea/:id (entregar)', () => {
  it('should register the delivery of the assigned apprentice with 201', async () => {
    // Arrange
    bdDevuelve(
      [[{ id_asignado: 4 }]], // requireTaskOwnerOrAdmin
      [[TAREA]],              // getTask
      [[]],                   // todavía no hay entrega
      [{ insertId: 30 }],     // INSERT
      [{}],                   // historial
    );

    // Act
    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(APRENDIZ))
      .send({ url_entrega: 'https://github.com/equipo/sgp' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, message: 'Entrega registrada correctamente', data: { id_entrega: 30 } });
  });

  it('should respond 403 when another apprentice tries to deliver the task', async () => {
    bdDevuelve([[{ id_asignado: 4 }]]);

    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(OTRO_APRENDIZ))
      .send({ url_entrega: 'https://github.com/otro' });

    expect(res.status).toBe(403);
  });

  it('should respond 403 to the administrator because he only supervises deliveries', async () => {
    bdDevuelve([[{ id_asignado: 4 }]]);

    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(ADMIN))
      .send({ comentario_aprendiz: 'hola' });

    expect(res.status).toBe(403);
  });

  it('should respond 400 when the delivery has no comment, link or file', async () => {
    bdDevuelve([[{ id_asignado: 4 }]], [[TAREA]]);

    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(APRENDIZ)).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Debes aportar comentario, enlace o archivo');
  });

  it('should not let the apprentice change a delivery that is not waiting for correction', async () => {
    bdDevuelve([[{ id_asignado: 4 }]], [[TAREA]], [[{ id_entrega: 30, id_aprendiz: 4, estado: 'Entregada' }]]);

    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(APRENDIZ))
      .send({ comentario_aprendiz: 'cambio de último minuto' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('La entrega no está habilitada para corrección');
  });

  it('should reject deliveries in a finished project', async () => {
    bdDevuelve([[{ id_asignado: 4 }]], [[{ ...TAREA, proyecto_estado: 'Finalizado' }]]);

    const res = await request(app).post('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(APRENDIZ))
      .send({ comentario_aprendiz: 'tarde' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/entregas/tarea/:id/revision (calificar)', () => {
  it('should respond 403 when an apprentice tries to grade', async () => {
    const res = await request(app).put('/api/v1/entregas/tarea/10/revision').set('Authorization', tokenDe(APRENDIZ))
      .send({ estado: 'Aprobada', calificacion: 100 });

    expect(res.status).toBe(403);
  });

  it('should require a grade to approve the delivery', async () => {
    bdDevuelve([[{ id_proyecto: 1 }]]); // es el instructor responsable

    const res = await request(app).put('/api/v1/entregas/tarea/10/revision').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ estado: 'Aprobada' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Para aprobar la entrega debes asignar una calificación (0 a 100)');
  });

  it('should accept a grade of 100 and reject 101', async () => {
    // Valor límite de la escala 0 a 100
    bdDevuelve([[{ id_proyecto: 1 }]], [[{ id_entrega: 30 }]], [{}], [{}], [[{ id_proyecto: 1 }]]);

    const cien = await request(app).put('/api/v1/entregas/tarea/10/revision').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ estado: 'Aprobada', calificacion: 100 });
    const cientoUno = await request(app).put('/api/v1/entregas/tarea/10/revision').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ estado: 'Aprobada', calificacion: 101 });

    expect(cien.status).toBe(200);
    expect(cientoUno.status).toBe(400);
    expect(cientoUno.body.message).toBe('La calificación debe estar entre 0 y 100');
  });
});

describe('GET /api/v1/entregas/tarea/:id (consultar)', () => {
  it('should not let an apprentice see the delivery of a task assigned to someone else', async () => {
    bdDevuelve([[TAREA]]);

    const res = await request(app).get('/api/v1/entregas/tarea/10').set('Authorization', tokenDe(OTRO_APRENDIZ));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Solo puedes consultar la entrega de tu tarea asignada');
  });
});
