import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { crearReq, crearRes } from './helpers.js';

// Punto 6 (#19): encuestas, avisos fijados, respuestas y firma.

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const notificaciones = require('../src/services/notificaciones.service');
const { create, getByProyecto, votar, fijar, setFirma } = require('../src/controllers/mensajes.controller');
const app = require('../src/app');

const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const SECRETO = 'secreto_solo_para_tests_de_api_32chars';

beforeAll(() => { process.env.JWT_SECRET = SECRETO; });
afterEach(() => { vi.restoreAllMocks(); });

describe('crear mensajes enriquecidos', () => {
  it.each([
    ['one option', ['Sí']],
    ['seven options', ['1', '2', '3', '4', '5', '6', '7']],
    ['repeated options', ['Sí', 'sí']],
    ['no options', undefined],
  ])('should reject a poll with %s', async (_caso, opciones) => {
    // Arrange
    const spy = vi.spyOn(db, 'query');
    const res = crearRes();

    // Act
    await create(crearReq({ user: APRENDIZ, body: { contenido: '¿Qué día nos reunimos?', id_proyecto: 1, tipo: 'encuesta', opciones } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should save a poll with its options in order', async () => {
    // Arrange
    vi.spyOn(notificaciones, 'crearYNotificarMultiples').mockResolvedValue([]);
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([{ insertId: 90 }])  // INSERT mensaje
      .mockResolvedValueOnce([{}])                // INSERT opciones
      .mockResolvedValueOnce([{}])                // historial
      .mockResolvedValueOnce([[]]);               // miembros
    const res = crearRes();

    // Act
    await create(crearReq({ user: APRENDIZ, body: { contenido: '¿Qué día nos reunimos?', id_proyecto: 1, tipo: 'encuesta', opciones: [' Lunes ', 'Martes', ''] } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(spy.mock.calls[0][1]).toEqual(['¿Qué día nos reunimos?', 4, 1, 'encuesta', null, null, 0]);
    expect(spy.mock.calls[1][1]).toEqual([[[90, 'Lunes', 1], [90, 'Martes', 2]]]);
  });

  it('should not let an apprentice publish an aviso', async () => {
    // Arrange
    const res = crearRes();

    // Act
    await create(crearReq({ user: APRENDIZ, body: { contenido: 'Mañana no hay clase', id_proyecto: 1, tipo: 'aviso' } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should pin the aviso of the responsible instructor and copy his signature', async () => {
    // Arrange
    vi.spyOn(notificaciones, 'crearYNotificarMultiples').mockResolvedValue([]);
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_proyecto: 1 }]])                 // es el responsable
      .mockResolvedValueOnce([[{ id_mensaje: 70 }]])                 // mensaje respondido del proyecto
      .mockResolvedValueOnce([[{ firma: 'Laura Gómez · Instructora ADSO' }]])
      .mockResolvedValueOnce([{ insertId: 91 }])
      .mockResolvedValue([[]]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: INSTRUCTOR, body: { contenido: 'Mañana no hay clase', id_proyecto: 1, tipo: 'aviso', id_respuesta_a: 70, incluir_firma: true } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(spy.mock.calls[3][1]).toEqual(['Mañana no hay clase', 2, 1, 'aviso', 70, 'Laura Gómez · Instructora ADSO', 1]);
    expect(notificaciones.crearYNotificarMultiples).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Nuevo aviso del instructor', prioridad: 'Alta' }));
  });

  it('should block forbidden words inside the poll options too', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValue([{}]);
    const res = crearRes();

    // Act
    await create(crearReq({ user: APRENDIZ, body: { contenido: '¿Quién?', id_proyecto: 1, tipo: 'encuesta', opciones: ['Juan', 'el idiota'] } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(spy.mock.calls.some(([sql]) => sql.includes('INSERT INTO mensajes'))).toBe(false);
  });
});

describe('leer y votar encuestas', () => {
  it('should attach the poll results and my vote to the poll messages', async () => {
    // Arrange
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_mensaje: 90, tipo: 'encuesta', contenido: '¿Día?' }, { id_mensaje: 91, tipo: 'texto', contenido: 'Hola' }]])
      .mockResolvedValueOnce([[
        { id_opcion: 1, id_mensaje: 90, texto: 'Lunes', orden: 1, votos: 2, mia: 0 },
        { id_opcion: 2, id_mensaje: 90, texto: 'Martes', orden: 2, votos: 1, mia: 1 },
      ]]);
    const res = crearRes();

    // Act
    await getByProyecto(crearReq({ user: APRENDIZ, params: { id_proyecto: '1' } }), res);

    // Assert
    const [encuesta, texto] = res.json.mock.calls[0][0].data;
    expect(encuesta.encuesta).toEqual({ opciones: [{ id_opcion: 1, texto: 'Lunes', votos: 2 }, { id_opcion: 2, texto: 'Martes', votos: 1 }], total_votos: 3, mi_opcion: 2 });
    expect(texto.encuesta).toBeUndefined();
  });

  it('should save or change the vote of the user', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query')
      .mockResolvedValueOnce([[{ id_mensaje: 90, id_proyecto: 1, tipo: 'encuesta' }]])
      .mockResolvedValueOnce([[{ id_opcion: 2 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_opcion: 2, id_mensaje: 90, texto: 'Martes', orden: 2, votos: 1, mia: 1 }]]);
    const res = crearRes();

    // Act
    await votar(crearReq({ user: APRENDIZ, params: { id: '90' }, body: { id_opcion: 2 } }), res);

    // Assert
    expect(spy.mock.calls[2][0]).toContain('ON DUPLICATE KEY UPDATE');
    expect(spy.mock.calls[2][1]).toEqual([90, 2, 4]);
    expect(res.json.mock.calls[0][0].data.mi_opcion).toBe(2);
  });

  it('should reject an option of another poll', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_mensaje: 90, id_proyecto: 1, tipo: 'encuesta' }]]).mockResolvedValueOnce([[]]);
    const res = crearRes();

    // Act
    await votar(crearReq({ user: APRENDIZ, params: { id: '90' }, body: { id_opcion: 55 } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('fijar y firma', () => {
  it('should only let the responsible instructor pin a message', async () => {
    // Arrange
    vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id_mensaje: 91, id_proyecto: 1 }]]);
    const res = crearRes();

    // Act
    await fijar(crearReq({ user: APRENDIZ, params: { id: '91' }, body: { fijado: true } }), res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should reject a signature longer than 150 characters', async () => {
    const res = crearRes();
    await setFirma(crearReq({ user: APRENDIZ, body: { firma: 'x'.repeat(151) } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should save the signature of the logged user only', async () => {
    // Arrange
    const spy = vi.spyOn(db, 'query').mockResolvedValueOnce([{}]);
    const token = `Bearer ${jwt.sign(APRENDIZ, SECRETO, { expiresIn: '1h' })}`;

    // Act
    const res = await request(app).put('/api/v1/mensajes/firma/mia').set('Authorization', token).send({ firma: '  Carlos · ADSO 3228970 ' });

    // Assert
    expect(res.status).toBe(200);
    expect(spy.mock.calls[0][1]).toEqual(['Carlos · ADSO 3228970', 4]);
  });
});
