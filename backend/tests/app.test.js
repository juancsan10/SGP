import { createRequire } from 'node:module';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('app', () => {
  it('should register every route without crashing when it loads', () => {
    // Si un archivo de rutas usa un middleware o validador que no existe,
    // Express lanza un error al cargar app.js (pasó con common.validators.js vacío)
    expect(() => require('../src/app')).not.toThrow();
  });

  it('should answer the health check with status online', async () => {
    const app = require('../src/app');

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'online' });
  });

  it('should respond 404 in JSON for a route that does not exist', async () => {
    const app = require('../src/app');

    const res = await request(app).get('/api/v1/no-existe');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ success: false, message: 'Ruta no encontrada: GET /api/v1/no-existe' });
  });

  it('should respond 401 when a protected route is called without a token', async () => {
    const app = require('../src/app');

    const res = await request(app).get('/api/v1/proyectos');

    expect(res.status).toBe(401);
  });
});
