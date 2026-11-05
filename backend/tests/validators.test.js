import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const { validationResult } = require('express-validator');
const { registerValidators, adminUserValidators, loginValidators } = require('../src/validators/auth.validators');
const { progress, pagination } = require('../src/validators/common.validators');
const { createProjectValidators, updateProjectValidators } = require('../src/validators/proyectos.validators');
const { validate } = require('../src/middlewares/validation.middleware');

// Corre una lista de validadores de express-validator sobre una petición falsa
async function validar(validadores, { body = {}, params = {}, query = {} } = {}) {
  const req = { body, params, query };
  for (const v of [validadores].flat()) await v.run(req);
  return { req, errores: validationResult(req).array().map((e) => e.msg) };
}

const REGISTRO = { nombres: 'Ana', apellidos: 'Ruiz', correo: 'ana@sena.edu.co', contrasena: '12345678' };

describe('auth validators', () => {
  it('should keep the dots of a Gmail address when normalizing', async () => {
    const { req, errores } = await validar(loginValidators, { body: { correo: ' Rubiel.Tads@Gmail.com ', contrasena: 'x' } });

    expect(errores).toEqual([]);
    expect(req.body.correo).toBe('rubiel.tads@gmail.com');
  });

  it.each([
    ['A', 'Los nombres deben tener entre 2 y 100 caracteres'],
    ['a'.repeat(101), 'Los nombres deben tener entre 2 y 100 caracteres'],
  ])('should reject a name of invalid length (%s)', async (nombres, mensaje) => {
    const { errores } = await validar(registerValidators, { body: { ...REGISTRO, nombres } });

    expect(errores).toContain(mensaje);
  });

  it.each(['Al', 'a'.repeat(100)])('should accept a name at the length limit', async (nombres) => {
    const { errores } = await validar(registerValidators, { body: { ...REGISTRO, nombres } });

    expect(errores).toEqual([]);
  });

  it('should only allow creating instructors (id_rol 2) from the admin form', async () => {
    const { errores } = await validar(adminUserValidators, { body: { ...REGISTRO, id_rol: 3 } });

    expect(errores).toEqual(['Solo se pueden crear Instructores: el sistema tiene un único Administrador']);
  });
});

describe('common validators', () => {
  it.each([0, 100])('should accept a progress of %i', async (porcentaje_avance) => {
    const { errores } = await validar(progress, { body: { porcentaje_avance } });

    expect(errores).toEqual([]);
  });

  it.each([-1, 100.5])('should reject a progress of %s', async (porcentaje_avance) => {
    const { errores } = await validar(progress, { body: { porcentaje_avance } });

    expect(errores).toEqual(['porcentaje_avance debe estar entre 0 y 100']);
  });

  it('should accept limit=100 and reject limit=101', async () => {
    const valido = await validar(pagination, { query: { limit: '100' } });
    const invalido = await validar(pagination, { query: { limit: '101' } });

    expect(valido.errores).toEqual([]);
    expect(invalido.errores).toEqual(['limit debe estar entre 1 y 100']);
  });
});

describe('proyectos validators', () => {
  it('should require nombre, fecha_inicio and a numeric id_instructor', async () => {
    const { errores } = await validar(createProjectValidators, { body: { id_instructor: 'abc' } });

    expect(errores).toEqual(expect.arrayContaining([
      'nombre es requerido',
      'fecha_inicio es requerida',
      'id_instructor debe ser un identificador numérico válido (entero positivo)',
    ]));
  });

  it('should reject an unknown project state', async () => {
    const { errores } = await validar(updateProjectValidators, { params: { id: '1' }, body: { estado: 'Pausado' } });

    expect(errores[0]).toMatch(/^estado debe ser uno de:/);
  });
});

describe('validate middleware', () => {
  it('should respond 400 with the field and message of each error', async () => {
    const { req } = await validar(loginValidators, { body: { correo: 'no-es-correo', contrasena: 'x' } });
    const res = crearRes();
    const next = vi.fn();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error de validación',
      errors: [{ campo: 'correo', mensaje: 'El correo no tiene un formato válido' }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when there are no errors', async () => {
    const { req } = await validar(loginValidators, { body: { correo: 'a@b.co', contrasena: 'x' } });
    const next = vi.fn();

    validate(req, crearRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });
});
