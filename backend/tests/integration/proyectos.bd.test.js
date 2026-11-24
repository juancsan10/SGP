import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearReq, crearRes } from '../helpers.js';
import { agregarAlEquipo, crearProyecto, crearUsuario, db, hayBd, limpiarBd } from './bd.js';

// Capa BD (S6): la tabla proyectos y sus consultas contra MySQL real.
// Un test con db.query reemplazado nunca ve una restricción de la tabla ni un error de SQL:
// aquí cada restricción queda documentada con un test, y la consulta del listado se ejecuta de verdad.
const require = createRequire(import.meta.url);
const proyectos = hayBd ? require('../../src/controllers/proyectos.controller') : null;

describe.skipIf(!hayBd)('tabla proyectos: restricciones', () => {
  let instructor;

  beforeEach(async () => {
    await limpiarBd();
    instructor = await crearUsuario({ rol: 'Instructor' });
  });

  const insertar = (campos) => db.query(
    'INSERT INTO proyectos (nombre, fecha_inicio, id_instructor) VALUES (?, ?, ?)',
    [campos.nombre, campos.fecha_inicio, campos.id_instructor],
  );

  it('should reject a project without name (nombre NOT NULL)', async () => {
    await expect(insertar({ nombre: null, fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario }))
      .rejects.toMatchObject({ code: 'ER_BAD_NULL_ERROR' });
  });

  it('should accept a name of 150 characters and reject one of 151 (VARCHAR 150)', async () => {
    await expect(insertar({ nombre: 'n'.repeat(150), fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario }))
      .resolves.toBeDefined();
    await expect(insertar({ nombre: 'n'.repeat(151), fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario }))
      .rejects.toMatchObject({ code: 'ER_DATA_TOO_LONG' });
  });

  it('should reject an instructor that does not exist (FOREIGN KEY to usuarios)', async () => {
    await expect(insertar({ nombre: 'Huérfano', fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario + 1000 }))
      .rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  it('should reject a date that does not exist (strict mode)', async () => {
    await expect(insertar({ nombre: 'Fecha imposible', fecha_inicio: '2026-02-30', id_instructor: instructor.id_usuario }))
      .rejects.toMatchObject({ code: expect.stringMatching(/^ER_TRUNCATED_WRONG_VALUE/) });
  });

  it('should fill the defaults: progress 0.00 and creation date', async () => {
    const [r] = await insertar({ nombre: 'Con valores por defecto', fecha_inicio: '2026-03-01', id_instructor: instructor.id_usuario });

    const [[fila]] = await db.query('SELECT porcentaje_avance, fecha_creacion, estado FROM proyectos WHERE id_proyecto = ?', [r.insertId]);
    expect(fila.porcentaje_avance).toBe('0.00');
    expect(fila.fecha_creacion).toBeInstanceOf(Date);
    expect(fila.estado).toBeNull(); // sin valor por defecto: lo pone la app (RN-009)
  });

  it('should reject a second user with the same email (usuarios.correo UNIQUE)', async () => {
    await expect(crearUsuario({ rol: 'Aprendiz', correo: instructor.correo }))
      .rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  // MySQL frente a PostgreSQL: la columna correo usa la intercalación por defecto de MySQL 8
  // (utf8mb4_0900_ai_ci), que NO distingue mayúsculas. Para MySQL "Ana@..." y "ana@..." son el
  // mismo correo y el UNIQUE lo rechaza; en PostgreSQL (texto sensible a mayúsculas) los dos
  // entrarían como usuarios distintos. Si el proyecto cambia de motor, este test avisa.
  it('should treat an email that only differs in uppercase as the same email (MySQL ci collation)', async () => {
    await expect(crearUsuario({ rol: 'Aprendiz', correo: instructor.correo.toUpperCase() }))
      .rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

    const [filas] = await db.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [instructor.correo.toUpperCase()]);
    expect(filas.map((f) => f.id_usuario)).toEqual([instructor.id_usuario]);
  });
});

describe.skipIf(!hayBd)('consulta del listado de proyectos (getAll)', () => {
  let instructor;
  let otroInstructor;

  beforeEach(async () => {
    await limpiarBd();
    instructor = await crearUsuario({ rol: 'Instructor' });
    otroInstructor = await crearUsuario({ rol: 'Instructor' });
  });

  async function listarComo(usuario) {
    const res = crearRes();
    await proyectos.getAll(crearReq({ user: { id: usuario.id_usuario, rol: usuario.rol }, query: {} }), res);
    return res.json.mock.calls[0][0].data;
  }

  it('should list only the projects of the instructor, newest first (WHERE + ORDER BY)', async () => {
    const viejo = await crearProyecto({ id_instructor: instructor.id_usuario });
    const nuevo = await crearProyecto({ id_instructor: instructor.id_usuario });
    await crearProyecto({ id_instructor: otroInstructor.id_usuario });
    // Fechas distintas a propósito: con la misma fecha el orden no estaría definido
    await db.query('UPDATE proyectos SET fecha_creacion = ? WHERE id_proyecto = ?', ['2026-01-01 08:00:00', viejo.id_proyecto]);
    await db.query('UPDATE proyectos SET fecha_creacion = ? WHERE id_proyecto = ?', ['2026-03-01 08:00:00', nuevo.id_proyecto]);

    const lista = await listarComo(instructor);

    expect(lista.map((p) => p.id_proyecto)).toEqual([nuevo.id_proyecto, viejo.id_proyecto]);
  });

  it('should bring the instructor full name from the JOIN with usuarios', async () => {
    await crearProyecto({ id_instructor: instructor.id_usuario });

    const [proyecto] = await listarComo(instructor);

    expect(proyecto.instructor).toBe(`${instructor.nombres} ${instructor.apellidos}`);
  });

  it('should show the apprentice each team project once, even if the team row is duplicated', async () => {
    // La tabla equipos_proyecto NO tiene UNIQUE(id_proyecto, id_usuario): solo el controlador
    // evita el duplicado (409). Este test documenta que el DISTINCT del listado lo absorbe.
    const aprendiz = await crearUsuario({ rol: 'Aprendiz' });
    const suyo = await crearProyecto({ id_instructor: instructor.id_usuario });
    await crearProyecto({ id_instructor: instructor.id_usuario });
    await agregarAlEquipo(suyo.id_proyecto, aprendiz.id_usuario);
    await agregarAlEquipo(suyo.id_proyecto, aprendiz.id_usuario);

    const lista = await listarComo(aprendiz);

    expect(lista.map((p) => p.id_proyecto)).toEqual([suyo.id_proyecto]);
  });
});
