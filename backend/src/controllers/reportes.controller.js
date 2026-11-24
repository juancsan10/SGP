// =====================================================
// controllers/reportes.controller.js
// Controlador para exportación de reportes PDF y Excel (HU-35 / RF6.3)
// =====================================================

const reportesService = require('../services/reportes.service');

// Sanitizador simple de nombres de archivo
function limpiarNombreArchivo(nombre) {
  return String(nombre || 'proyecto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 40);
}

// GET /api/v1/reportes/resumen
const obtenerResumen = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rol = req.user?.rol;
    const datos = await reportesService.getDatosReporteConsolidado(userId, rol);
    return res.json({ success: true, data: datos });
  } catch (err) {
    console.error('Error al obtener resumen de reportes:', err);
    return res.status(500).json({ success: false, message: 'Error interno al generar resumen de reportes' });
  }
};

// GET /api/v1/reportes/proyectos/:id/pdf
const exportarProyectoPdf = async (req, res) => {
  try {
    const idProyecto = req.params.id;
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const datos = await reportesService.getDatosReporteProyecto(idProyecto, userId, rol);
    if (!datos) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado o sin permisos para exportar reporte' });
    }

    const pdfBuffer = await reportesService.generarPdfProyecto(datos);
    const nombreLimpio = limpiarNombreArchivo(datos.proyecto.nombre);
    const filename = `Reporte_${nombreLimpio}_${idProyecto}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Error al generar PDF del proyecto:', err);
    return res.status(500).json({ success: false, message: 'Error al generar el archivo PDF del proyecto' });
  }
};

// GET /api/v1/reportes/proyectos/:id/excel
const exportarProyectoExcel = async (req, res) => {
  try {
    const idProyecto = req.params.id;
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const datos = await reportesService.getDatosReporteProyecto(idProyecto, userId, rol);
    if (!datos) {
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado o sin permisos para exportar reporte' });
    }

    const excelBuffer = await reportesService.generarExcelProyecto(datos);
    const nombreLimpio = limpiarNombreArchivo(datos.proyecto.nombre);
    const filename = `Reporte_${nombreLimpio}_${idProyecto}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    return res.end(excelBuffer);
  } catch (err) {
    console.error('Error al generar Excel del proyecto:', err);
    return res.status(500).json({ success: false, message: 'Error al generar el archivo Excel del proyecto' });
  }
};

// GET /api/v1/reportes/consolidado/pdf
const exportarConsolidadoPdf = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const datos = await reportesService.getDatosReporteConsolidado(userId, rol);
    const pdfBuffer = await reportesService.generarPdfConsolidado(datos);
    const filename = `Reporte_Consolidado_Proyectos_SENA_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('Error al generar PDF consolidado:', err);
    return res.status(500).json({ success: false, message: 'Error al generar el archivo PDF consolidado' });
  }
};

// GET /api/v1/reportes/consolidado/excel
const exportarConsolidadoExcel = async (req, res) => {
  try {
    const userId = req.user?.id;
    const rol = req.user?.rol;

    const datos = await reportesService.getDatosReporteConsolidado(userId, rol);
    const excelBuffer = await reportesService.generarExcelConsolidado(datos);
    const filename = `Reporte_Consolidado_Proyectos_SENA_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    return res.end(excelBuffer);
  } catch (err) {
    console.error('Error al generar Excel consolidado:', err);
    return res.status(500).json({ success: false, message: 'Error al generar el archivo Excel consolidado' });
  }
};

module.exports = {
  obtenerResumen,
  exportarProyectoPdf,
  exportarProyectoExcel,
  exportarConsolidadoPdf,
  exportarConsolidadoExcel,
};
