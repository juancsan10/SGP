const db = require('../config/db');

const registrarCambio = async (tabla, id_registro, accion, id_usuario) => {
  try {
    await db.query(
      `INSERT INTO historial_cambios (tabla_afectada, id_registro, accion, id_usuario) VALUES (?, ?, ?, ?)`,
      [tabla, id_registro, accion, id_usuario || null]
    );
  } catch (err) {
    console.error('Error registrando historial:', err.message);
  }
};

module.exports = { registrarCambio };
