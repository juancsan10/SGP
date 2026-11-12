import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Dependencia: el canal en tiempo real (HU-28). Se prueba nuestro adaptador realtime.service.js
// con un FAKE de la conexión SSE (un EventEmitter con write) y con un cliente WebSocket real
// contra un servidor local en un puerto libre: no sale nada a la red externa.
const require = createRequire(import.meta.url);
const { WebSocket } = require('ws');
const realtime = require('../src/services/realtime.service');
const db = require('../src/config/db');
const notificacionesService = require('../src/services/notificaciones.service');

const SECRETO = 'secreto_solo_para_tests_tiempo_real';
let servidor;
let wss;
let url;

beforeAll(async () => {
  process.env.JWT_SECRET = SECRETO;
  servidor = http.createServer();
  wss = realtime.initWebSocketServer(servidor);
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  url = `ws://127.0.0.1:${servidor.address().port}/ws`;
});

afterAll(async () => {
  wss.close();
  await new Promise((listo) => servidor.close(listo));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// FAKE de la respuesta SSE de Express: guarda lo escrito y emite 'close' como el real
function crearConexionSse() {
  const res = new EventEmitter();
  res.escrito = [];
  res.write = vi.fn((texto) => res.escrito.push(texto));
  return res;
}

// Abre un WebSocket y junta sus mensajes; resuelve cuando llega el primero
function conectar(ruta) {
  const ws = new WebSocket(`${url}${ruta}`);
  const mensajes = [];
  const primero = new Promise((listo, falla) => {
    ws.on('message', (data) => { mensajes.push(JSON.parse(data.toString())); if (mensajes.length === 1) listo(); });
    ws.on('error', falla);
  });
  return { ws, mensajes, primero };
}

const esperarMensajes = async (mensajes, cantidad) => {
  await vi.waitFor(() => expect(mensajes.length).toBeGreaterThanOrEqual(cantidad));
};

const cerrar = (ws) => new Promise((listo) => { ws.once('close', listo); ws.close(); });

describe('canal SSE (fake de la conexión)', () => {
  it('should write the new notification only to the connections of that user', () => {
    // Arrange
    const deCarlos = crearConexionSse();
    const deLaura = crearConexionSse();
    realtime.registerSseClient(4, deCarlos);
    realtime.registerSseClient(2, deLaura);

    // Act
    realtime.enviarNotificacionAUsuario(4, { id_notificacion: 10, titulo: 'Nueva tarea' });

    // Assert: COMPORTAMIENTO (a quién se escribió) y ESTADO (qué se escribió)
    expect(deLaura.write).not.toHaveBeenCalled();
    expect(deCarlos.write).toHaveBeenCalledOnce();
    expect(deCarlos.escrito[0]).toMatch(/^event: notificacion\ndata: /);
    expect(JSON.parse(deCarlos.escrito[0].split('data: ')[1])).toMatchObject({
      type: 'NUEVA_NOTIFICACION', data: { id_notificacion: 10, titulo: 'Nueva tarea' },
    });

    deCarlos.emit('close');
    deLaura.emit('close');
  });

  it('should forget a connection when it closes', () => {
    const conexion = crearConexionSse();
    realtime.registerSseClient(7, conexion);
    expect(realtime.getStats().usuariosConectadosSse).toBe(1);

    conexion.emit('close');
    realtime.enviarNotificacionAUsuario(7, { id_notificacion: 1 });

    expect(realtime.getStats().usuariosConectadosSse).toBe(0);
    expect(conexion.write).not.toHaveBeenCalled();
  });

  it('should keep sending to the other connections when one of them fails', () => {
    // Stub que falla: una pestaña cerrada a medias lanza al escribir
    const rota = crearConexionSse();
    rota.write = vi.fn(() => { throw new Error('write after end'); });
    const sana = crearConexionSse();
    realtime.registerSseClient(5, rota);
    realtime.registerSseClient(5, sana);

    expect(() => realtime.emitirEventoUsuario(5, 'TODAS_LEIDAS', { id_usuario: 5 })).not.toThrow();
    expect(sana.escrito[0]).toMatch(/^event: todas_leidas\n/);

    rota.emit('close');
    sana.emit('close');
  });
});

describe('canal WebSocket', () => {
  it('should register the user with the token of the URL and deliver his notifications', async () => {
    const token = jwt.sign({ id: 4, rol: 'Aprendiz' }, SECRETO);
    const { ws, mensajes, primero } = conectar(`?token=${token}`);
    await primero;

    realtime.enviarNotificacionAUsuario(4, { id_notificacion: 11, titulo: 'Reunión agendada' });
    await esperarMensajes(mensajes, 2);

    expect(mensajes[0]).toMatchObject({ type: 'CONECTADO', usuario: { id: 4, rol: 'Aprendiz' } });
    expect(mensajes[1]).toMatchObject({ type: 'NUEVA_NOTIFICACION', data: { id_notificacion: 11 } });
    await cerrar(ws);
    await vi.waitFor(() => expect(realtime.getStats().usuariosConectadosWs).toBe(0));
  });

  it('should authenticate by message and answer PING with PONG', async () => {
    const { ws, mensajes } = conectar('');
    await new Promise((listo) => ws.once('open', listo));

    ws.send(JSON.stringify({ type: 'AUTH', token: jwt.sign({ id: 2, rol: 'Instructor' }, SECRETO) }));
    await esperarMensajes(mensajes, 1);
    ws.send(JSON.stringify({ type: 'PING' }));
    await esperarMensajes(mensajes, 2);

    expect(mensajes.map((m) => m.type)).toEqual(['CONECTADO', 'PONG']);
    await cerrar(ws);
  });

  it('should answer ERROR and not register anyone when the token is forged', async () => {
    const falso = jwt.sign({ id: 1, rol: 'Administrador' }, 'otro-secreto');
    const { ws, mensajes } = conectar('');
    await new Promise((listo) => ws.once('open', listo));

    ws.send(JSON.stringify({ type: 'AUTH', token: falso }));
    await esperarMensajes(mensajes, 1);

    expect(mensajes[0]).toEqual({ type: 'ERROR', message: 'Mensaje inválido o token no válido' });
    expect(realtime.getStats().usuariosConectadosWs).toBe(0);
    await cerrar(ws);
  });
});

describe('notificaciones.service usa el canal en tiempo real', () => {
  it('should save the notification first and then push it with its new id', async () => {
    // Stub de la BD + spy del canal: el orden importa (sin id no se puede marcar como leída)
    const query = vi.spyOn(db, 'query').mockResolvedValueOnce([{ insertId: 55 }]);
    const enviar = vi.spyOn(realtime, 'enviarNotificacionAUsuario');

    const notificacion = await notificacionesService.crearYNotificar({ titulo: 'Hola', mensaje: 'Prueba', id_usuario: '4' });

    expect(query).toHaveBeenCalledOnce();
    expect(enviar).toHaveBeenCalledWith('4', expect.objectContaining({ id_notificacion: 55, id_usuario: 4, leida: 0 }));
    expect(notificacion.tipo).toBe('sistema'); // tipo no indicado → valor por defecto
  });

  it('should not save nor push anything when required data is missing', async () => {
    const query = vi.spyOn(db, 'query');
    const enviar = vi.spyOn(realtime, 'enviarNotificacionAUsuario');

    await expect(notificacionesService.crearYNotificar({ titulo: 'Sin destinatario', mensaje: 'x' }))
      .rejects.toThrow('titulo, mensaje e id_usuario son obligatorios');
    expect(query).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });
});
