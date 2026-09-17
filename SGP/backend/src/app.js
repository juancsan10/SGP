require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');

const routes = require('./routes/index');
const { UPLOAD_DIR } = require('./middlewares/upload.middleware');

const app = express();

// ─── Middlewares ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || false,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req,res,next)=>{
  if (req.is('application/json') && (!req.body || typeof req.body !== 'object')) return res.status(400).json({success:false,message:'JSON inválido'});
  next();
});

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// NUEVO: sirve los archivos subidos por los usuarios (ver
// middlewares/upload.middleware.js). Los nombres de archivo son
// aleatorios (hash), así que aunque el acceso es de solo lectura sin
// verificar sesión, no son adivinables por fuerza bruta.
app.use('/uploads', express.static(UPLOAD_DIR));

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 API Sistema de Gestión de Proyectos SENA - v1.0',
    docs: '/api/v1',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // NUEVO: errores de multer (subida de archivos) se traducen a 400 con un
  // mensaje claro, en vez de caer en el 500 genérico de abajo.
  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el tamaño máximo permitido (10 MB)'
      : `Error al subir el archivo: ${err.message}`;
    return res.status(400).json({ success: false, message: mensaje });
  }
  if (err && /Solo se permiten archivos/.test(err.message || '')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

module.exports = app;
