const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// POST /api/v1/auth/register
const register = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, ficha, programa_formacion, id_rol } = req.body;

    if (!nombres || !apellidos || !correo || !contrasena || !id_rol) {
      return res.status(400).json({ success: false, message: 'Todos los campos obligatorios son requeridos' });
    }

    // Correo único (RN-008)
    const [existe] = await db.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, correo, contrasena, ficha, programa_formacion, id_rol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombres, apellidos, correo, hashedPassword, ficha || null, programa_formacion || null, id_rol]
    );

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: { id_usuario: result.insertId }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
};

// POST /api/v1/auth/login
const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos' });
    }

    const [rows] = await db.query(
      `SELECT u.*, r.nombre_rol AS rol FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.correo = ? AND u.estado = 1`,
      [correo]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas o usuario inactivo' });
    }

    const usuario = rows[0];
    const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol, id_rol: usuario.id_rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        usuario: {
          id: usuario.id_usuario,
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
          correo: usuario.correo,
          rol: usuario.rol,
          ficha: usuario.ficha,
          programa_formacion: usuario.programa_formacion
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: err.message });
  }
};

module.exports = { register, login };
