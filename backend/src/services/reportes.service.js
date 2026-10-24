// =====================================================
// services/reportes.service.js
// Servicio de generación y exportación de reportes (HU-35 / RF6.3 / CU-010)
// Soporta exportación en formato PDF y Excel (.xlsx)
// tanto por proyecto individual como consolidado general.
// =====================================================

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../config/db');

// Colores institucionales SENA
const COLOR_SENA_VERDE   = '#39A900';
const COLOR_SENA_OSCURO  = '#00324D';
const COLOR_SENA_NEGRO   = '#0F172A';
const COLOR_SLATE_600    = '#475569';
const COLOR_SLATE_100    = '#F1F5F9';
const COLOR_BORDE        = '#CBD5E1';

// Formateador de fechas
function formatearFecha(fecha) {
  if (!fecha) return '—';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(fecha);
  }
}

// ─── 1. OBTENCIÓN DE DATOS ──────────────────────────────────────────────────

/**
 * Obtiene todos los datos estructurados de un proyecto para su reporte
 */
async function getDatosReporteProyecto(id_proyecto, id_usuario, rol) {
  // 1. Proyecto base con instructor
  let sqlProj = `SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) AS instructor_nombre, u.correo AS instructor_correo
                 FROM proyectos p
                 JOIN usuarios u ON p.id_instructor = u.id_usuario
                 WHERE p.id_proyecto = ?`;
  const paramsProj = [id_proyecto];

  if (rol === 'Instructor') {
    sqlProj += ' AND p.id_instructor = ?';
    paramsProj.push(id_usuario);
  }

  const [proyectos] = await db.query(sqlProj, paramsProj);
  if (!proyectos || proyectos.length === 0) return null;
  const proyecto = proyectos[0];

  // 2. Fases
  const [fases] = await db.query(
    `SELECT * FROM fases_proyecto WHERE id_proyecto = ? ORDER BY fecha_inicio ASC, id_fase ASC`,
    [id_proyecto]
  );

  // 3. Entregables con evaluación si existe
  const [entregables] = await db.query(
    `SELECT e.*, f.nombre_fase,
            ev.calificacion, ev.comentarios AS comentario_evaluacion, ev.fecha_evaluacion
     FROM entregables e
     JOIN fases_proyecto f ON e.id_fase = f.id_fase
     LEFT JOIN evaluaciones ev ON ev.id_entregable = e.id_entregable
     WHERE f.id_proyecto = ?
     ORDER BY f.fecha_inicio ASC, e.fecha_entrega ASC`,
    [id_proyecto]
  );

  // 4. Tareas con usuario asignado
  const [tareas] = await db.query(
    `SELECT t.*, CONCAT(u.nombres, ' ', u.apellidos) AS asignado_nombre, u.correo AS asignado_correo
     FROM tareas t
     LEFT JOIN usuarios u ON t.id_asignado = u.id_usuario
     WHERE t.id_proyecto = ?
     ORDER BY t.fecha_creacion DESC`,
    [id_proyecto]
  );

  // 5. Equipo de trabajo
  const [equipo] = await db.query(
    `SELECT ep.*, CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo, u.correo, u.identificacion, r.nombre_rol
     FROM equipos_proyecto ep
     JOIN usuarios u ON ep.id_usuario = u.id_usuario
     LEFT JOIN roles r ON u.id_rol = r.id_rol
     WHERE ep.id_proyecto = ?
     ORDER BY ep.rol_en_equipo ASC, u.nombres ASC`,
    [id_proyecto]
  );

  // 6. Reuniones
  const [reuniones] = await db.query(
    `SELECT * FROM reuniones WHERE id_proyecto = ? ORDER BY fecha_reunion DESC`,
    [id_proyecto]
  );

  // Métricas calculadas
  const totalTareas = tareas.length;
  const tareasCompletadas = tareas.filter(t => t.estado === 'Completada' || t.estado === 'Finalizada').length;
  const tareasEnProgreso = tareas.filter(t => t.estado === 'En Progreso').length;
  const tareasPendientes = tareas.filter(t => t.estado === 'Pendiente').length;
  const porcentajeTareasCompletadas = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const totalEntregables = entregables.length;
  const entregablesAprobados = entregables.filter(e => e.estado === 'Aprobado').length;
  const entregablesConCalificacion = entregables.filter(e => e.calificacion !== null && e.calificacion !== undefined);
  const promedioCalificacion = entregablesConCalificacion.length > 0
    ? (entregablesConCalificacion.reduce((acc, curr) => acc + Number(curr.calificacion), 0) / entregablesConCalificacion.length).toFixed(1)
    : 'N/A';

  return {
    proyecto,
    fases,
    entregables,
    tareas,
    equipo,
    reuniones,
    metricas: {
      totalTareas,
      tareasCompletadas,
      tareasEnProgreso,
      tareasPendientes,
      porcentajeTareasCompletadas,
      totalEntregables,
      entregablesAprobados,
      promedioCalificacion,
      totalMiembros: equipo.length,
      totalFases: fases.length,
    },
    fecha_generacion: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
  };
}

/**
 * Obtiene los datos consolidados de todos los proyectos accesibles por el usuario
 */
async function getDatosReporteConsolidado(id_usuario, rol) {
  let sql = `SELECT p.id_proyecto, p.nombre, p.descripcion, p.estado, p.porcentaje_avance,
                    p.fecha_inicio, p.fecha_fin, p.fecha_creacion,
                    CONCAT(u.nombres, ' ', u.apellidos) AS instructor_nombre, u.correo AS instructor_correo,
                    (SELECT COUNT(*) FROM fases_proyecto f WHERE f.id_proyecto = p.id_proyecto) AS total_fases,
                    (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto) AS total_tareas,
                    (SELECT COUNT(*) FROM tareas t WHERE t.id_proyecto = p.id_proyecto AND t.estado IN ('Completada','Finalizada')) AS tareas_completadas,
                    (SELECT COUNT(*) FROM entregables e JOIN fases_proyecto fp ON e.id_fase = fp.id_fase WHERE fp.id_proyecto = p.id_proyecto) AS total_entregables,
                    (SELECT COUNT(*) FROM equipos_proyecto ep WHERE ep.id_proyecto = p.id_proyecto) AS total_equipo
             FROM proyectos p
             JOIN usuarios u ON p.id_instructor = u.id_usuario`;
  const params = [];

  if (rol === 'Instructor') {
    sql += ' WHERE p.id_instructor = ?';
    params.push(id_usuario);
  }

  sql += ' ORDER BY p.fecha_creacion DESC';

  const [proyectos] = await db.query(sql, params);

  const totalProyectos = proyectos.length;
  const activos = proyectos.filter(p => p.estado === 'Activo' || p.estado === 'En Desarrollo').length;
  const enPlanificacion = proyectos.filter(p => p.estado === 'En Planificación' || p.estado === 'Planeado').length;
  const finalizados = proyectos.filter(p => p.estado === 'Finalizado').length;
  const suspendidos = proyectos.filter(p => p.estado === 'Suspendido' || p.estado === 'Cancelado').length;

  const sumaAvance = proyectos.reduce((acc, p) => acc + (parseFloat(p.porcentaje_avance) || 0), 0);
  const promedioAvance = totalProyectos > 0 ? (sumaAvance / totalProyectos).toFixed(1) : 0;

  const totalTareasGlobal = proyectos.reduce((acc, p) => acc + (parseInt(p.total_tareas) || 0), 0);
  const totalTareasCompletadasGlobal = proyectos.reduce((acc, p) => acc + (parseInt(p.tareas_completadas) || 0), 0);

  return {
    proyectos,
    resumen: {
      totalProyectos,
      activos,
      enPlanificacion,
      finalizados,
      suspendidos,
      promedioAvance,
      totalTareasGlobal,
      totalTareasCompletadasGlobal,
    },
    fecha_generacion: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
  };
}

// ─── 2. GENERADORES PDF ─────────────────────────────────────────────────────

/**
 * Genera PDF de un proyecto individual
 */
function generarPdfProyecto(datos) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Reporte - ${datos.proyecto.nombre}`,
          Author: 'SGP SENA',
          Subject: 'Reporte de Avance de Proyecto',
          Keywords: 'SENA, Proyecto, Reporte, SGP',
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const anchoUtil = doc.page.width - 80;

      // ── ENCABEZADO SENA ──
      doc.rect(40, 40, anchoUtil, 55).fill(COLOR_SENA_VERDE);

      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
         .text('SENA · SISTEMA DE GESTIÓN DE PROYECTOS (SGP)', 55, 52);
      doc.fontSize(10).font('Helvetica')
         .text('REPORTE OFICIAL DE AVANCE Y SEGUIMIENTO DEL PROYECTO', 55, 74);

      doc.fillColor(COLOR_SENA_NEGRO);
      doc.moveDown(3);

      // Fecha y generación
      doc.fontSize(8).fillColor(COLOR_SLATE_600).font('Helvetica')
         .text(`Fecha de emisión: ${datos.fecha_generacion} | Documento confidencial SENA`, 40, 105, { align: 'right', width: anchoUtil });

      let cursorY = 125;

      // ── 1. FICHA TÉCNICA DEL PROYECTO ──
      doc.rect(40, cursorY, anchoUtil, 22).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
         .text('1. INFORMACIÓN GENERAL DEL PROYECTO', 48, cursorY + 6);

      cursorY += 28;

      // Card de información
      doc.rect(40, cursorY, anchoUtil, 105).fillAndStroke(COLOR_SLATE_100, COLOR_BORDE);

      doc.fillColor(COLOR_SENA_NEGRO).fontSize(13).font('Helvetica-Bold')
         .text(datos.proyecto.nombre, 52, cursorY + 10, { width: anchoUtil - 24 });

      doc.fontSize(9).font('Helvetica').fillColor(COLOR_SLATE_600);
      const desc = datos.proyecto.descripcion || 'Sin descripción registrada.';
      doc.text(desc.length > 180 ? desc.substring(0, 180) + '…' : desc, 52, cursorY + 28, { width: anchoUtil - 24 });

      // Grilla de atributos
      const colW = (anchoUtil - 24) / 4;
      const filaY = cursorY + 62;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_OSCURO).text('ESTADO:', 52, filaY);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_SENA_NEGRO).text(datos.proyecto.estado, 52, filaY + 12);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_OSCURO).text('INSTRUCTOR LÍDER:', 52 + colW, filaY);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_SENA_NEGRO).text(datos.proyecto.instructor_nombre || '—', 52 + colW, filaY + 12, { width: colW });

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_OSCURO).text('PERÍODO:', 52 + colW * 2, filaY);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_SENA_NEGRO).text(`${formatearFecha(datos.proyecto.fecha_inicio)} al ${formatearFecha(datos.proyecto.fecha_fin)}`, 52 + colW * 2, filaY + 12);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_OSCURO).text('AVANCE REGISTRADO:', 52 + colW * 3, filaY);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_SENA_VERDE).text(`${datos.proyecto.porcentaje_avance || 0}%`, 52 + colW * 3, filaY + 12);

      cursorY += 115;

      // ── 2. INDICADORES CLAVE (KPIS) ──
      doc.rect(40, cursorY, anchoUtil, 20).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
         .text('2. INDICADORES CLAVE DE DESEMPEÑO (KPIs)', 48, cursorY + 5);

      cursorY += 26;

      const kpiW = (anchoUtil - 30) / 4;
      const kpis = [
        { label: 'Avance General', valor: `${datos.proyecto.porcentaje_avance || 0}%`, sub: 'Completitud' },
        { label: 'Tareas Completadas', valor: `${datos.metricas.tareasCompletadas}/${datos.metricas.totalTareas}`, sub: `${datos.metricas.porcentajeTareasCompletadas}% ejecutado` },
        { label: 'Entregables', valor: `${datos.metricas.entregablesAprobados}/${datos.metricas.totalEntregables}`, sub: `Promedio: ${datos.metricas.promedioCalificacion}` },
        { label: 'Equipo Asignado', valor: `${datos.metricas.totalMiembros}`, sub: `${datos.metricas.totalFases} fases activas` },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 40 + idx * (kpiW + 10);
        doc.rect(x, cursorY, kpiW, 48).fillAndStroke('#FFFFFF', COLOR_BORDE);
        doc.fillColor(COLOR_SLATE_600).fontSize(7).font('Helvetica-Bold').text(kpi.label.toUpperCase(), x + 6, cursorY + 6);
        doc.fillColor(COLOR_SENA_VERDE).fontSize(14).font('Helvetica-Bold').text(kpi.valor, x + 6, cursorY + 18);
        doc.fillColor(COLOR_SLATE_600).fontSize(7).font('Helvetica').text(kpi.sub, x + 6, cursorY + 35);
      });

      cursorY += 58;

      // ── 3. FASES DEL PROYECTO ──
      doc.rect(40, cursorY, anchoUtil, 18).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
         .text('3. FASES DEL PROYECTO', 48, cursorY + 4);

      cursorY += 22;

      // Encabezado de tabla fases
      doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
      doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
      doc.text('Fase', 45, cursorY + 4);
      doc.text('Descripción', 180, cursorY + 4);
      doc.text('Fecha Inicio', 350, cursorY + 4);
      doc.text('Fecha Fin', 430, cursorY + 4);
      doc.text('Avance', 500, cursorY + 4);
      cursorY += 18;

      if (datos.fases.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text('No hay fases registradas.', 45, cursorY);
        cursorY += 15;
      } else {
        datos.fases.forEach((fase, i) => {
          if (i % 2 === 1) doc.rect(40, cursorY - 2, anchoUtil, 16).fill('#FAFAFA');
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(fase.nombre_fase, 45, cursorY, { width: 130 });
          doc.font('Helvetica').fontSize(7).fillColor(COLOR_SLATE_600).text(fase.descripcion ? (fase.descripcion.substring(0, 35) + '…') : '—', 180, cursorY, { width: 165 });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(formatearFecha(fase.fecha_inicio), 350, cursorY);
          doc.text(formatearFecha(fase.fecha_fin), 430, cursorY);
          doc.font('Helvetica-Bold').fillColor(COLOR_SENA_VERDE).text(`${fase.porcentaje_avance || 0}%`, 500, cursorY);
          cursorY += 16;
        });
      }

      cursorY += 10;

      // ── 4. ENTREGABLES Y CALIFICACIONES ──
      // Si nos quedamos sin espacio vertical, añadimos nueva página
      if (cursorY > 660) {
        doc.addPage();
        cursorY = 40;
      }

      doc.rect(40, cursorY, anchoUtil, 18).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
         .text('4. ENTREGABLES Y EVALUACIONES', 48, cursorY + 4);

      cursorY += 22;

      doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
      doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
      doc.text('Entregable', 45, cursorY + 4);
      doc.text('Fase', 190, cursorY + 4);
      doc.text('Entrega', 300, cursorY + 4);
      doc.text('Estado', 370, cursorY + 4);
      doc.text('Versión', 450, cursorY + 4);
      doc.text('Nota', 500, cursorY + 4);
      cursorY += 18;

      if (datos.entregables.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text('No hay entregables registrados.', 45, cursorY);
        cursorY += 15;
      } else {
        datos.entregables.slice(0, 8).forEach((e, i) => {
          if (i % 2 === 1) doc.rect(40, cursorY - 2, anchoUtil, 16).fill('#FAFAFA');
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(e.nombre, 45, cursorY, { width: 140 });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text(e.nombre_fase || '—', 190, cursorY, { width: 105 });
          doc.text(formatearFecha(e.fecha_entrega), 300, cursorY);
          doc.text(e.estado || 'Pendiente', 370, cursorY);
          doc.text(e.version || '1.0', 450, cursorY);
          doc.font('Helvetica-Bold').fillColor(e.calificacion ? COLOR_SENA_VERDE : COLOR_SLATE_600)
             .text(e.calificacion !== null && e.calificacion !== undefined ? `${e.calificacion}/100` : '—', 500, cursorY);
          cursorY += 16;
        });
        if (datos.entregables.length > 8) {
          doc.font('Helvetica-Oblique').fontSize(7).fillColor(COLOR_SLATE_600)
             .text(`... y ${datos.entregables.length - 8} entregables más (ver exportación en Excel para el desglose completo)`, 45, cursorY);
          cursorY += 14;
        }
      }

      cursorY += 10;

      // ── 5. TAREAS PRINCIPALES Y ASIGNACIONES ──
      if (cursorY > 640) {
        doc.addPage();
        cursorY = 40;
      }

      doc.rect(40, cursorY, anchoUtil, 18).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
         .text('5. TAREAS Y RESPONSABLES', 48, cursorY + 4);

      cursorY += 22;

      doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
      doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
      doc.text('Título Tarea', 45, cursorY + 4);
      doc.text('Responsable', 230, cursorY + 4);
      doc.text('Prioridad', 360, cursorY + 4);
      doc.text('Estado', 430, cursorY + 4);
      doc.text('Vence', 495, cursorY + 4);
      cursorY += 18;

      if (datos.tareas.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text('No hay tareas registradas.', 45, cursorY);
        cursorY += 15;
      } else {
        datos.tareas.slice(0, 8).forEach((t, i) => {
          if (i % 2 === 1) doc.rect(40, cursorY - 2, anchoUtil, 16).fill('#FAFAFA');
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(t.titulo, 45, cursorY, { width: 180 });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text(t.asignado_nombre || 'Sin asignar', 230, cursorY, { width: 125 });
          doc.text(t.prioridad || 'Media', 360, cursorY);
          doc.text(t.estado || 'Pendiente', 430, cursorY);
          doc.text(formatearFecha(t.fecha_vencimiento), 495, cursorY);
          cursorY += 16;
        });
        if (datos.tareas.length > 8) {
          doc.font('Helvetica-Oblique').fontSize(7).fillColor(COLOR_SLATE_600)
             .text(`... y ${datos.tareas.length - 8} tareas más (ver exportación en Excel)`, 45, cursorY);
          cursorY += 14;
        }
      }

      cursorY += 10;

      // ── 6. EQUIPO DE TRABAJO ──
      if (cursorY > 640) {
        doc.addPage();
        cursorY = 40;
      }

      doc.rect(40, cursorY, anchoUtil, 18).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
         .text('6. EQUIPO DE TRABAJO DEL PROYECTO', 48, cursorY + 4);

      cursorY += 22;

      doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
      doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
      doc.text('Integrante', 45, cursorY + 4);
      doc.text('Rol en Equipo', 220, cursorY + 4);
      doc.text('Identificación', 350, cursorY + 4);
      doc.text('Correo Electrónico', 430, cursorY + 4);
      cursorY += 18;

      if (datos.equipo.length === 0) {
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text('No hay integrantes asignados aún.', 45, cursorY);
        cursorY += 15;
      } else {
        datos.equipo.forEach((m, i) => {
          if (i % 2 === 1) doc.rect(40, cursorY - 2, anchoUtil, 16).fill('#FAFAFA');
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(m.nombre_completo, 45, cursorY, { width: 170 });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text(m.rol_en_equipo || 'Aprendiz', 220, cursorY);
          doc.text(m.identificacion || '—', 350, cursorY);
          doc.text(m.correo || '—', 430, cursorY, { width: 120 });
          cursorY += 16;
        });
      }

      // Pie de página institucional
      doc.fontSize(8).fillColor(COLOR_SLATE_600).font('Helvetica')
         .text('Documento generado por el Sistema de Gestión de Proyectos SENA (SGP) · Servicio Nacional de Aprendizaje',
               40, doc.page.height - 35, { align: 'center', width: anchoUtil });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Genera PDF consolidado de todos los proyectos
 */
function generarPdfConsolidado(datos) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: 'Reporte Consolidado de Proyectos SENA',
          Author: 'SGP SENA',
          Subject: 'Consolidado General de Proyectos',
        },
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const anchoUtil = doc.page.width - 80;

      // Encabezado
      doc.rect(40, 40, anchoUtil, 55).fill(COLOR_SENA_VERDE);
      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
         .text('SENA · SISTEMA DE GESTIÓN DE PROYECTOS (SGP)', 55, 52);
      doc.fontSize(10).font('Helvetica')
         .text('REPORTE CONSOLIDADO DE PROYECTOS Y RENDIMIENTO', 55, 74);

      doc.moveDown(3);
      doc.fontSize(8).fillColor(COLOR_SLATE_600).font('Helvetica')
         .text(`Fecha de emisión: ${datos.fecha_generacion} | Cobertura institucional`, 40, 105, { align: 'right', width: anchoUtil });

      let cursorY = 125;

      // KPIs globales
      doc.rect(40, cursorY, anchoUtil, 20).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
         .text('RESUMEN EJECUTIVO GLOBAL', 48, cursorY + 5);

      cursorY += 26;
      const kpiW = (anchoUtil - 30) / 4;
      const kpis = [
        { label: 'Proyectos Totales', valor: `${datos.resumen.totalProyectos}`, sub: `${datos.resumen.activos} en curso` },
        { label: 'Promedio Avance', valor: `${datos.resumen.promedioAvance}%`, sub: 'Rendimiento global' },
        { label: 'Finalizados', valor: `${datos.resumen.finalizados}`, sub: `${datos.resumen.enPlanificacion} en planeación` },
        { label: 'Tareas Globales', valor: `${datos.resumen.totalTareasCompletadasGlobal}/${datos.resumen.totalTareasGlobal}`, sub: 'Completadas vs Total' },
      ];

      kpis.forEach((kpi, idx) => {
        const x = 40 + idx * (kpiW + 10);
        doc.rect(x, cursorY, kpiW, 48).fillAndStroke('#FFFFFF', COLOR_BORDE);
        doc.fillColor(COLOR_SLATE_600).fontSize(7).font('Helvetica-Bold').text(kpi.label.toUpperCase(), x + 6, cursorY + 6);
        doc.fillColor(COLOR_SENA_VERDE).fontSize(14).font('Helvetica-Bold').text(kpi.valor, x + 6, cursorY + 18);
        doc.fillColor(COLOR_SLATE_600).fontSize(7).font('Helvetica').text(kpi.sub, x + 6, cursorY + 35);
      });

      cursorY += 60;

      // Tabla de proyectos
      doc.rect(40, cursorY, anchoUtil, 20).fill(COLOR_SENA_OSCURO);
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
         .text('DETALLE DE PROYECTOS REGISTRADOS', 48, cursorY + 5);

      cursorY += 26;

      doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
      doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
      doc.text('ID', 45, cursorY + 4);
      doc.text('Proyecto', 70, cursorY + 4);
      doc.text('Instructor Líder', 220, cursorY + 4);
      doc.text('Estado', 340, cursorY + 4);
      doc.text('Avance', 420, cursorY + 4);
      doc.text('Tareas', 475, cursorY + 4);
      doc.text('Equipo', 520, cursorY + 4);
      cursorY += 18;

      if (datos.proyectos.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_SLATE_600).text('No hay proyectos registrados.', 45, cursorY);
      } else {
        datos.proyectos.forEach((p, i) => {
          if (cursorY > 730) {
            doc.addPage();
            cursorY = 40;
            doc.rect(40, cursorY, anchoUtil, 16).fill(COLOR_SLATE_100);
            doc.fillColor(COLOR_SENA_NEGRO).fontSize(8).font('Helvetica-Bold');
            doc.text('ID', 45, cursorY + 4);
            doc.text('Proyecto', 70, cursorY + 4);
            doc.text('Instructor Líder', 220, cursorY + 4);
            doc.text('Estado', 340, cursorY + 4);
            doc.text('Avance', 420, cursorY + 4);
            doc.text('Tareas', 475, cursorY + 4);
            doc.text('Equipo', 520, cursorY + 4);
            cursorY += 18;
          }

          if (i % 2 === 1) doc.rect(40, cursorY - 2, anchoUtil, 16).fill('#FAFAFA');
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text(String(p.id_proyecto), 45, cursorY);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_SENA_NEGRO).text(p.nombre, 70, cursorY, { width: 145 });
          doc.font('Helvetica').fontSize(8).fillColor(COLOR_SLATE_600).text(p.instructor_nombre || '—', 220, cursorY, { width: 115 });
          doc.text(p.estado, 340, cursorY);
          doc.font('Helvetica-Bold').fillColor(COLOR_SENA_VERDE).text(`${p.porcentaje_avance || 0}%`, 420, cursorY);
          doc.font('Helvetica').fillColor(COLOR_SLATE_600).text(`${p.tareas_completadas}/${p.total_tareas}`, 475, cursorY);
          doc.text(String(p.total_equipo), 520, cursorY);
          cursorY += 16;
        });
      }

      doc.fontSize(8).fillColor(COLOR_SLATE_600).font('Helvetica')
         .text('Documento generado por el Sistema de Gestión de Proyectos SENA (SGP)',
               40, doc.page.height - 35, { align: 'center', width: anchoUtil });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── 3. GENERADORES EXCEL ───────────────────────────────────────────────────

/**
 * Genera libro Excel (.xlsx) estructurado de un proyecto
 */
async function generarExcelProyecto(datos) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGP SENA';
  wb.created = new Date();

  // Función auxiliar de estilos de cabecera
  function estilizarCabecera(fila, colorFondo = '39A900') {
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } };
    fila.alignment = { vertical: 'middle', horizontal: 'center' };
    fila.height = 24;
  }

  // ── HOJA 1: RESUMEN EJECUTIVO ──
  const wsResumen = wb.addWorksheet('Resumen Proyecto');
  wsResumen.views = [{ showGridLines: true }];

  wsResumen.mergeCells('A1:E1');
  const tit1 = wsResumen.getCell('A1');
  tit1.value = 'SENA · SISTEMA DE GESTIÓN DE PROYECTOS (SGP)';
  tit1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  tit1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00324D' } };
  tit1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsResumen.getRow(1).height = 30;

  wsResumen.mergeCells('A2:E2');
  const tit2 = wsResumen.getCell('A2');
  tit2.value = `Reporte de Proyecto: ${datos.proyecto.nombre}`;
  tit2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  tit2.fill = { type: 'pattern', pattern: 'solid', fgColor: '39A900' };
  tit2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsResumen.getRow(2).height = 24;

  wsResumen.addRow([]);
  wsResumen.addRow(['CAMPO', 'VALOR', '', 'INDICADOR', 'VALOR']);
  estilizarCabecera(wsResumen.getRow(4), '475569');

  const filasFicha = [
    ['ID Proyecto', datos.proyecto.id_proyecto, '', 'Porcentaje de Avance', `${datos.proyecto.porcentaje_avance || 0}%`],
    ['Nombre del Proyecto', datos.proyecto.nombre, '', 'Total de Fases', datos.metricas.totalFases],
    ['Estado Actual', datos.proyecto.estado, '', 'Tareas Totales', datos.metricas.totalTareas],
    ['Instructor Líder', datos.proyecto.instructor_nombre, '', 'Tareas Completadas', datos.metricas.tareasCompletadas],
    ['Correo Instructor', datos.proyecto.instructor_correo, '', 'Efectividad Tareas', `${datos.metricas.porcentajeTareasCompletadas}%`],
    ['Fecha de Inicio', formatearFecha(datos.proyecto.fecha_inicio), '', 'Total Entregables', datos.metricas.totalEntregables],
    ['Fecha de Fin', formatearFecha(datos.proyecto.fecha_fin), '', 'Entregables Aprobados', datos.metricas.entregablesAprobados],
    ['Fecha de Emisión', datos.fecha_generacion, '', 'Miembros de Equipo', datos.metricas.totalMiembros],
    ['Descripción', datos.proyecto.descripcion || 'Sin descripción', '', 'Promedio Calificación', datos.metricas.promedioCalificacion],
  ];

  filasFicha.forEach(r => {
    const fila = wsResumen.addRow(r);
    fila.font = { size: 9 };
    fila.getCell(1).font = { bold: true, color: { argb: '00324D' }, size: 9 };
    fila.getCell(4).font = { bold: true, color: { argb: '00324D' }, size: 9 };
  });

  wsResumen.columns = [
    { width: 22 },
    { width: 35 },
    { width: 5 },
    { width: 24 },
    { width: 25 },
  ];

  // ── HOJA 2: FASES ──
  const wsFases = wb.addWorksheet('Fases');
  wsFases.views = [{ showGridLines: true }];
  wsFases.addRow(['ID FASE', 'NOMBRE DE LA FASE', 'DESCRIPCIÓN', 'FECHA INICIO', 'FECHA FIN', 'AVANCE (%)']);
  estilizarCabecera(wsFases.getRow(1));

  datos.fases.forEach(f => {
    wsFases.addRow([
      f.id_fase,
      f.nombre_fase,
      f.descripcion || '',
      formatearFecha(f.fecha_inicio),
      formatearFecha(f.fecha_fin),
      f.porcentaje_avance || 0,
    ]);
  });
  wsFases.columns = [{ width: 10 }, { width: 28 }, { width: 45 }, { width: 15 }, { width: 15 }, { width: 14 }];

  // ── HOJA 3: ENTREGABLES ──
  const wsEntregables = wb.addWorksheet('Entregables');
  wsEntregables.views = [{ showGridLines: true }];
  wsEntregables.addRow(['ID', 'ENTREGABLE', 'FASE', 'FECHA ENTREGA', 'ESTADO', 'VERSIÓN', 'CALIFICACIÓN', 'OBSERVACIÓN EVALUACIÓN']);
  estilizarCabecera(wsEntregables.getRow(1));

  datos.entregables.forEach(e => {
    wsEntregables.addRow([
      e.id_entregable,
      e.nombre,
      e.nombre_fase || '',
      formatearFecha(e.fecha_entrega),
      e.estado || 'Pendiente',
      e.version || '1.0',
      e.calificacion !== null && e.calificacion !== undefined ? Number(e.calificacion) : 'Sin calificar',
      e.comentario_evaluacion || '',
    ]);
  });
  wsEntregables.columns = [
    { width: 8 }, { width: 30 }, { width: 25 }, { width: 15 }, { width: 14 }, { width: 10 }, { width: 15 }, { width: 45 },
  ];

  // ── HOJA 4: TAREAS ──
  const wsTareas = wb.addWorksheet('Tareas');
  wsTareas.views = [{ showGridLines: true }];
  wsTareas.addRow(['ID TAREA', 'TÍTULO', 'DESCRIPCIÓN', 'RESPONSABLE', 'CORREO', 'PRIORIDAD', 'ESTADO', 'VENCIMIENTO']);
  estilizarCabecera(wsTareas.getRow(1));

  datos.tareas.forEach(t => {
    wsTareas.addRow([
      t.id_tarea,
      t.titulo,
      t.descripcion || '',
      t.asignado_nombre || 'Sin asignar',
      t.asignado_correo || '',
      t.prioridad || 'Media',
      t.estado || 'Pendiente',
      formatearFecha(t.fecha_vencimiento),
    ]);
  });
  wsTareas.columns = [
    { width: 10 }, { width: 32 }, { width: 40 }, { width: 24 }, { width: 26 }, { width: 12 }, { width: 14 }, { width: 15 },
  ];

  // ── HOJA 5: EQUIPO ──
  const wsEquipo = wb.addWorksheet('Equipo');
  wsEquipo.views = [{ showGridLines: true }];
  wsEquipo.addRow(['IDENTIFICACIÓN', 'NOMBRE COMPLETO', 'ROL EN PROYECTO', 'ROL SISTEMA', 'CORREO ELECTRÓNICO']);
  estilizarCabecera(wsEquipo.getRow(1));

  datos.equipo.forEach(m => {
    wsEquipo.addRow([
      m.identificacion || '—',
      m.nombre_completo,
      m.rol_en_equipo || 'Aprendiz',
      m.nombre_rol || '—',
      m.correo,
    ]);
  });
  wsEquipo.columns = [{ width: 18 }, { width: 30 }, { width: 20 }, { width: 16 }, { width: 32 }];

  return await wb.xlsx.writeBuffer();
}

/**
 * Genera libro Excel (.xlsx) consolidado de todos los proyectos
 */
async function generarExcelConsolidado(datos) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SGP SENA';
  wb.created = new Date();

  function estilizarCabecera(fila, colorFondo = '39A900') {
    fila.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } };
    fila.alignment = { vertical: 'middle', horizontal: 'center' };
    fila.height = 24;
  }

  // ── HOJA 1: RESUMEN EJECUTIVO ──
  const wsResumen = wb.addWorksheet('Resumen Ejecutivo');
  wsResumen.views = [{ showGridLines: true }];

  wsResumen.mergeCells('A1:D1');
  const tit1 = wsResumen.getCell('A1');
  tit1.value = 'SENA · SISTEMA DE GESTIÓN DE PROYECTOS (SGP)';
  tit1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  tit1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00324D' } };
  tit1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsResumen.getRow(1).height = 28;

  wsResumen.mergeCells('A2:D2');
  const tit2 = wsResumen.getCell('A2');
  tit2.value = 'REPORTE CONSOLIDADO INSTITUCIONAL DE PROYECTOS';
  tit2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  tit2.fill = { type: 'pattern', pattern: 'solid', fgColor: '39A900' };
  tit2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsResumen.getRow(2).height = 22;

  wsResumen.addRow([]);
  wsResumen.addRow(['MÉTRICA GLOBAL', 'VALOR']);
  estilizarCabecera(wsResumen.getRow(4), '475569');

  const filasKpi = [
    ['Total de Proyectos Registrados', datos.resumen.totalProyectos],
    ['Proyectos en Desarrollo / Activos', datos.resumen.activos],
    ['Proyectos en Planificación', datos.resumen.enPlanificacion],
    ['Proyectos Finalizados', datos.resumen.finalizados],
    ['Proyectos Suspendidos o Cancelados', datos.resumen.suspendidos],
    ['Promedio General de Avance', `${datos.resumen.promedioAvance}%`],
    ['Total Tareas en el Sistema', datos.resumen.totalTareasGlobal],
    ['Tareas Completadas con Éxito', datos.resumen.totalTareasCompletadasGlobal],
    ['Fecha de Emisión del Reporte', datos.fecha_generacion],
  ];

  filasKpi.forEach(r => {
    const fila = wsResumen.addRow(r);
    fila.getCell(1).font = { bold: true, color: { argb: '00324D' } };
  });

  wsResumen.columns = [{ width: 35 }, { width: 25 }];

  // ── HOJA 2: CONSOLIDADO DE PROYECTOS ──
  const wsProyectos = wb.addWorksheet('Proyectos');
  wsProyectos.views = [{ showGridLines: true }];
  wsProyectos.addRow([
    'ID', 'PROYECTO', 'INSTRUCTOR LÍDER', 'CORREO INSTRUCTOR', 'ESTADO',
    'AVANCE (%)', 'FECHA INICIO', 'FECHA FIN', 'FASES', 'TAREAS TOTALES',
    'TAREAS OK', 'ENTREGABLES', 'MIEMBROS',
  ]);
  estilizarCabecera(wsProyectos.getRow(1));

  datos.proyectos.forEach(p => {
    wsProyectos.addRow([
      p.id_proyecto,
      p.nombre,
      p.instructor_nombre || '—',
      p.instructor_correo || '',
      p.estado,
      parseFloat(p.porcentaje_avance) || 0,
      formatearFecha(p.fecha_inicio),
      formatearFecha(p.fecha_fin),
      parseInt(p.total_fases) || 0,
      parseInt(p.total_tareas) || 0,
      parseInt(p.tareas_completadas) || 0,
      parseInt(p.total_entregables) || 0,
      parseInt(p.total_equipo) || 0,
    ]);
  });

  wsProyectos.columns = [
    { width: 8 }, { width: 32 }, { width: 25 }, { width: 26 }, { width: 15 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 16 },
    { width: 14 }, { width: 14 }, { width: 12 },
  ];

  return await wb.xlsx.writeBuffer();
}

module.exports = {
  getDatosReporteProyecto,
  getDatosReporteConsolidado,
  generarPdfProyecto,
  generarExcelProyecto,
  generarPdfConsolidado,
  generarExcelConsolidado,
};
