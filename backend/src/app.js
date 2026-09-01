require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes/index');

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
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

module.exports = app;
