import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { register, login, createUserByAdmin } = require('../src/controllers/auth.controller');

const SECRETO = 'secreto_solo_para_tests_unitarios_32chars';
const NUEVO_APRENDIZ = { nombres: 'Ana', apellidos: 'Ruiz', correo: 'ana@sena.edu.co', contrasena: '12345678' };

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('register', () => {
  it('should reject a password of 7 characters', async () => {
    // Arrange: valor límite justo por debajo del mínimo (8)
    const res = crearRes();
    const query = vi.spyOn(db, 'query');

    // Act
    await register(crearReq({ body: { ...NUEVO_APRENDIZ, contrasena: '1234567' } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    expect(query).not.toHaveBeenCalled();
  });

  it('should register as Aprendiz (id_rol 3) a password of exactly 8 characters', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])                    // el correo no existe
      .mockResolvedValueOnce([{ insertId: 20 }]);     // INSERT
    const res = crearRes();

    await register(crearReq({ body: NUEVO_APRENDIZ }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    const [sql, valores] = query.mock.calls[1];
    expect(sql).toContain('VALUES (?,?,?,?,?,?,3)');
    // La contraseña nunca se guarda en texto plano
    expect(valores[3]).not.toBe('12345678');
    expect(await bcrypt.compare('12345678', valores[3])).toBe(true);
  });

  it('should reject an email that is already registered', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 3 }]]);
    const res = crearRes();

    await register(crearReq({ body: NUEVO_APRENDIZ }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'El correo ya está registrado' });
  });

  it('should reject the request when a required field is missing', async () => {
    const res = crearRes();

    await register(crearReq({ body: { ...NUEVO_APRENDIZ, apellidos: '' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('login', () => {
  it('should respond 401 when the password does not match', async () => {
    const hash = await bcrypt.hash('Sena2026*', 4);
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4, correo: 'a@b.co', contrasena: hash, rol: 'Aprendiz' }]]);
    const res = crearRes();

    await login(crearReq({ body: { correo: 'a@b.co', contrasena: 'otra' } }), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Credenciales inválidas' });
  });

  it('should respond 401 when the user does not exist or is inactive', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);
    const res = crearRes();

    await login(crearReq({ body: { correo: 'nadie@b.co', contrasena: 'x' } }), res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return a token with the user role and without the password hash', async () => {
    const hash = await bcrypt.hash('Sena2026*', 4);
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 4, nombres: 'Carlos', correo: 'a@b.co', contrasena: hash, id_rol: 3, rol: 'Aprendiz' }]]);
    const res = crearRes();

    await login(crearReq({ body: { correo: 'a@b.co', contrasena: 'Sena2026*' } }), res);

    const { data } = res.json.mock.calls[0][0];
    expect(jwt.verify(data.token, SECRETO)).toMatchObject({ id: 4, rol: 'Aprendiz' });
    expect(data.usuario).not.toHaveProperty('contrasena');
  });
});

describe('createUserByAdmin', () => {
  it('should respond 403 when trying to create a second administrator', async () => {
    const res = crearRes();

    await createUserByAdmin(crearReq({ body: { ...NUEVO_APRENDIZ, id_rol: 1 } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should respond 400 when trying to create an apprentice from this route', async () => {
    const res = crearRes();

    await createUserByAdmin(crearReq({ body: { ...NUEVO_APRENDIZ, id_rol: '3' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should reject an identification number that already exists', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])                   // correo libre
      .mockResolvedValueOnce([[{ id_usuario: 9 }]]); // cédula repetida
    const res = crearRes();

    await createUserByAdmin(crearReq({ body: { ...NUEVO_APRENDIZ, id_rol: 2, identificacion: '1098765001' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Ya existe un usuario con esa identificación' });
  });

  it('should create the instructor when the data is valid', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 30 }]);
    const res = crearRes();

    await createUserByAdmin(crearReq({ body: { ...NUEVO_APRENDIZ, id_rol: 2 } }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Usuario creado', data: { id_usuario: 30 } });
  });
});
