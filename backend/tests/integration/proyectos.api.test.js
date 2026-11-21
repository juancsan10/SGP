import request from 'supertest';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agregarAlEquipo, crearProyecto, crearUsuario, db, hayBd, limpiarBd, tokenDe } from './bd.js';

// Capa API (S6): endpoints completos contra la BD REAL de pruebas.
// A diferencia de los tests de la semana 4 (db.query reemplazado), aquí el SQL se ejecuta
// de verdad: el caso feliz se verifica EN LA BD y cada restricción de la tabla se viola a propósito.
const require = createRequire(import.meta.url);
const app = hayBd ? require('../../src/app') : null;

describe.skipIf(!hayBd)('POST /api/v1/proyectos contra la BD real', () => {
  let admin;
  let instructor;

  beforeEach(async () => {
    await limpiarBd();
    admin = await crearUsuario({ rol: 'Administrador' });
    instructor = await crearUsuario({ rol: 'Instructor' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should save the project in the database with the initial state and the history entry', async () => {
    // Act
    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(instructor)).send({
      nombre: 'Gestión de inventario', descripcion: 'Proyecto de prueba', fecha_inicio: '2026-03-01', fecha_fin: '2026-08-01', id_instructor: instructor.id_usuario,
    });

    // Assert: no basta con la respuesta, se lee la fila guardada
    expect(res.status).toBe(201);
    const [[fila]] = await db.query('SELECT * FROM proyectos WHERE id_proyecto = ?', [res.body.data.id_proyecto]);
    expect(fila).toMatchObject({ nombre: 'Gestión de inventario', estado: 'En Planificación', id_instructor: instructor.id_usuario });
    expect(Number(fila.porcentaje_avance)).toBe(0); // DEFAULT 0.00 de la tabla
    const [historial] = await db.query(
      "SELECT accion FROM historial_cambios WHERE tabla_afectada = 'proyectos' AND id_registro = ?", [fila.id_proyecto],
    );
    expect(historial.map((h) => h.accion)).toEqual(['INSERT']);
  });

  it('should answer 404 (not 500) when the admin assigns an instructor that does not exist (FOREIGN KEY)', async () => {
    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(admin)).send({
      nombre: 'Proyecto huérfano', fecha_inicio: '2026-03-01', id_instructor: 999999,
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Instructor no encontrado o inactivo' });
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM proyectos');
    expect(total).toBe(0);
  });

  it('should answer 400 when the instructor is not an instructor', async () => {
    const aprendiz = await crearUsuario({ rol: 'Aprendiz' });

    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(admin)).send({
      nombre: 'Proyecto mal asignado', fecha_inicio: '2026-03-01', id_instructor: aprendiz.id_usuario,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El responsable del proyecto debe ser un instructor');
  });

  it('should answer 400 (not 500) for a date that does not exist in the calendar', async () => {
    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(instructor)).send({
      nombre: 'Proyecto con fecha imposible', fecha_inicio: '2026-02-30', id_instructor: instructor.id_usuario,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Error de validación');
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM proyectos');
    expect(total).toBe(0);
  });

  it('should answer 400 when the name is longer than the column (VARCHAR 150)', async () => {
    const res = await request(app).post('/api/v1/proyectos').set('Authorization', tokenDe(instructor)).send({
      nombre: 'x'.repeat(151), fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario,
    });

    expect(res.status).toBe(400);
  });
});

describe.skipIf(!hayBd)('POST /api/v1/equipos contra la BD real', () => {
  let instructor;
  let aprendiz;
  let proyecto;

  beforeEach(async () => {
    await limpiarBd();
    instructor = await crearUsuario({ rol: 'Instructor' });
    aprendiz = await crearUsuario({ rol: 'Aprendiz' });
    proyecto = await crearProyecto({ id_instructor: instructor.id_usuario });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should save the member once and refuse the same apprentice twice', async () => {
    const enviar = () => request(app).post('/api/v1/equipos').set('Authorization', tokenDe(instructor))
      .send({ id_proyecto: proyecto.id_proyecto, id_usuario: aprendiz.id_usuario, rol_en_equipo: 'Desarrollador' });

    const primera = await enviar();
    const segunda = await enviar();

    expect(primera.status).toBe(201);
    expect(segunda.status).toBe(409);
    const [filas] = await db.query('SELECT rol_en_equipo FROM equipos_proyecto WHERE id_proyecto = ? AND id_usuario = ?',
      [proyecto.id_proyecto, aprendiz.id_usuario]);
    expect(filas).toEqual([{ rol_en_equipo: 'Desarrollador' }]);
  });

  it('should answer 400 when the team role is longer than the column (VARCHAR 100)', async () => {
    const res = await request(app).post('/api/v1/equipos').set('Authorization', tokenDe(instructor))
      .send({ id_proyecto: proyecto.id_proyecto, id_usuario: aprendiz.id_usuario, rol_en_equipo: 'r'.repeat(101) });

    // El validador de la ruta ya lo frena (no fue hallazgo): el test queda como red
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Error de validación');
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM equipos_proyecto');
    expect(total).toBe(0);
  });

  it('should show the new member in the projects that the apprentice sees', async () => {
    await agregarAlEquipo(proyecto.id_proyecto, aprendiz.id_usuario);
    const otro = await crearProyecto({ id_instructor: instructor.id_usuario });

    const res = await request(app).get('/api/v1/proyectos').set('Authorization', tokenDe(aprendiz));

    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.id_proyecto)).toEqual([proyecto.id_proyecto]);
    expect(res.body.data.map((p) => p.id_proyecto)).not.toContain(otro.id_proyecto);
  });
});

describe.skipIf(!hayBd)('DELETE de fases y entregables con registros hijos', () => {
  let instructor;
  let proyecto;
  let idFase;

  beforeEach(async () => {
    await limpiarBd();
    instructor = await crearUsuario({ rol: 'Instructor' });
    proyecto = await crearProyecto({ id_instructor: instructor.id_usuario });
    const [fase] = await db.query("INSERT INTO fases_proyecto (nombre_fase, id_proyecto) VALUES ('Análisis', ?)", [proyecto.id_proyecto]);
    idFase = fase.insertId;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const crearEntregable = async () => {
    const [r] = await db.query(
      "INSERT INTO entregables (nombre, fecha_entrega, estado, id_fase) VALUES ('Documento de requisitos', '2026-04-01', 'Pendiente', ?)", [idFase],
    );
    return r.insertId;
  };

  it('should answer 409 (not 500) and keep the phase when it still has deliverables (FOREIGN KEY)', async () => {
    await crearEntregable();

    const res = await request(app).delete(`/api/v1/fases/${idFase}`).set('Authorization', tokenDe(instructor));

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, message: 'No se puede eliminar la fase: tiene 1 entregable(s). Elimínalos primero.' });
    const [fila] = await db.query('SELECT id_fase FROM fases_proyecto WHERE id_fase = ?', [idFase]);
    expect(fila).toHaveLength(1);
  });

  it('should delete an empty phase from the database', async () => {
    const res = await request(app).delete(`/api/v1/fases/${idFase}`).set('Authorization', tokenDe(instructor));

    expect(res.status).toBe(200);
    const [fila] = await db.query('SELECT id_fase FROM fases_proyecto WHERE id_fase = ?', [idFase]);
    expect(fila).toHaveLength(0);
  });

  it('should answer 409 (not 500) when the deliverable already has comments, files or grades', async () => {
    const idEntregable = await crearEntregable();
    await db.query("INSERT INTO comentarios (contenido, id_usuario, id_entregable) VALUES ('Revisar alcance', ?, ?)", [instructor.id_usuario, idEntregable]);
    await db.query('INSERT INTO evaluaciones (calificacion, id_entregable, id_usuario) VALUES (4.5, ?, ?)', [idEntregable, instructor.id_usuario]);

    const res = await request(app).delete(`/api/v1/entregables/${idEntregable}`).set('Authorization', tokenDe(instructor));

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('No se puede eliminar el entregable: tiene 2 comentario(s), archivo(s) o calificación(es).');
    const [fila] = await db.query('SELECT id_entregable FROM entregables WHERE id_entregable = ?', [idEntregable]);
    expect(fila).toHaveLength(1);
  });
});
