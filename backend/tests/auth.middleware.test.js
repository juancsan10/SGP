import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const {
  verifyToken,
  requireRole,
  requireProjectMember,
  requireInstructorOwner,
  requireTaskEditor,
  requireTaskOwnerOrAdmin,
  requireSelfOrAdmin,
  denyAdmin,
} = require('../src/middlewares/auth.middleware');

const SECRETO = 'secreto_solo_para_tests_unitarios_32chars';
const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Stub de la BD: cada llamada a db.query devuelve las filas indicadas, en orden
function bdDevuelve(...respuestas) {
  const query = vi.spyOn(db, 'query');
  for (const filas of respuestas) query.mockResolvedValueOnce([filas]);
  return query;
}

describe('verifyToken', () => {
  it('should respond 401 when the Authorization header is missing', () => {
    const res = crearRes();
    const next = vi.fn();

    verifyToken(crearReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should respond 401 when the token is signed with another secret', () => {
    const token = jwt.sign({ id: 4, rol: 'Aprendiz' }, 'otro_secreto');
    const res = crearRes();
    const next = vi.fn();

    verifyToken(crearReq({ headers: { authorization: `Bearer ${token}` } }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Token inválido o expirado' });
  });

  it('should put the token data in req.user and call next when the token is valid', () => {
    // Arrange
    const token = jwt.sign({ id: 4, rol: 'Aprendiz' }, SECRETO);
    const req = crearReq({ headers: { authorization: `Bearer ${token}` } });
    const next = vi.fn();

    // Act
    verifyToken(req, crearRes(), next);

    // Assert
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ id: 4, rol: 'Aprendiz' });
  });
});

describe('requireRole', () => {
  it('should call next when the user has one of the allowed roles', () => {
    const next = vi.fn();

    requireRole('Administrador', 'Instructor')(crearReq({ user: INSTRUCTOR }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should respond 403 when the user role is not allowed', () => {
    const res = crearRes();
    const next = vi.fn();

    requireRole('Administrador')(crearReq({ user: APRENDIZ }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireProjectMember', () => {
  it('should let the administrator in without querying the database', async () => {
    const query = vi.spyOn(db, 'query');
    const next = vi.fn();

    await requireProjectMember()(crearReq({ user: ADMIN, params: { id: '7' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(query).not.toHaveBeenCalled();
  });

  it('should let in the instructor in charge of the project', async () => {
    bdDevuelve([{ id_proyecto: 7 }]);
    const next = vi.fn();

    await requireProjectMember()(crearReq({ user: INSTRUCTOR, params: { id: '7' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should let in an apprentice who belongs to the project team', async () => {
    const query = bdDevuelve([{ id_equipo: 3 }]);
    const next = vi.fn();

    await requireProjectMember()(crearReq({ user: APRENDIZ, params: { id: '7' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual(['7', 4]);
  });

  it('should respond 403 when the apprentice is not in the team', async () => {
    bdDevuelve([]);
    const res = crearRes();

    await requireProjectMember()(crearReq({ user: APRENDIZ, params: { id: '7' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No perteneces al proyecto solicitado' });
  });

  it('should respond 404 when the task does not exist', async () => {
    bdDevuelve([]);
    const res = crearRes();

    await requireProjectMember('task')(crearReq({ user: APRENDIZ, params: { id: '999' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should pass database errors to the Express error handler', async () => {
    const error = new Error('conexión perdida');
    vi.spyOn(db, 'query').mockRejectedValueOnce(error);
    const next = vi.fn();

    await requireProjectMember('task')(crearReq({ user: APRENDIZ, params: { id: '1' } }), crearRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('requireInstructorOwner', () => {
  it('should respond 403 to the administrator because he only supervises', async () => {
    const res = crearRes();
    const next = vi.fn();

    await requireInstructorOwner()(crearReq({ user: ADMIN, params: { id: '7' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should respond 403 to an instructor who is not in charge of the project', async () => {
    bdDevuelve([]);
    const res = crearRes();

    await requireInstructorOwner()(crearReq({ user: INSTRUCTOR, params: { id: '7' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should let in the instructor in charge of the project', async () => {
    bdDevuelve([{ id_proyecto: 7 }]);
    const next = vi.fn();

    await requireInstructorOwner()(crearReq({ user: INSTRUCTOR, params: { id: '7' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});

describe('requireTaskEditor', () => {
  it('should respond 403 to the administrator', async () => {
    const res = crearRes();

    await requireTaskEditor(crearReq({ user: ADMIN, params: { id: '10' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should respond 404 when the task does not exist', async () => {
    bdDevuelve([]);
    const res = crearRes();

    await requireTaskEditor(crearReq({ user: INSTRUCTOR, params: { id: '10' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should let the instructor in charge edit the task', async () => {
    bdDevuelve([{ id_proyecto: 7, id_asignado: 4 }], [{ id_proyecto: 7 }]);
    const next = vi.fn();

    await requireTaskEditor(crearReq({ user: INSTRUCTOR, params: { id: '10' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should respond 403 to the apprentice even if the task is assigned to him', async () => {
    bdDevuelve([{ id_proyecto: 7, id_asignado: 4 }]);
    const res = crearRes();
    const next = vi.fn();

    await requireTaskEditor(crearReq({ user: APRENDIZ, params: { id: '10' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireTaskOwnerOrAdmin', () => {
  it('should let the assigned apprentice deliver even if the id comes as text from the database', async () => {
    // Valor límite: MySQL puede devolver el id como texto y el token lo trae como número
    bdDevuelve([{ id_asignado: '4' }]);
    const next = vi.fn();

    await requireTaskOwnerOrAdmin(crearReq({ user: APRENDIZ, params: { id: '10' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should respond 403 to an apprentice who is not assigned to the task', async () => {
    bdDevuelve([{ id_asignado: 5 }]);
    const res = crearRes();

    await requireTaskOwnerOrAdmin(crearReq({ user: APRENDIZ, params: { id: '10' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should respond 403 to the administrator because he only supervises deliveries', async () => {
    bdDevuelve([{ id_asignado: 4 }]);
    const res = crearRes();

    await requireTaskOwnerOrAdmin(crearReq({ user: ADMIN, params: { id: '10' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireSelfOrAdmin', () => {
  it('should let a user change his own account when the id comes as text in the URL', () => {
    const next = vi.fn();

    requireSelfOrAdmin()(crearReq({ user: APRENDIZ, params: { id: '4' } }), crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should respond 403 when a user tries to change another account', () => {
    const res = crearRes();

    requireSelfOrAdmin('id_usuario')(crearReq({ user: APRENDIZ, params: { id_usuario: '5' } }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('denyAdmin', () => {
  it('should tell the administrator which action he cannot do', () => {
    const res = crearRes();

    denyAdmin('calificar')(crearReq({ user: ADMIN }), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'El administrador solo revisa; no puede calificar.' });
  });
});
