import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Pasos 2 y 3 de la recuperación (HU-16). La BD se reemplaza con un STUB (vi.spyOn(db, 'query')),
// una respuesta por consulta y en orden. El reloj no se toca: la vigencia la calcula MySQL (NOW()),
// así que el stub entrega directamente "vigente: 1" o "vigente: 0".
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { verifyResetCode, resetPassword } = require('../src/controllers/auth.controller');

const SECRETO = 'secreto_solo_para_tests_de_codigo_32';
const CORREO = 'carlos.herrera@sgpsena.local';
const hmac = (valor) => crypto.createHmac('sha256', SECRETO).update(String(valor)).digest('hex');

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const codigoGuardado = ({ intentos = 0, vigente = 1 } = {}) =>
  [[{ id_token: 9, token_hash: hmac('4:123456'), intentos, vigente }]];

describe('verifyResetCode', () => {
  it('should add one attempt and say how many are left when the code is wrong', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce(codigoGuardado({ intentos: 0 }))
      .mockResolvedValueOnce([{}]); // UPDATE intentos
    const res = crearRes();

    await verifyResetCode(crearReq({ body: { correo: CORREO, token: '000000' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Código incorrecto. Te quedan 4 intentos.', data: { attempts_left: 4, locked: false },
    }));
    expect(query.mock.calls[2][0]).toMatch(/SET intentos=intentos\+1/);
  });

  it('should lock and expire the code on the fifth wrong attempt', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce(codigoGuardado({ intentos: 4 }))
      .mockResolvedValue([{}]);
    const res = crearRes();

    await verifyResetCode(crearReq({ body: { correo: CORREO, token: '000000' } }), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Demasiados intentos. Solicita un código nuevo.', data: { attempts_left: 0, locked: true },
    }));
    expect(query.mock.calls[3][0]).toMatch(/SET expires_at=NOW\(\)/);
  });

  it('should not even compare a code that already expired', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce(codigoGuardado({ vigente: 0 }));
    const res = crearRes();

    await verifyResetCode(crearReq({ body: { correo: CORREO, token: '123456' } }), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'El código venció. Solicita uno nuevo.', data: { expired: true } }));
    expect(query).toHaveBeenCalledTimes(2); // no hubo UPDATE
  });

  it('should open a 5-minute session and store only its hash when the code is right', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce(codigoGuardado())
      .mockResolvedValueOnce([{}]);
    const res = crearRes();

    await verifyResetCode(crearReq({ body: { correo: CORREO, token: '123456' } }), res);

    const { data } = res.json.mock.calls[0][0];
    expect(data.session_expires_in).toBe(300);
    expect(data.reset_session).toMatch(/^[0-9a-f]{64}$/);
    // En la BD queda el hash de la sesión, nunca la sesión en claro
    expect(query.mock.calls[2][1][0]).toBe(hmac(data.reset_session));
  });
});

describe('resetPassword', () => {
  it('should reject a session that does not match the stored one', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce([[{ id_token: 9, sesion_hash: hmac('la-buena') }]]);
    const res = crearRes();

    await resetPassword(crearReq({ body: { correo: CORREO, reset_session: 'otra', nueva_contrasena: 'Nueva2026x' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).toHaveBeenCalledTimes(2); // no cambió la contraseña
  });

  it('should save the new password hashed and burn every code of the user', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])
      .mockResolvedValueOnce([[{ id_token: 9, sesion_hash: hmac('la-buena') }]])
      .mockResolvedValue([{}]);
    const res = crearRes();

    await resetPassword(crearReq({ body: { correo: CORREO, reset_session: 'la-buena', nueva_contrasena: 'Nueva2026x' } }), res);

    const [sqlClave, [hash, id]] = query.mock.calls[2];
    expect(sqlClave).toMatch(/UPDATE usuarios SET contrasena=\?/);
    expect(id).toBe(4);
    expect(await bcrypt.compare('Nueva2026x', hash)).toBe(true);
    expect(query.mock.calls[3][0]).toMatch(/SET used=1,sesion_hash=NULL WHERE id_usuario=\?/);
  });
});
