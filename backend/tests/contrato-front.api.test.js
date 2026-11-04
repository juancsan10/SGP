import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Estos tests verifican exactamente los campos que lee el frontend. Si el
// backend renombra uno, la pantalla se rompe aunque el API "funcione".

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const ADMIN = { id: 1, rol: 'Administrador' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const tokenDe = (usuario) => `Bearer ${jwt.sign(usuario, SECRETO, { expiresIn: '1h' })}`;

let hashDemo;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRETO;
  hashDemo = await bcrypt.hash('Sena2026*', 4);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function usuarioEnBd() {
  return { id_usuario: 4, nombres: 'Carlos Andrés', apellidos: 'Herrera Martínez', correo: 'carlos.herrera@sgpsena.local', contrasena: hashDemo, ficha: '2825431', programa_formacion: 'ADSO', id_rol: 3, rol: 'Aprendiz' };
}

describe('POST /api/v1/auth/login', () => {
  it('should return the token and the user fields that AuthContext, Dashboard and the menu use', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[usuarioEnBd()]]);

    // Act
    const res = await request(app).post('/api/v1/auth/login').send({ correo: 'carlos.herrera@sgpsena.local', contrasena: 'Sena2026*' });

    // Assert
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(typeof res.body.data.token).toBe('string');
    // id (NotificacionesPage, ProyectosPage), nombres (saludo), apellidos (iniciales), rol (permisos)
    expect(res.body.data.usuario).toMatchObject({ id: 4, nombres: 'Carlos Andrés', apellidos: 'Herrera Martínez', rol: 'Aprendiz' });
    expect(res.body.data.usuario).not.toHaveProperty('contrasena');
  });

  it('should send the error in "message", which is what LoginPage shows', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[usuarioEnBd()]]);

    const res = await request(app).post('/api/v1/auth/login').send({ correo: 'carlos.herrera@sgpsena.local', contrasena: 'otra' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: 'Credenciales inválidas' });
  });

  it('should send the detail of a validation error in errors[].mensaje', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ correo: 'carlos.herrera', contrasena: 'x' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Error de validación',
      errors: [{ campo: 'correo', mensaje: 'El correo no tiene un formato válido' }],
    });
  });
});

describe('GET /api/v1/proyectos', () => {
  it('should answer { success, data } and ask the database for the "instructor" field that the cards show', async () => {
    const proyecto = { id_proyecto: 1, nombre: 'SGP SENA', instructor: 'Laura Gómez', estado: 'Activo', porcentaje_avance: '40.00', fecha_inicio: '2026-02-01' };
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([[proyecto]]);

    const res = await request(app).get('/api/v1/proyectos').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: [proyecto] });
    const [sql, valores] = query.mock.calls[0];
    expect(sql).toMatch(/AS instructor\b/); // palabra completa: "AS instructor_nombre" no sirve
    expect(valores[0]).toBe(4); // el aprendiz solo recibe los proyectos de su equipo
  });
});

describe('GET /api/v1/notificaciones/:id_usuario', () => {
  it('should return the notifications of the logged user', async () => {
    const notificacion = { id_notificacion: 10, titulo: 'Nueva tarea asignada', tipo: 'tarea', leida: 0, fecha_envio: '2026-10-20T15:00:00.000Z' };
    vi.spyOn(db, 'query').mockResolvedValueOnce([[notificacion]]);

    const res = await request(app).get('/api/v1/notificaciones/4').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ id_notificacion: 10, titulo: 'Nueva tarea asignada', leida: 0 });
  });

  it('should respond 403 when a user asks for the notifications of another user', async () => {
    const query = vi.spyOn(db, 'query');

    const res = await request(app).get('/api/v1/notificaciones/5').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('acciones de NotificacionesPage', () => {
  it('should mark as read a notification of the logged user', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }]])                    // requireNotificationOwner
      .mockResolvedValueOnce([[{ id_notificacion: 10, id_usuario: 4 }]]) // SELECT para avisar en tiempo real (HU-28)
      .mockResolvedValueOnce([{ affectedRows: 1 }]);                   // UPDATE

    const res = await request(app).put('/api/v1/notificaciones/10').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Notificación marcada como leída' });
  });

  it('should answer the message that the page shows when the notification belongs to someone else', async () => {
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_usuario: 5 }]]);

    const res = await request(app).put('/api/v1/notificaciones/10').set('Authorization', tokenDe(APRENDIZ));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Solo puedes gestionar tus propias notificaciones');
  });

  it('should send the broadcast of the admin to every active apprentice and instructor', async () => {
    // Arrange
    const query = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_usuario: 4 }, { id_usuario: 5 }]]) // destinatarios activos
      .mockResolvedValue([{}]);                                       // un INSERT por destinatario + historial

    // Act
    const res = await request(app).post('/api/v1/notificaciones/broadcast').set('Authorization', tokenDe(ADMIN))
      .send({ titulo: 'Mantenimiento', mensaje: 'El sábado no habrá servicio', tipo: 'mantenimiento', rol_destino: 'Todos' });

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Notificación enviada a 2 usuario(s) en tiempo real');
    expect(query.mock.calls[0][1]).toEqual([['Aprendiz', 'Instructor']]);
  });

  it('should reject a broadcast to an unknown role', async () => {
    const res = await request(app).post('/api/v1/notificaciones/broadcast').set('Authorization', tokenDe(ADMIN))
      .send({ titulo: 'Hola', mensaje: 'Mensaje', rol_destino: 'Administrador' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("rol_destino debe ser 'Aprendiz', 'Instructor' o 'Todos'");
  });

  it('should respond 403 when an apprentice tries to send a broadcast', async () => {
    const res = await request(app).post('/api/v1/notificaciones/broadcast').set('Authorization', tokenDe(APRENDIZ))
      .send({ titulo: 'Hola', mensaje: 'A todos', rol_destino: 'Todos' });

    expect(res.status).toBe(403);
  });
});
