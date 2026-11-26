// HU-35 — Exportación de reportes PDF y Excel (RF6.3)
// Pruebas de rutas (permisos por rol) y del servicio que arma los archivos.
import { createRequire } from 'node:module';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const app = require('../src/app');
const reportes = require('../src/services/reportes.service');

const SECRETO = 'secreto_solo_para_tests_de_api_32chars';
const ADMIN = { id: 1, rol: 'Administrador' };
const INSTRUCTOR = { id: 2, rol: 'Instructor' };
const APRENDIZ = { id: 4, rol: 'Aprendiz' };
const tokenDe = (u) => `Bearer ${jwt.sign(u, SECRETO, { expiresIn: '1h' })}`;
// Lee la respuesta como bytes (supertest no convierte .xlsx a Buffer por sí solo)
const binario = (res, cb) => { const partes = []; res.on('data', (d) => partes.push(d)); res.on('end', () => cb(null, Buffer.concat(partes))); };

const PROYECTO = {
  id_proyecto: 1, nombre: 'Sistema Web SENA', descripcion: 'Gestión académica', estado: 'Activo',
  porcentaje_avance: 65, fecha_inicio: '2026-07-06', fecha_fin: '2026-12-03', id_instructor: 2,
  instructor_nombre: 'Laura Gómez', instructor_correo: 'laura.gomez@sgpsena.local',
};
const FASES = [
  { id_fase: 1, nombre_fase: 'Análisis', descripcion: 'Requisitos', fecha_inicio: '2026-07-06', fecha_fin: '2026-08-05', porcentaje_avance: 100 },
  { id_fase: 2, nombre_fase: 'Desarrollo', descripcion: null, fecha_inicio: null, fecha_fin: 'no-es-fecha', porcentaje_avance: null },
];
const ENTREGABLES = Array.from({ length: 10 }, (_, i) => ({
  id_entregable: i + 1, nombre: `Entregable ${i + 1}`, nombre_fase: 'Análisis', fecha_entrega: '2026-07-16',
  estado: i % 2 ? 'Aprobado' : 'Pendiente', version: '1.0', calificacion: i < 3 ? 80 + i : null,
}));
const TAREAS = Array.from({ length: 10 }, (_, i) => ({
  id_tarea: i + 1, titulo: `Tarea ${i + 1}`, descripcion: 'Detalle', prioridad: ['Alta', 'Media', 'Baja'][i % 3],
  estado: ['Completada', 'En Progreso', 'Pendiente', 'Finalizada'][i % 4], fecha_vencimiento: '2026-09-01',
  asignado_nombre: i % 5 ? 'Carlos Herrera' : null, asignado_correo: 'carlos@sgpsena.local',
}));
const EQUIPO = [
  { nombre_completo: 'Carlos Herrera', identificacion: '1098765001', rol_en_equipo: 'Líder', nombre_rol: 'Aprendiz', correo: 'carlos@sgpsena.local' },
];
const REUNIONES = [{ id_reunion: 1, titulo: 'Kickoff', fecha_reunion: '2026-07-07T10:00:00Z', lugar: 'Sala 1' }];
const CONSOLIDADO = [
  { ...PROYECTO, total_fases: 2, total_tareas: 10, tareas_completadas: 5, total_entregables: 10, total_equipo: 1 },
  { ...PROYECTO, id_proyecto: 2, nombre: 'App Inventario', estado: 'Finalizado', porcentaje_avance: '100', total_tareas: '4', tareas_completadas: '4' },
  { ...PROYECTO, id_proyecto: 3, nombre: 'Portal', estado: 'En Planificación', porcentaje_avance: null, total_tareas: 0, tareas_completadas: 0 },
  { ...PROYECTO, id_proyecto: 4, nombre: 'Bot', estado: 'Suspendido', porcentaje_avance: 10, total_tareas: 2, tareas_completadas: 0 },
];

// Responde a cada consulta según la tabla que pide, como lo haría MySQL
function mockBd({ proyecto = PROYECTO, consolidado = CONSOLIDADO } = {}) {
  return vi.spyOn(db, 'query').mockImplementation(async (sql) => {
    if (sql.includes('FROM proyectos p') && sql.includes('total_fases')) return [consolidado];
    if (sql.includes('FROM proyectos p')) return [proyecto ? [proyecto] : []];
    if (sql.includes('FROM fases_proyecto')) return [FASES];
    if (sql.includes('FROM entregables')) return [ENTREGABLES];
    if (sql.includes('FROM tareas')) return [TAREAS];
    if (sql.includes('FROM equipos_proyecto')) return [EQUIPO];
    if (sql.includes('FROM reuniones')) return [REUNIONES];
    return [[]];
  });
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('rutas /api/v1/reportes — permisos', () => {
  it('should respond 401 without token', async () => {
    const res = await request(app).get('/api/v1/reportes/resumen');
    expect(res.status).toBe(401);
  });

  it('should respond 403 to the Aprendiz', async () => {
    const res = await request(app).get('/api/v1/reportes/consolidado/pdf').set('Authorization', tokenDe(APRENDIZ));
    expect(res.status).toBe(403);
  });

  it('should limit the Instructor summary to his own projects', async () => {
    const spy = mockBd();

    const res = await request(app).get('/api/v1/reportes/resumen').set('Authorization', tokenDe(INSTRUCTOR));

    expect(res.status).toBe(200);
    const [sql, params] = spy.mock.calls[0];
    expect(sql).toContain('WHERE p.id_instructor = ?');
    expect(params).toEqual([2]);
    expect(res.body.data.resumen).toMatchObject({ totalProyectos: 4, activos: 1, finalizados: 1, enPlanificacion: 1, suspendidos: 1, totalTareasGlobal: 16, totalTareasCompletadasGlobal: 9 });
  });

  it('should let the Administrador see every project', async () => {
    const spy = mockBd();

    await request(app).get('/api/v1/reportes/resumen').set('Authorization', tokenDe(ADMIN));

    const [sql, params] = spy.mock.calls[0];
    expect(sql).not.toContain('WHERE p.id_instructor');
    expect(params).toEqual([]);
  });

  it('should restrict the project report to the Instructor owner', async () => {
    const spy = mockBd({ proyecto: null });

    const res = await request(app).get('/api/v1/reportes/proyectos/9/pdf').set('Authorization', tokenDe(INSTRUCTOR));

    expect(res.status).toBe(404);
    expect(spy.mock.calls[0][0]).toContain('AND p.id_instructor = ?');
    expect(spy.mock.calls[0][1]).toEqual(['9', 2]);
  });

  it('should respond 404 to the Excel of a project that does not exist', async () => {
    mockBd({ proyecto: null });
    const res = await request(app).get('/api/v1/reportes/proyectos/99999/excel').set('Authorization', tokenDe(ADMIN));
    expect(res.status).toBe(404);
  });

  it('should order tasks by an existing column (not fecha_creacion)', async () => {
    const spy = mockBd();
    await reportes.getDatosReporteProyecto(1, 1, 'Administrador');
    const sqlTareas = spy.mock.calls.map(c => c[0]).find(s => s.includes('FROM tareas t'));
    expect(sqlTareas).toContain('ORDER BY t.fecha_vencimiento');
    expect(sqlTareas).not.toContain('fecha_creacion');
  });
});

describe('rutas /api/v1/reportes — archivos', () => {
  it('should download the project PDF', async () => {
    mockBd();
    const res = await request(app).get('/api/v1/reportes/proyectos/1/pdf').set('Authorization', tokenDe(INSTRUCTOR)).buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('Reporte_Sistema_Web_SENA_1.pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('should download the project Excel', async () => {
    mockBd();
    const res = await request(app).get('/api/v1/reportes/proyectos/1/excel').set('Authorization', tokenDe(ADMIN)).buffer(true).parse(binario);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('should download the consolidated PDF and Excel', async () => {
    mockBd();
    const pdf = await request(app).get('/api/v1/reportes/consolidado/pdf').set('Authorization', tokenDe(ADMIN)).buffer(true).parse(binario);
    const xls = await request(app).get('/api/v1/reportes/consolidado/excel').set('Authorization', tokenDe(ADMIN)).buffer(true).parse(binario);
    expect(pdf.status).toBe(200);
    expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(xls.status).toBe(200);
    expect(xls.headers['content-disposition']).toMatch(/Reporte_Consolidado_Proyectos_SENA_\d+\.xlsx/);
  });

  it('should build the consolidated PDF even with no projects', async () => {
    mockBd({ consolidado: [] });
    const res = await request(app).get('/api/v1/reportes/consolidado/pdf').set('Authorization', tokenDe(INSTRUCTOR)).buffer(true).parse(binario);
    expect(res.status).toBe(200);
  });

  it.each([
    ['/resumen', 'resumen de reportes'],
    ['/proyectos/1/pdf', 'PDF del proyecto'],
    ['/proyectos/1/excel', 'Excel del proyecto'],
    ['/consolidado/pdf', 'PDF consolidado'],
    ['/consolidado/excel', 'Excel consolidado'],
  ])('should respond 500 with a Spanish message when the database fails on %s', async (ruta, texto) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'query').mockRejectedValue(new Error('BD caída'));

    const res = await request(app).get(`/api/v1/reportes${ruta}`).set('Authorization', tokenDe(ADMIN));

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain(texto);
  });
});

describe('reportes.service — métricas', () => {
  it('should compute task and deliverable metrics', async () => {
    mockBd();
    const datos = await reportes.getDatosReporteProyecto(1, 1, 'Administrador');
    expect(datos.metricas).toMatchObject({
      totalTareas: 10, tareasCompletadas: 5, tareasEnProgreso: 3, tareasPendientes: 2, porcentajeTareasCompletadas: 50,
      totalEntregables: 10, entregablesAprobados: 5, promedioCalificacion: '81.0', totalMiembros: 1, totalFases: 2,
    });
  });

  it('should report N/A and 0% when the project is empty', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql) => (sql.includes('FROM proyectos p') ? [[PROYECTO]] : [[]]));
    const datos = await reportes.getDatosReporteProyecto(1, 1, 'Administrador');
    expect(datos.metricas.promedioCalificacion).toBe('N/A');
    expect(datos.metricas.porcentajeTareasCompletadas).toBe(0);

    const pdf = await reportes.generarPdfProyecto(datos);
    const xls = await reportes.generarExcelProyecto(datos);
    expect(pdf.length).toBeGreaterThan(0);
    expect(xls.length).toBeGreaterThan(0);
  });
});
