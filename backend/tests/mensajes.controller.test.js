import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create } = require('../src/controllers/mensajes.controller');

const APRENDIZ = { id: 4, rol: 'Aprendiz' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mensajes create', () => {
  it('should block a message with forbidden words and never save it', async () => {
    // Arrange: la BD acepta cualquier INSERT (notificación y historial)
    const query = vi.spyOn(db, 'query').mockResolvedValue([{}]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: APRENDIZ, body: { contenido: 'eres un idiota', id_proyecto: 1 } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    const sqls = query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((sql) => sql.includes('INSERT INTO mensajes'))).toBe(false);
    expect(sqls.some((sql) => sql.includes('INSERT INTO notificaciones'))).toBe(true);
  });

  it('should save a clean message and notify every team member except the sender', async () => {
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 80 }])                      // INSERT mensaje
      .mockResolvedValueOnce([{}])                                    // historial
      .mockResolvedValueOnce([[{ id_usuario: 5 }, { id_usuario: 6 }]]) // miembros sin el remitente
      .mockResolvedValue([{}]);                                       // notificaciones
    const res = crearRes();

    await create(crearReq({ user: APRENDIZ, body: { contenido: 'Subí el avance', id_proyecto: 1 } }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    // Desde HU-28 cada aviso pasa por notificaciones.service: INSERT (titulo, mensaje, tipo, prioridad, id_usuario, …)
    const avisos = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO notificaciones'));
    expect(avisos.every(([, valores]) => valores[2] === 'mensaje')).toBe(true);
    const notificados = avisos.map(([, valores]) => valores[4]);
    expect(notificados).toEqual([5, 6]);
  });

  it('should respond 400 when the project is missing', async () => {
    const res = crearRes();

    await create(crearReq({ user: APRENDIZ, body: { contenido: 'Hola' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
