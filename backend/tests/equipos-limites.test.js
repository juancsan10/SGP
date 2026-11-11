import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Reglas del aprendiz al entrar a un equipo (#19):
// · debe tener su programa de formación asignado;
// · como máximo 2 proyectos activos (RN-001).

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const { create } = require('../src/controllers/equipos.controller');
const { getAll } = require('../src/controllers/usuarios.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const PROYECTO = [[{ id_proyecto: 3, estado: 'En desarrollo' }]];
const aprendiz = (extra = {}) => [[{ id_usuario: 4, id_rol: 3, estado: 1, programa_formacion: 'ADSO', ...extra }]];

afterEach(() => { vi.restoreAllMocks(); });

describe('POST /equipos — límites del aprendiz', () => {
  it('should reject an apprentice without an assigned training program', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce(PROYECTO).mockResolvedValueOnce(aprendiz({ programa_formacion: '  ' }));
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: { id_proyecto: 3, id_usuario: 4 } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/programa de formación/);
    expect(spy.mock.calls.some(([sql]) => sql.includes('INSERT INTO equipos_proyecto'))).toBe(false);
  });

  it('should reject a third active project', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce(PROYECTO)
      .mockResolvedValueOnce(aprendiz())
      .mockResolvedValueOnce([[]])               // no está ya en este proyecto
      .mockResolvedValueOnce([[{ total: 2 }]]);   // ya tiene 2 activos
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: { id_proyecto: 3, id_usuario: 4 } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe('El aprendiz ya está en 2 proyectos activos, que es el máximo permitido (RN-001)');
    expect(spy.mock.calls.some(([sql]) => sql.includes('INSERT INTO equipos_proyecto'))).toBe(false);
  });

  it('should add the apprentice when he has a program and fewer than 2 active projects', async () => {
    // Arrange
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce(PROYECTO)
      .mockResolvedValueOnce(aprendiz())
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([{ insertId: 12 }])
      .mockResolvedValue([{}]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: { id_proyecto: 3, id_usuario: 4 } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('GET /usuarios?alcance=disponibles', () => {
  it('should include how many active projects each apprentice has', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ total: 0 }]]);

    // Act
    await getAll(crearReq({ user: INSTRUCTOR, query: { alcance: 'disponibles' } }), crearRes());

    // Assert
    expect(spy.mock.calls[0][0]).toContain('AS proyectos_activos');
    expect(spy.mock.calls[0][0]).toContain("p.estado NOT IN ('Finalizado','Cancelado')");
  });
});
