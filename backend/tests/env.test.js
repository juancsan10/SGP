import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { validateEnv, assertEnv } = require('../src/config/env');

const ok = { NODE_ENV: 'production', DB_HOST: 'db', DB_NAME: 'x', DB_USER: 'u', DB_PASSWORD: 'p', JWT_SECRET: 'a'.repeat(32), FRONTEND_URL: 'http://f', MAIL_MODE: 'smtp', SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p' };
const logger = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('validateEnv', () => {
  it('accepts a complete production config', () => {
    expect(validateEnv(ok).errores).toEqual([]);
  });
  it('lists every missing variable at once', () => {
    const { errores } = validateEnv({ NODE_ENV: 'production' });
    expect(errores.join('|')).toMatch(/DB_HOST/);
    expect(errores.join('|')).toMatch(/JWT_SECRET/);
    expect(errores.join('|')).toMatch(/FRONTEND_URL/);
    expect(errores.join('|')).toMatch(/DB_PASSWORD/);
  });
  it('in development only JWT_SECRET is mandatory (DB_* have defaults)', () => {
    const dev = { NODE_ENV: 'development', JWT_SECRET: 'a'.repeat(32) };
    expect(validateEnv(dev).errores).toEqual([]);
    expect(validateEnv({ NODE_ENV: 'development' }).errores).toEqual(['Falta la variable obligatoria JWT_SECRET']);
  });
  it('short JWT_SECRET is an error in production and a warning in development', () => {
    expect(validateEnv({ ...ok, JWT_SECRET: 'corto' }).errores.join()).toMatch(/32/);
    const dev = validateEnv({ ...ok, NODE_ENV: 'development', JWT_SECRET: 'corto' });
    expect(dev.errores).toEqual([]);
    expect(dev.avisos.join()).toMatch(/32/);
  });
  it('requires SMTP settings when MAIL_MODE=smtp', () => {
    expect(validateEnv({ ...ok, SMTP_HOST: '' }).errores.join()).toMatch(/SMTP_HOST/);
  });
  it('DATABASE_URL replaces DB_* variables', () => {
    const e = { ...ok, DATABASE_URL: 'mysql://u:p@h/d_test', DB_HOST: '', DB_NAME: '', DB_USER: '', DB_PASSWORD: '' };
    expect(validateEnv(e).errores).toEqual([]);
  });
});

describe('assertEnv', () => {
  it('prints a success state when valid', () => {
    const l = logger();
    assertEnv(ok, l);
    expect(l.log).toHaveBeenCalledWith(expect.stringContaining('validadas'));
  });
  it('throws and prints each problem when invalid', () => {
    const l = logger();
    expect(() => assertEnv({ NODE_ENV: 'production' }, l)).toThrow(/Configuración inválida/);
    expect(l.error.mock.calls.length).toBeGreaterThan(3);
  });
});
