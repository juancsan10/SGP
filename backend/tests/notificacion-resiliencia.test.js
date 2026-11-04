import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Dependencia: el servicio de notificaciones en tiempo real (HU-28). Si el aviso falla DESPUÉS de
// guardar, la tarea o el mensaje ya existen: responder 500 hace que la persona lo envíe otra vez
// y quede duplicado. La regla es la misma que con el correo: el aviso no puede tumbar la operación.
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificacionesService = require('../src/services/notificaciones.service');
const tareas = require('../src/controllers/tareas.controller');
const mensajes = require('../src/controllers/mensajes.controller');

const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const PROYECTO = { id_proyecto: 1, estado: 'Activo', fecha_inicio: '2026-02-01', fecha_fin: '2026-06-30' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('si el aviso en tiempo real falla después de guardar', () => {
  it('should still answer 201 for the new task and log the failure', async () => {
    // Arrange: STUB de la BD (todo se guarda) + STUB del servicio de avisos que falla + SPY del log
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[PROYECTO]])
      .mockResolvedValueOnce([[{ id_usuario: 4, estado: 1 }]])
      .mockResolvedValueOnce([[{ id_equipo: 1 }]])
      .mockResolvedValueOnce([{ insertId: 15 }]) // INSERT tarea
      .mockResolvedValue([{}]);                  // historial
    vi.spyOn(notificacionesService, 'crearYNotificar').mockRejectedValue(new Error('Too many connections'));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = crearRes();

    // Act
    await tareas.create(crearReq({ user: INSTRUCTOR, body: {
      titulo: 'Diseñar login', id_proyecto: 1, id_asignado: 4, fecha_inicio: '2026-02-01', fecha_vencimiento: '2026-03-01',
    } }), res);

    // Assert: la tarea se creó (201 con su id), quedó en el historial y el fallo quedó en el log
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { id_tarea: 15 } }));
    expect(query.mock.calls.some(([sql]) => sql.includes('historial_cambios'))).toBe(true);
    expect(consola).toHaveBeenCalledWith(expect.stringContaining('[notificaciones]'), 'Too many connections');
  });

  it('should still answer 201 for the new message and log the failure', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 80 }])                      // INSERT mensaje
      .mockResolvedValueOnce([{}])                                    // historial
      .mockResolvedValueOnce([[{ id_usuario: 5 }, { id_usuario: 6 }]]); // miembros
    const avisar = vi.spyOn(notificacionesService, 'crearYNotificarMultiples').mockRejectedValue(new Error('Too many connections'));
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = crearRes();

    await mensajes.create(crearReq({ user: APRENDIZ, body: { contenido: 'Subí el avance', id_proyecto: 1 } }), res);

    expect(avisar).toHaveBeenCalledWith(expect.objectContaining({ ids_usuarios: [5, 6], tipo: 'mensaje' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(consola).toHaveBeenCalledWith(expect.stringContaining('[notificaciones]'), 'Too many connections');
  });
});
