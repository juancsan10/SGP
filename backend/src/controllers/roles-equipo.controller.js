// =====================================================
// controllers/roles-equipo.controller.js  (NUEVO — punto 4, #19)
// Catálogo de roles de equipo: predeterminados (código) + personalizados
// del Instructor (tabla roles_equipo). Al editar un rol propio se
// actualizan también los miembros de SUS proyectos que lo tenían.
// =====================================================
const db = require('../config/db');
const { registrarCambio } = require('../services/historial.service');
const { PALETA_ROLES, ROLES_PREDETERMINADOS, esColorValido, esPredeterminado } = require('../utils/roles-equipo');

const limpiarNombre = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

function validar(nombre, color) {
  if (nombre.length < 2 || nombre.length > 60) return 'El nombre del rol debe tener entre 2 y 60 caracteres';
  if (!esColorValido(color)) return 'Elige un color de la paleta';
  if (esPredeterminado(nombre)) return 'Ese rol ya existe entre los predeterminados';
  return null;
}

// GET /api/v1/roles-equipo  (Instructor, Administrador)
const getAll = async (req, res) => {
  try {
    const [propios] = req.user.rol === 'Instructor'
      ? await db.query('SELECT id_rol_equipo, nombre, color FROM roles_equipo WHERE id_instructor = ? ORDER BY nombre', [req.user.id])
      : [[]];
    return res.json({
      success: true,
      data: [
        ...ROLES_PREDETERMINADOS.map(r => ({ ...r, id_rol_equipo: null, propio: false })),
        ...propios.map(r => ({ ...r, propio: true })),
      ],
      meta: { paleta: PALETA_ROLES },
    });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// POST /api/v1/roles-equipo  (Instructor) — { nombre, color }
const create = async (req, res) => {
  try {
    const nombre = limpiarNombre(req.body.nombre);
    const color = String(req.body.color || '').toLowerCase();
    const error = validar(nombre, color);
    if (error) return res.status(400).json({ success: false, message: error });

    const [existe] = await db.query('SELECT id_rol_equipo FROM roles_equipo WHERE id_instructor = ? AND nombre = ?', [req.user.id, nombre]);
    if (existe.length) return res.status(409).json({ success: false, message: 'Ya tienes un rol con ese nombre' });

    const [r] = await db.query('INSERT INTO roles_equipo (id_instructor, nombre, color) VALUES (?, ?, ?)', [req.user.id, nombre, color]);
    await registrarCambio('roles_equipo', r.insertId, 'INSERT', req.user.id);
    return res.status(201).json({ success: true, message: 'Rol creado', data: { id_rol_equipo: r.insertId, nombre, color, propio: true } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// PUT /api/v1/roles-equipo/:id  (Instructor dueño) — { nombre, color }
const update = async (req, res) => {
  try {
    const nombre = limpiarNombre(req.body.nombre);
    const color = String(req.body.color || '').toLowerCase();
    const error = validar(nombre, color);
    if (error) return res.status(400).json({ success: false, message: error });

    const [[rol]] = await db.query('SELECT * FROM roles_equipo WHERE id_rol_equipo = ? AND id_instructor = ?', [req.params.id, req.user.id]);
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    const [choque] = await db.query(
      'SELECT id_rol_equipo FROM roles_equipo WHERE id_instructor = ? AND nombre = ? AND id_rol_equipo <> ?', [req.user.id, nombre, rol.id_rol_equipo]);
    if (choque.length) return res.status(409).json({ success: false, message: 'Ya tienes un rol con ese nombre' });

    await db.query('UPDATE roles_equipo SET nombre = ?, color = ? WHERE id_rol_equipo = ?', [nombre, color, rol.id_rol_equipo]);
    // Los miembros de sus proyectos con ese rol toman el nuevo nombre y color.
    const [act] = await db.query(
      `UPDATE equipos_proyecto e JOIN proyectos p ON p.id_proyecto = e.id_proyecto
       SET e.rol_en_equipo = ?, e.color_rol = ?
       WHERE p.id_instructor = ? AND e.rol_en_equipo = ?`,
      [nombre, color, req.user.id, rol.nombre]);
    await registrarCambio('roles_equipo', rol.id_rol_equipo, 'UPDATE', req.user.id);
    return res.json({ success: true, message: 'Rol actualizado', data: { miembrosActualizados: act.affectedRows || 0 } });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// DELETE /api/v1/roles-equipo/:id  (Instructor dueño) — los miembros conservan su etiqueta.
const remove = async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM roles_equipo WHERE id_rol_equipo = ? AND id_instructor = ?', [req.params.id, req.user.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    await registrarCambio('roles_equipo', Number(req.params.id), 'DELETE', req.user.id);
    return res.json({ success: true, message: 'Rol eliminado del catálogo' });
  } catch (err) {
    console.error(err); return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { getAll, create, update, remove };
