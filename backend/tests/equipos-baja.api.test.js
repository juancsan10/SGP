import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// La solicitud de baja que hace el Instructor exige un motivo (mín. 10 caracteres),
// igual que el formulario de ProyectoDetallePage.jsx.

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const tokenDe = (usuario) => `Bearer ${jwt.sign(usuario, SECRETO, { expiresIn: '1h' })}`;

// Consultas previas comunes: middleware (proyecto del equipo + instructor dueño) y el registro de equipo.
function mockHastaElControlador() {
  return vi.spyOn(db, 'query')
    .mockResolvedValueOnce([[{ id_proyecto: 3 }]])                               // resolveProjectId('team')
    .mockResolvedValueOnce([[{ id_proyecto: 3 }]])                               // instructor responsable
    .mockResolvedValueOnce([[{ id_equipo: 9, id_proyecto: 3, id_usuario: 4 }]]); // registro de equipo
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DELETE /api/v1/equipos/:id (Instructor solicita baja)', () => {
  it('should reject the request with 400 when the motivo is missing', async () => {
    // Arrange
    const spy = mockHastaElControlador();

    // Act
    const res = await request(app).delete('/api/v1/equipos/9').set('Authorization', tokenDe(INSTRUCTOR)).send({});

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(spy.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO solicitudes_equipo'))).toBe(false);
  });

  it('should reject the request with 400 when the motivo has only spaces or fewer than 10 characters', async () => {
    // Arrange
    mockHastaElControlador();

    // Act
    const res = await request(app).delete('/api/v1/equipos/9').set('Authorization', tokenDe(INSTRUCTOR)).send({ motivo: '   corto   ' });

    // Assert
    expect(res.status).toBe(400);
  });

  it('should create the request with the trimmed motivo when it has at least 10 characters', async () => {
    // Arrange
    const spy = mockHastaElControlador()
      .mockResolvedValueOnce([[]])                  // sin solicitud pendiente
      .mockResolvedValueOnce([{ insertId: 7 }])     // INSERT solicitud
      .mockResolvedValue([{}]);                     // historial

    // Act
    const res = await request(app).delete('/api/v1/equipos/9').set('Authorization', tokenDe(INSTRUCTOR))
      .send({ motivo: '  No asiste a las reuniones  ' });

    // Assert
    expect(res.status).toBe(202);
    const insert = spy.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO solicitudes_equipo'));
    expect(insert[1]).toEqual(['9', 3, 4, 'No asiste a las reuniones', 2]);
  });
});
