// =====================================================
// tests/test-reportes.js
// Pruebas automatizadas de exportación de reportes (HU-35 / RF6.3 / CU-010)
// Verifica la generación correcta de archivos PDF y Excel (.xlsx)
// =====================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  generarPdfProyecto,
  generarExcelProyecto,
  generarPdfConsolidado,
  generarExcelConsolidado,
} = require('../src/services/reportes.service');

// Datos simulados fieles a la base de datos del SENA
const datosSimuladosProyecto = {
  proyecto: {
    id_proyecto: 101,
    nombre: 'Sistema de Gestión de Inventarios y Logística SENA',
    descripcion: 'Plataforma web integral para el control de inventario de materiales, insumos y herramientas del Centro de Formación.',
    estado: 'En Desarrollo',
    porcentaje_avance: 68.5,
    fecha_inicio: '2026-02-01',
    fecha_fin: '2026-07-30',
    instructor_nombre: 'Miguel Ángel Ramírez',
    instructor_correo: 'm.ramirez@sena.edu.co',
  },
  fases: [
    { id_fase: 1, nombre_fase: 'Fase 1: Análisis y Requisitos', descripcion: 'Levantamiento de RF, RNF y casos de uso', fecha_inicio: '2026-02-01', fecha_fin: '2026-03-15', porcentaje_avance: 100 },
    { id_fase: 2, nombre_fase: 'Fase 2: Diseño de Arquitectura y Base de Datos', descripcion: 'Modelo relacional, diagramas C4 y prototipado Figma', fecha_inicio: '2026-03-16', fecha_fin: '2026-04-30', porcentaje_avance: 100 },
    { id_fase: 3, nombre_fase: 'Fase 3: Desarrollo de API y Frontend', descripcion: 'Endpoints RESTful, autenticación JWT e interfaz React', fecha_inicio: '2026-05-01', fecha_fin: '2026-06-30', porcentaje_avance: 65 },
    { id_fase: 4, nombre_fase: 'Fase 4: Pruebas y Despliegue', descripcion: 'QA funcional, seguridad y despliegue Docker', fecha_inicio: '2026-07-01', fecha_fin: '2026-07-30', porcentaje_avance: 0 },
  ],
  entregables: [
    { id_entregable: 1, nombre: 'Documento SRS y Casos de Uso', nombre_fase: 'Fase 1: Análisis y Requisitos', fecha_entrega: '2026-03-10', estado: 'Aprobado', version: '1.0', calificacion: 95, comentario_evaluacion: 'Excelente trabajo en especificación' },
    { id_entregable: 2, nombre: 'Diagrama Entidad-Relación y DDL', nombre_fase: 'Fase 2: Diseño de Arquitectura', fecha_entrega: '2026-04-20', estado: 'Aprobado', version: '1.2', calificacion: 90, comentario_evaluacion: 'Normalización correcta 3FN' },
    { id_entregable: 3, nombre: 'Módulo de Inventario Funcional', nombre_fase: 'Fase 3: Desarrollo de API y Frontend', fecha_entrega: '2026-06-15', estado: 'En Revisión', version: '0.9', calificacion: null, comentario_evaluacion: null },
  ],
  tareas: [
    { id_tarea: 1, titulo: 'Crear esquema de base de datos MySQL', descripcion: 'Tablas de usuarios, productos y movimientos', prioridad: 'Alta', estado: 'Completada', fecha_vencimiento: '2026-03-25', asignado_nombre: 'Juan Manuel Arcila', asignado_correo: 'juan.arcila@soy.sena.edu.co' },
    { id_tarea: 2, titulo: 'Desarrollar autenticación JWT en backend', descripcion: 'Rutas login, registro y middleware de rol', prioridad: 'Alta', estado: 'Completada', fecha_vencimiento: '2026-05-10', asignado_nombre: 'Rubiel Rodriguez', asignado_correo: 'rubiel.tads@gmail.com' },
    { id_tarea: 3, titulo: 'Crear interfaz de control de existencias', descripcion: 'Componente React con tabla y filtros', prioridad: 'Media', estado: 'En Progreso', fecha_vencimiento: '2026-06-10', asignado_nombre: 'Juan Carlos Sanchez', asignado_correo: 'jcsanchez@sena.edu.co' },
    { id_tarea: 4, titulo: 'Configurar contenedor Docker y variables de entorno', descripcion: 'Dockerfile y docker-compose para despliegue', prioridad: 'Baja', estado: 'Pendiente', fecha_vencimiento: '2026-07-15', asignado_nombre: 'Rubiel Rodriguez', asignado_correo: 'rubiel.tads@gmail.com' },
  ],
  equipo: [
    { identificacion: '1098234567', nombre_completo: 'Rubiel Rodriguez', rol_en_equipo: 'Líder de Desarrollo', nombre_rol: 'Aprendiz', correo: 'rubiel.tads@gmail.com' },
    { identificacion: '1088765432', nombre_completo: 'Juan Manuel Arcila', rol_en_equipo: 'Desarrollador Frontend', nombre_rol: 'Aprendiz', correo: 'juan.arcila@soy.sena.edu.co' },
    { identificacion: '1077654321', nombre_completo: 'Juan Carlos Sanchez', rol_en_equipo: 'Desarrollador Backend / QA', nombre_rol: 'Aprendiz', correo: 'jcsanchez@sena.edu.co' },
  ],
  reuniones: [
    { id_reunion: 1, titulo: 'Revisión Sprint 2', descripcion: 'Validación de entregables y cronograma', fecha_reunion: '2026-04-15 10:00:00', lugar: 'Ambiente 302 / Teams' },
  ],
  metricas: {
    totalTareas: 4,
    tareasCompletadas: 2,
    tareasEnProgreso: 1,
    tareasPendientes: 1,
    porcentajeTareasCompletadas: 50,
    totalEntregables: 3,
    entregablesAprobados: 2,
    promedioCalificacion: '92.5',
    totalMiembros: 3,
    totalFases: 4,
  },
  fecha_generacion: '2026-10-24 16:30:00',
};

const datosSimuladosConsolidado = {
  proyectos: [
    {
      id_proyecto: 101,
      nombre: 'Sistema de Gestión de Inventarios y Logística SENA',
      instructor_nombre: 'Miguel Ángel Ramírez',
      instructor_correo: 'm.ramirez@sena.edu.co',
      estado: 'En Desarrollo',
      porcentaje_avance: 68.5,
      fecha_inicio: '2026-02-01',
      fecha_fin: '2026-07-30',
      total_fases: 4,
      total_tareas: 12,
      tareas_completadas: 8,
      total_entregables: 5,
      total_equipo: 4,
    },
    {
      id_proyecto: 102,
      nombre: 'Portal de Seguimiento a Etapa Productiva',
      instructor_nombre: 'Sara López',
      instructor_correo: 'sara.lopez@sena.edu.co',
      estado: 'Activo',
      porcentaje_avance: 85.0,
      fecha_inicio: '2026-01-15',
      fecha_fin: '2026-06-30',
      total_fases: 3,
      total_tareas: 15,
      tareas_completadas: 13,
      total_entregables: 4,
      total_equipo: 3,
    },
    {
      id_proyecto: 103,
      nombre: 'App Móvil de Asistencia de Aprendices',
      instructor_nombre: 'Carlos Vera',
      instructor_correo: 'carlos.vera@sena.edu.co',
      estado: 'En Planificación',
      porcentaje_avance: 15.0,
      fecha_inicio: '2026-08-01',
      fecha_fin: '2026-12-15',
      total_fases: 2,
      total_tareas: 6,
      tareas_completadas: 1,
      total_entregables: 2,
      total_equipo: 3,
    },
  ],
  resumen: {
    totalProyectos: 3,
    activos: 2,
    enPlanificacion: 1,
    finalizados: 0,
    suspendidos: 0,
    promedioAvance: '56.2',
    totalTareasGlobal: 33,
    totalTareasCompletadasGlobal: 22,
  },
  fecha_generacion: '2026-10-24 16:30:00',
};

async function ejecutarPruebas() {
  console.log('🧪 ========================================================');
  console.log('🧪 Iniciando Pruebas de Exportación de Reportes (HU-35)');
  console.log('🧪 ========================================================\n');

  const outDir = path.join(__dirname, '..', 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ── PRUEBA 1: PDF de Proyecto Individual ──
  console.log('▶ [1/4] Probando generación de PDF de Proyecto individual...');
  const pdfBufferProyecto = await generarPdfProyecto(datosSimuladosProyecto);
  assert(Buffer.isBuffer(pdfBufferProyecto), 'El resultado debe ser un Buffer');
  assert(pdfBufferProyecto.length > 2000, `El tamaño del PDF debe ser significativo (obtenido: ${pdfBufferProyecto.length} bytes)`);

  // Validar cabecera mágica de PDF (%PDF-)
  const magicPdf = pdfBufferProyecto.slice(0, 5).toString('ascii');
  assert.strictEqual(magicPdf, '%PDF-', `La cabecera mágica debe ser %PDF- (obtenido: ${magicPdf})`);

  const rutaPdfProyecto = path.join(outDir, 'reporte_proyecto_prueba.pdf');
  fs.writeFileSync(rutaPdfProyecto, pdfBufferProyecto);
  console.log(`  ✅ PDF de Proyecto generado con éxito (${pdfBufferProyecto.length} bytes)`);
  console.log(`     Guardado en: ${rutaPdfProyecto}\n`);

  // ── PRUEBA 2: Excel (.xlsx) de Proyecto Individual ──
  console.log('▶ [2/4] Probando generación de Excel (.xlsx) de Proyecto individual...');
  const excelBufferProyecto = await generarExcelProyecto(datosSimuladosProyecto);
  assert(Buffer.isBuffer(excelBufferProyecto), 'El resultado debe ser un Buffer');
  assert(excelBufferProyecto.length > 3000, `El tamaño del Excel debe ser significativo (obtenido: ${excelBufferProyecto.length} bytes)`);

  // Validar cabecera mágica de archivo ZIP/XLSX (PK\x03\x04)
  const magicExcel = excelBufferProyecto.slice(0, 4).toString('hex');
  assert.strictEqual(magicExcel, '504b0304', `La cabecera mágica debe ser PK (504b0304) para XLSX válido (obtenido: ${magicExcel})`);

  const rutaExcelProyecto = path.join(outDir, 'reporte_proyecto_prueba.xlsx');
  fs.writeFileSync(rutaExcelProyecto, excelBufferProyecto);
  console.log(`  ✅ Excel de Proyecto generado con éxito (${excelBufferProyecto.length} bytes)`);
  console.log(`     Guardado en: ${rutaExcelProyecto}\n`);

  // ── PRUEBA 3: PDF Consolidado de Proyectos ──
  console.log('▶ [3/4] Probando generación de PDF Consolidado de Proyectos...');
  const pdfBufferConsolidado = await generarPdfConsolidado(datosSimuladosConsolidado);
  assert(Buffer.isBuffer(pdfBufferConsolidado), 'El resultado debe ser un Buffer');
  assert(pdfBufferConsolidado.length > 2000, `El tamaño del PDF debe ser significativo (obtenido: ${pdfBufferConsolidado.length} bytes)`);
  assert.strictEqual(pdfBufferConsolidado.slice(0, 5).toString('ascii'), '%PDF-');

  const rutaPdfConsolidado = path.join(outDir, 'reporte_consolidado_prueba.pdf');
  fs.writeFileSync(rutaPdfConsolidado, pdfBufferConsolidado);
  console.log(`  ✅ PDF Consolidado generado con éxito (${pdfBufferConsolidado.length} bytes)`);
  console.log(`     Guardado en: ${rutaPdfConsolidado}\n`);

  // ── PRUEBA 4: Excel (.xlsx) Consolidado de Proyectos ──
  console.log('▶ [4/4] Probando generación de Excel (.xlsx) Consolidado de Proyectos...');
  const excelBufferConsolidado = await generarExcelConsolidado(datosSimuladosConsolidado);
  assert(Buffer.isBuffer(excelBufferConsolidado), 'El resultado debe ser un Buffer');
  assert(excelBufferConsolidado.length > 3000, `El tamaño del Excel debe ser significativo (obtenido: ${excelBufferConsolidado.length} bytes)`);
  assert.strictEqual(excelBufferConsolidado.slice(0, 4).toString('hex'), '504b0304');

  const rutaExcelConsolidado = path.join(outDir, 'reporte_consolidado_prueba.xlsx');
  fs.writeFileSync(rutaExcelConsolidado, excelBufferConsolidado);
  console.log(`  ✅ Excel Consolidado generado con éxito (${excelBufferConsolidado.length} bytes)`);
  console.log(`     Guardado en: ${rutaExcelConsolidado}\n`);

  console.log('🎉 ========================================================');
  console.log('🎉 ¡TODAS LAS PRUEBAS DE HU-35 PASARON CON ÉXITO AL 100%!');
  console.log('🎉 Formatos PDF y Excel generados, validados y guardados.');
  console.log('🎉 ========================================================\n');
}

ejecutarPruebas().catch(err => {
  console.error('❌ Error en las pruebas de reporte:', err);
  process.exit(1);
});
