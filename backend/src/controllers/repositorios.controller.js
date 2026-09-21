const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');

// POST /api/v1/repositorios
const create = async (req, res) => {
  try {
    const { url_github, rama_principal, id_proyecto } = req.body;

    if (!url_github || !id_proyecto) {
      return res.status(400).json({ success: false, message: 'url_github e id_proyecto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO repositorios (url_github, rama_principal, ultima_actualizacion, id_proyecto) VALUES (?, ?, NOW(), ?)`,
      [url_github, rama_principal || 'main', id_proyecto]
    );

    await registrarCambio('repositorios', result.insertId, 'INSERT', req.user?.id);
    return res.status(201).json({ success: true, message: 'Repositorio vinculado', data: { id_repositorio: result.insertId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/repositorios/:id_proyecto
const getByProyecto = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM repositorios WHERE id_proyecto = ?`,
      [req.params.id_proyecto]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/repositorios/:id
const update = async (req, res) => {
  try {
    const { url_github, rama_principal } = req.body;
    const [result] = await db.query(
      `UPDATE repositorios SET url_github = COALESCE(?, url_github), rama_principal = COALESCE(?, rama_principal), ultima_actualizacion = NOW() WHERE id_repositorio = ?`,
      [url_github, rama_principal, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Repositorio no encontrado' });
    return res.json({ success: true, message: 'Repositorio actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/repositorios/:id/estado  (NUEVO — solo Administrador)
// Habilita o deshabilita un repositorio sin borrarlo.
const toggleEstado = async (req, res) => {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return res.status(400).json({ success: false, message: 'activo debe ser true o false' });
    }
    const [result] = await db.query(`UPDATE repositorios SET activo = ? WHERE id_repositorio = ?`, [activo, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Repositorio no encontrado' });
    await registrarCambio('repositorios', req.params.id, activo ? 'ACTIVAR' : 'DESACTIVAR', req.user?.id);
    return res.json({ success: true, message: activo ? 'Repositorio habilitado' : 'Repositorio deshabilitado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/repositorios/:id/semaforo  (NUEVO — solo Administrador)
// Marca el cumplimiento de reglas de negocio del repositorio con un
// semáforo visual: verde (cumple), amarillo (observación), rojo (incumple).
const ESTADOS_SEMAFORO = ['verde', 'amarillo', 'rojo'];
const setSemaforo = async (req, res) => {
  try {
    const { estado_semaforo, observacion } = req.body;
    if (!ESTADOS_SEMAFORO.includes(estado_semaforo)) {
      return res.status(400).json({ success: false, message: `estado_semaforo debe ser uno de: ${ESTADOS_SEMAFORO.join(', ')}` });
    }
    const [result] = await db.query(`UPDATE repositorios SET estado_semaforo = ? WHERE id_repositorio = ?`, [estado_semaforo, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Repositorio no encontrado' });

    // Si el semáforo pasa a amarillo o rojo, se notifica al instructor
    // responsable del proyecto (incumplimiento de regla de negocio).
    if (estado_semaforo !== 'verde') {
      const [proy] = await db.query(
        `SELECT p.id_instructor, p.nombre FROM repositorios r JOIN proyectos p ON p.id_proyecto = r.id_proyecto WHERE r.id_repositorio = ?`,
        [req.params.id]
      );
      if (proy.length) {
        const nivel = estado_semaforo === 'rojo' ? 'incumplimiento grave' : 'observación';
        await db.query(
          `INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario) VALUES (?, ?, 'advertencia', ?, ?)`,
          [`Repositorio marcado en ${estado_semaforo}`,
           `El repositorio del proyecto "${proy[0].nombre}" fue marcado como ${nivel} por el administrador.${observacion ? ' Observación: ' + observacion : ''}`,
           estado_semaforo === 'rojo' ? 'Alta' : 'Media',
           proy[0].id_instructor]
        );
      }
    }

    await registrarCambio('repositorios', req.params.id, 'SEMAFORO_' + estado_semaforo.toUpperCase(), req.user?.id);
    return res.json({ success: true, message: 'Estado de semáforo actualizado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { create, getByProyecto, update, toggleEstado, setSemaforo };
