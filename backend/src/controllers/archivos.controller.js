const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const { UPLOAD_DIR } = require('../middlewares/upload.middleware');

// POST /api/v1/archivos
// Registra una referencia de archivo dando la ruta/URL manualmente (ej. un
// link externo de Drive). Para subir un binario real desde el equipo del
// usuario, usar POST /api/v1/archivos/upload/:id en su lugar.
const create = async (req, res) => {
  try {
    const { nombre_archivo, ruta_archivo, id_entregable } = req.body;

    if (!nombre_archivo || !ruta_archivo || !id_entregable) {
      return res.status(400).json({ success: false, message: 'nombre_archivo, ruta_archivo e id_entregable son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO archivos (nombre_archivo, ruta_archivo, id_entregable) VALUES (?, ?, ?)`,
      [nombre_archivo, ruta_archivo, id_entregable]
    );

    await registrarCambio('archivos', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Archivo registrado', data: { id_archivo: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/archivos/upload/:id  (multipart/form-data, campo "archivo")
// NUEVO: sube el binario real al servidor (antes solo se guardaba una ruta
// de texto). El middleware de autorización (requireProjectManager) corre
// ANTES que multer en la ruta, así que un usuario sin permiso nunca llega
// a escribir el archivo en disco.
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo (campo esperado: "archivo")' });
    }
    const idEntregable = req.params.id;
    const rutaPublica = `/uploads/${req.file.filename}`;

    const [result] = await db.query(
      `INSERT INTO archivos (nombre_archivo, ruta_archivo, id_entregable) VALUES (?, ?, ?)`,
      [req.file.originalname, rutaPublica, idEntregable]
    );

    await registrarCambio('archivos', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({
      success: true,
      message: 'Archivo subido correctamente',
      data: { id_archivo: result.insertId, nombre_archivo: req.file.originalname, ruta_archivo: rutaPublica, tamano_bytes: req.file.size },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/archivos/:id_entregable
const getByEntregable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM archivos WHERE id_entregable = ? ORDER BY fecha_subida DESC`,
      [req.params.id_entregable]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/archivos/:id
// Si el archivo fue subido con uploadFile() (ruta_archivo empieza con
// "/uploads/"), también se borra el binario físico del disco, no solo el
// registro en la base de datos.
const remove = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT ruta_archivo FROM archivos WHERE id_archivo = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Archivo no encontrado' });

    const rutaArchivo = rows[0].ruta_archivo;
    await db.query('DELETE FROM archivos WHERE id_archivo = ?', [req.params.id]);

    if (rutaArchivo && rutaArchivo.startsWith('/uploads/')) {
      const rutaFisica = path.join(UPLOAD_DIR, path.basename(rutaArchivo));
      fs.unlink(rutaFisica, (err) => {
        if (err && err.code !== 'ENOENT') console.error('No se pudo borrar el archivo físico:', err.message);
      });
    }

    await registrarCambio('archivos', req.params.id, 'DELETE', req.user?.id);
    return res.json({ success: true, message: 'Archivo eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, uploadFile, getByEntregable, remove };
