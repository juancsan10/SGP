import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const ADMIN = { id: 1, rol: 'Administrador' };

const tokenDe = (usuario, opciones = { expiresIn: '1h' }) => `Bearer ${jwt.sign(usuario, SECRETO, opciones)}`;

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('API /api/v1/proyectos', () => {
  // 1. POST /api/v1/proyectos como instructor → 201 con id_proyecto; revisa código, cuerpo y Content-Type.
  it('POST /api/v1/proyectos como instructor responde 201 en JSON con id_proyecto', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ total: 0 }]]) // RN-002: conteo de proyectos activos
      .mockResolvedValueOnce([{ insertId: 77 }]) // INSERT del proyecto
      .mockResolvedValueOnce([{}]); // registro en historial

    const res = await request(app)
      .post('/api/v1/proyectos')
      .set('Authorization', tokenDe(INSTRUCTOR))
      .send({
        nombre: 'Nuevo Proyecto SENA ADSO',
        descripcion: 'Plataforma web de proyectos formativos',
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-07-01',
        id_instructor: 2,
      });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      success: true,
      message: 'Proyecto creado',
      data: { id_proyecto: 77 },
    });
  });

  // 2. POST sin nombre → 400 "Error de validación".
  it('POST /api/v1/proyectos sin nombre responde 400 con "Error de validación"', async () => {
    const query = vi.spyOn(db, 'query');

    const res = await request(app)
      .post('/api/v1/proyectos')
      .set('Authorization', tokenDe(INSTRUCTOR))
      .send({
        fecha_inicio: '2026-03-01',
        fecha_fin: '2026-07-01',
        id_instructor: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Error de validación');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'nombre' }),
      ])
    );
    // Express-validator rechaza la petición antes de consultar la base de datos
    expect(query).not.toHaveBeenCalled();
  });

  // 3. GET /api/v1/proyectos/abc → 400 y GET /api/v1/proyectos/999 → 404 "Proyecto no encontrado".
  describe('GET /api/v1/proyectos/:id', () => {
    it('GET con id alfanumérico (/abc) responde 400 "Error de validación"', async () => {
      // Para resource='project', resolveProjectId devuelve 'abc' sin consultar la BD.
      // requireProjectMember hace una consulta para comprobar pertenencia:
      // SELECT id_proyecto FROM proyectos WHERE id_proyecto = 'abc' AND id_instructor = 2
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[{ id_proyecto: 'abc' }]]);

      const res = await request(app)
        .get('/api/v1/proyectos/abc')
        .set('Authorization', tokenDe(INSTRUCTOR));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Error de validación');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ campo: 'id' }),
        ])
      );
    });

    it('GET con id numérico inexistente (/999) responde 404 "Proyecto no encontrado"', async () => {
      // 1. requireProjectMember comprueba pertenencia: SELECT id_proyecto FROM proyectos WHERE id_proyecto = 999 AND id_instructor = 2
      // 2. ctrl.getById busca el proyecto en la BD: SELECT p.* FROM proyectos ... WHERE p.id_proyecto = 999 (retorna vacío -> 404)
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[{ id_proyecto: 999 }]])
        .mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/v1/proyectos/999')
        .set('Authorization', tokenDe(INSTRUCTOR));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Proyecto no encontrado',
      });
    });
  });

  // 4. PUT que baja el avance → 400 (RN-014).
  it('PUT /api/v1/proyectos/:id que intenta bajar el avance responde 400 (RN-014)', async () => {
    // MUTANTE DOCUMENTADO:
    // Si un mutante altera la condición "porcentaje_avance < parseFloat(actual[0].porcentaje_avance)"
    // para permitir avances decrecientes (o elimina la validación RN-014), este test falla
    // porque espera un código 400 y mensaje específico de RN-014.
    //
    // Orden de consultas por middlewares y controlador:
    // 1. requireProjectManager -> resolveProjectId (SELECT id_proyecto FROM proyectos WHERE id_proyecto = 1)
    // 2. requireProjectManager -> comprobación (SELECT id_proyecto FROM proyectos WHERE id_proyecto = 1 AND id_instructor = 2)
    // 3. ctrl.update -> SELECT fecha_inicio, fecha_fin, estado, porcentaje_avance (retorna avance previo de 60%)
    // 4. ctrl.update -> SELECT porcentaje_avance (retorna 60%)
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])
      .mockResolvedValueOnce([[{ fecha_inicio: '2026-01-01', fecha_fin: '2026-05-01', estado: 'Activo', porcentaje_avance: '60.00' }]])
      .mockResolvedValueOnce([[{ porcentaje_avance: '60.00' }]]);

    const res = await request(app)
      .put('/api/v1/proyectos/1')
      .set('Authorization', tokenDe(INSTRUCTOR))
      .send({ porcentaje_avance: 40 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'RN-014: El avance no puede disminuir',
    });
  });

  // 5. DELETE → 200 "Proyecto cancelado (eliminación lógica)", comprobando que hace UPDATE … 'Cancelado' y no un DELETE.
  it('DELETE /api/v1/proyectos/:id responde 200 con cancelación lógica mediante UPDATE y no DELETE físico', async () => {
    // 1. requireProjectManager -> resolveProjectId
    // 2. requireProjectManager -> instructor responsable
    // 3. ctrl.remove -> UPDATE proyectos SET estado = 'Cancelado'
    // 4. registrarCambio -> historial
    const querySpy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{}]);

    const res = await request(app)
      .delete('/api/v1/proyectos/1')
      .set('Authorization', tokenDe(INSTRUCTOR));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Proyecto cancelado (eliminación lógica)',
    });

    // Comprobar que ejecutó UPDATE estado = 'Cancelado' y en ningún momento un DELETE FROM proyectos
    const updateCall = querySpy.mock.calls.find((call) =>
      typeof call[0] === 'string' && /UPDATE\s+proyectos\s+SET\s+estado\s*=\s*'Cancelado'/i.test(call[0])
    );
    expect(updateCall).toBeDefined();

    const deleteCall = querySpy.mock.calls.find((call) =>
      typeof call[0] === 'string' && /DELETE\s+FROM\s+proyectos/i.test(call[0])
    );
    expect(deleteCall).toBeUndefined();
  });
});
