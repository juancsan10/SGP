// =====================================================
// routes/reportes.routes.js
// Rutas de exportación de reportes PDF y Excel (HU-35 / RF6.3 / CU-010)
// =====================================================

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportes.controller');
const { verifyToken, requireRole } = require('../middlewares/auth.middleware');

// Todas las rutas de reportes requieren autenticación y rol de Instructor o Administrador
router.use(verifyToken);
router.use(requireRole('Instructor', 'Administrador'));

// Resumen JSON para vista previa en el frontend
router.get('/resumen', ctrl.obtenerResumen);

// Reportes consolidados
router.get('/consolidado/pdf', ctrl.exportarConsolidadoPdf);
router.get('/consolidado/excel', ctrl.exportarConsolidadoExcel);

// Reportes por proyecto individual
router.get('/proyectos/:id/pdf', ctrl.exportarProyectoPdf);
router.get('/proyectos/:id/excel', ctrl.exportarProyectoExcel);

module.exports = router;
