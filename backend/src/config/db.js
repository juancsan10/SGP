const mysql = require('mysql2/promise');

const opciones = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'America/Bogota',
};

// DATABASE_URL (mysql://usuario:clave@host:puerto/base) la usan los tests de
// integración para apuntar a la BD de pruebas. Sin ella, la app usa las
// variables DB_* de siempre.
const pool = process.env.DATABASE_URL
  ? mysql.createPool({ uri: process.env.DATABASE_URL, ...opciones })
  : mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'SistemaGestionProyectosSENA',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ...opciones,
  });

pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL establecida');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;
